# BitAtlas Production Deployment Guide

This guide covers how to deploy and run BitAtlas in production environments.

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- SSL certificates (recommended for production)

## Quick Start (Docker Compose)

### 1. Generate Secure Secrets

```bash
# Generate production secrets
npm run generate-secrets

# This creates:
# - .env.example (template)
# - secrets.production.env (actual secrets - KEEP SECURE!)
```

### 2. Create Production Environment File

```bash
# Copy the example and customize
cp .env.example .env

# Edit .env with your production values:
# - Domain names
# - Database credentials  
# - SSL certificate paths
# - Storage configuration
```

### 3. Set Environment Variables

```bash
# Source the production secrets
export $(cat secrets.production.env | grep -v '^#' | xargs)

# Or use a secrets management system like:
# - AWS Secrets Manager
# - HashiCorp Vault  
# - Kubernetes Secrets
```

### 4. Deploy with Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Production Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/bitatlas
REDIS_URL=redis://:password@host:6379

# Security (use generated values from secrets.production.env)
JWT_SECRET=your-64-char-hex-secret
SESSION_SECRET=your-32-char-hex-secret
ENCRYPTION_KEY=your-32-char-hex-secret
MASTER_KEY=your-encryption-master-key

# Application
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
PORT=3000

# OAuth
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
```

### Optional Variables

```bash
# SSL/TLS
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Storage
STORAGE_PROVIDER=local|s3|gcs
STORAGE_PATH=/app/uploads
MAX_FILE_SIZE=52428800

# Monitoring
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-endpoint
SENTRY_DSN=https://your-sentry-dsn

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

Complete containerized deployment with all services.

```bash
# Use the production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes

Deploy to Kubernetes cluster with provided manifests.

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

### Option 3: Manual Deployment

Deploy components individually on VMs or bare metal.

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
```

## Database Setup

### 1. PostgreSQL Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE bitatlas;
CREATE USER bitatlas WITH ENCRYPTED PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE bitatlas TO bitatlas;
\q

# Run migrations
npm run migrate:up
```

### 2. Database Migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback if needed
npm run migrate:down
```

## Health Checks

### Application Health

```bash
# Basic health check
curl https://your-domain.com/health

# Detailed health check
curl https://your-domain.com/health | jq
```

### Service Health

```bash
# Check all services
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs postgres
```

## Monitoring

### Logs

```bash
# Application logs
tail -f /var/log/bitatlas/combined.log

# Error logs only
tail -f /var/log/bitatlas/error.log

# Docker logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Metrics

BitAtlas exports metrics in the following formats:

- **Health endpoint**: `/health` - Service health status
- **Metrics endpoint**: `/metrics` - Application metrics
- **OpenTelemetry**: Configure `OTEL_EXPORTER_OTLP_ENDPOINT`

## Security Considerations

### 1. Secrets Management

- ❌ **Never commit** `secrets.production.env` to version control
- ✅ Use environment variables or dedicated secrets management
- ✅ Rotate secrets regularly using `npm run rotate-secrets`

### 2. Network Security

```bash
# Firewall rules (example for Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable
```

### 3. SSL/TLS

```bash
# Generate SSL certificate with Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U bitatlas bitatlas > backup-$(date +%Y%m%d).sql

# Restore backup  
psql -h localhost -U bitatlas bitatlas < backup-20240120.sql
```

### File Storage Backup

```bash
# Backup uploaded files
tar -czf files-backup-$(date +%Y%m%d).tar.gz /app/uploads/
```

## Scaling

### Horizontal Scaling

```bash
# Scale backend replicas
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Load Balancer Configuration

```nginx
# nginx.conf example
upstream bitatlas_backend {
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://bitatlas_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

1. **Environment validation fails**
   ```bash
   # Check your environment variables
   npm run check-env
   ```

2. **Database connection fails**
   ```bash
   # Test database connectivity
   npm run test-db
   ```

3. **High memory usage**
   ```bash
   # Monitor memory usage
   docker stats
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
docker-compose -f docker-compose.prod.yml restart backend
```

## Support

- **Documentation**: See `docs/` directory
- **Health Checks**: `GET /health`
- **API Documentation**: `GET /api/docs` (if enabled)
- **Logs**: Check `/var/log/bitatlas/` or Docker logs

## Security Contacts

For security issues, please follow responsible disclosure:

1. **Do not** create public GitHub issues
2. Email: security@your-domain.com
3. Include: Steps to reproduce, impact assessment
4. Expected response: Within 48 hours