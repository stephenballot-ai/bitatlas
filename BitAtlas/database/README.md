# BitAtlas Database Documentation

This directory contains database migrations, schemas, and setup scripts for BitAtlas.

## Database Architecture

BitAtlas uses **PostgreSQL 15+** as the primary database with the following key features:

- **Full-text search** for file content and metadata
- **JSONB support** for flexible metadata storage  
- **UUID primary keys** for security and scalability
- **Row-level security** for multi-tenant data isolation
- **Audit logging** for GDPR compliance

## Quick Start

### 1. Development Setup

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Run migrations
npm run migrate:up

# Seed development data (optional)
npm run seed:dev
```

### 2. Production Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE bitatlas;
CREATE USER bitatlas WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE bitatlas TO bitatlas;

# Run migrations
DATABASE_URL=postgresql://bitatlas:password@localhost:5432/bitatlas npm run migrate:up
```

## Database Schema

### Core Tables

#### `users`
User accounts and authentication data.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    profile JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

#### `files`
File metadata and storage information.

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    storage_provider VARCHAR(20) NOT NULL DEFAULT 'local',
    storage_key VARCHAR(500) NOT NULL,
    storage_path VARCHAR(1000),
    content_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    search_vector TSVECTOR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_files_user_id (user_id),
    INDEX idx_files_search_vector USING GIN(search_vector),
    INDEX idx_files_created_at (created_at DESC),
    INDEX idx_files_storage_provider (storage_provider),
    INDEX idx_files_content_hash (content_hash)
);
```

#### `sessions`
User session management.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_expires_at (expires_at)
);
```

#### `oauth_tokens`
OAuth 2.0 token storage.

```sql
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL,
    access_token VARCHAR(1000) NOT NULL,
    refresh_token VARCHAR(1000),
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_oauth_tokens_user_id (user_id),
    INDEX idx_oauth_tokens_client_id (client_id),
    INDEX idx_oauth_tokens_access_token (access_token)
);
```

#### `audit_logs`
Audit trail for GDPR compliance.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_created_at (created_at DESC),
    INDEX idx_audit_logs_resource (resource, resource_id)
);
```

## Migrations

### Migration Commands

```bash
# Check migration status
npm run migrate:status

# Run pending migrations  
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create add_user_preferences
```

### Migration Files

Migrations are located in `database/migrations/` and follow the pattern:
```
YYYYMMDDHHMMSS_description.sql
```

Example migration structure:
```sql
-- Up migration
-- +goose Up
CREATE TABLE example (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down migration  
-- +goose Down
DROP TABLE example;
```

## Full-Text Search

BitAtlas implements full-text search using PostgreSQL's built-in capabilities:

### Search Configuration

```sql
-- Update search vector when file content changes
CREATE OR REPLACE FUNCTION update_file_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.original_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.metadata->>'title', '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.metadata->>'content', '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_files_search_vector
    BEFORE INSERT OR UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_file_search_vector();
```

### Search Queries

```sql
-- Search files by name and content
SELECT id, name, ts_rank(search_vector, query) AS rank
FROM files, plainto_tsquery('english', 'search term') AS query
WHERE search_vector @@ query
ORDER BY rank DESC, created_at DESC;

-- Search with highlighting
SELECT id, name, 
       ts_headline('english', name, query) AS highlighted_name
FROM files, plainto_tsquery('english', 'search term') AS query
WHERE search_vector @@ query;
```

## Performance Optimization

### Indexing Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_files_user_created ON files(user_id, created_at DESC);
CREATE INDEX idx_files_user_mime ON files(user_id, mime_type);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = true;

-- Partial indexes for active records
CREATE INDEX idx_active_sessions ON sessions(user_id, last_used) WHERE is_active = true;
CREATE INDEX idx_active_tokens ON oauth_tokens(user_id, expires_at) WHERE expires_at > CURRENT_TIMESTAMP;
```

### Query Optimization

```sql
-- Efficient user file listing with pagination
PREPARE user_files_paged AS
SELECT id, name, size, created_at
FROM files 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;

-- File search with ranking
PREPARE search_files AS
SELECT id, name, ts_rank(search_vector, query) as rank
FROM files, plainto_tsquery('english', $1) query
WHERE user_id = $2 AND search_vector @@ query
ORDER BY rank DESC, created_at DESC
LIMIT $3;
```

## Backup and Recovery

### Database Backup

```bash
# Full backup
pg_dump -h localhost -U bitatlas -d bitatlas | gzip > backup-$(date +%Y%m%d).sql.gz

# Schema only backup
pg_dump -h localhost -U bitatlas -d bitatlas --schema-only > schema-backup.sql

# Data only backup
pg_dump -h localhost -U bitatlas -d bitatlas --data-only > data-backup.sql
```

### Point-in-Time Recovery

```sql
-- Enable WAL archiving (in postgresql.conf)
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
wal_level = replica

-- Create base backup
SELECT pg_start_backup('base_backup_$(date +%Y%m%d)');
```

### Recovery

```bash
# Restore full backup
gunzip -c backup-20240120.sql.gz | psql -h localhost -U bitatlas -d bitatlas

# Restore with specific timestamp
pg_restore --clean --if-exists -h localhost -U bitatlas -d bitatlas backup.dump
```

## Security

### Row-Level Security (RLS)

```sql
-- Enable RLS on files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own files
CREATE POLICY user_files_policy ON files
    FOR ALL TO application_role
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Set current user context in application
SELECT set_config('app.current_user_id', 'user-uuid-here', true);
```

### Connection Security

```sql
-- Create application-specific role
CREATE ROLE application_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role;

-- Create connection user
CREATE USER app_user WITH PASSWORD 'secure-password';
GRANT application_role TO app_user;
```

## Monitoring

### Performance Queries

```sql
-- Slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

### Health Checks

```sql
-- Database connectivity
SELECT 1;

-- Table row counts
SELECT 'users' as table_name, count(*) from users
UNION ALL
SELECT 'files', count(*) from files
UNION ALL  
SELECT 'sessions', count(*) from sessions;

-- Recent activity
SELECT date_trunc('hour', created_at) as hour, count(*)
FROM audit_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

## Development

### Local Development

```bash
# Start development database
docker-compose up -d postgres

# Connect to database
psql postgresql://bitatlas:password@localhost:5432/bitatlas

# Reset development database
npm run db:reset

# Generate sample data
npm run db:seed
```

### Testing

```bash
# Run database tests
npm run test:db

# Test migrations
npm run test:migrations

# Performance testing
npm run test:performance
```

## Troubleshooting

### Common Issues

1. **Connection refused**
   ```bash
   # Check PostgreSQL is running
   docker-compose ps postgres
   
   # Check connection settings
   psql postgresql://bitatlas:password@localhost:5432/bitatlas -c "SELECT 1;"
   ```

2. **Migration failures**
   ```bash
   # Check migration status
   npm run migrate:status
   
   # Manual rollback
   npm run migrate:down
   ```

3. **Performance issues**
   ```sql
   -- Check for missing indexes
   SELECT * FROM pg_stat_user_tables WHERE n_tup_ins > 0 AND idx_scan = 0;
   
   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM files WHERE user_id = 'uuid';
   ```

### Support

- **PostgreSQL Documentation**: https://postgresql.org/docs/
- **Migration Tool**: https://github.com/pressly/goose
- **Performance Tuning**: https://pgtune.leopard.in.ua/