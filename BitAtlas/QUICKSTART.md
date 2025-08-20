# BitAtlas Quick Start Guide

Get BitAtlas up and running in 5 minutes!

## Prerequisites

- Docker and Docker Compose
- Git
- 10GB+ free disk space

## 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd BitAtlas

# Generate secure secrets
node scripts/generate-secrets.js

# Setup environment
cp .env.example .env
```

## 2. Configure Environment

Edit `.env` with your settings:

```bash
# Required - Update these values
FRONTEND_URL=http://localhost:3001
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret

# Generated secrets (from secrets.production.env)
JWT_SECRET=your-generated-jwt-secret
SESSION_SECRET=your-generated-session-secret
ENCRYPTION_KEY=your-generated-encryption-key
POSTGRES_PASSWORD=your-generated-postgres-password
REDIS_PASSWORD=your-generated-redis-password
```

## 3. Deploy

Choose your deployment method:

### Option A: Development (Recommended for testing)

```bash
# Start development environment
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Access at: http://localhost:3001

### Option B: Production

```bash
# Run production setup
./scripts/setup-production.sh

# Deploy
./scripts/deploy.sh deploy

# Check health
curl http://localhost/health
```

Access at: http://localhost (port 80/443)

## 4. Verify Installation

### Health Check

```bash
# Check all services
curl http://localhost/health | jq

# Expected response:
{
  "status": "healthy",
  "version": "1.0.0", 
  "uptime": 12345,
  "checks": {
    "database": true,
    "redis": true,
    "disk": true,
    "memory": true
  }
}
```

### Test API

```bash
# Test file upload
curl -X POST http://localhost/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test OAuth flow
curl http://localhost/oauth/authorize?client_id=your-client-id&response_type=code
```

## 5. First Steps

### Create Admin User

```bash
# Connect to backend container
docker-compose exec backend bash

# Create admin user (if implemented)
npm run create-admin --email=admin@yourdomain.com
```

### Configure OAuth

1. **Set up OAuth provider** (Google, GitHub, etc.)
2. **Update environment variables**:
   ```bash
   OAUTH_CLIENT_ID=your-actual-client-id
   OAUTH_CLIENT_SECRET=your-actual-client-secret
   ```
3. **Restart services**:
   ```bash
   docker-compose restart backend
   ```

### Upload Test File

```bash
# Using curl
curl -X POST http://localhost/api/v1/files/upload \
  -H "Authorization: Bearer your-jwt-token" \
  -F "file=@/path/to/test-file.pdf"
```

## 6. Management Commands

### Service Management

```bash
# Start services
./scripts/deploy.sh start

# Stop services  
./scripts/deploy.sh stop

# View status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs backend
```

### Backup & Restore

```bash
# Create backup
./scripts/deploy.sh backup

# List backups
ls -la /opt/bitatlas/backups/

# Restore from backup
./scripts/deploy.sh restore backup-20240120-143022
```

### Updates

```bash
# Update to latest version
./scripts/deploy.sh update

# Manual update
git pull origin main
./scripts/deploy.sh deploy
```

## 7. Common Issues

### Port Conflicts

```bash
# Check what's using port 80/443
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
```

### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U bitatlas

# Reset database
docker-compose down
docker volume rm bitatlas_postgres_data
docker-compose up -d postgres
```

### Memory Issues

```bash
# Check system resources
docker stats

# Adjust memory limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G  # Increase from 1G
```

### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/bitatlas/data
chmod -R 755 /opt/bitatlas/data
chmod 700 /opt/bitatlas/data/secrets
```

## 8. Next Steps

### Security Hardening

1. **Enable SSL/TLS**:
   ```bash
   # Get SSL certificate
   sudo certbot certonly --standalone -d yourdomain.com
   
   # Update .env
   SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   ```

2. **Configure Firewall**:
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP  
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

3. **Set up Monitoring**:
   ```bash
   # Add to .env
   OTEL_EXPORTER_OTLP_ENDPOINT=https://your-monitoring-endpoint
   SENTRY_DSN=https://your-sentry-dsn
   ```

### Scaling

1. **Horizontal scaling**:
   ```bash
   # Scale backend replicas
   docker-compose up -d --scale backend=3
   ```

2. **Load balancer**: Set up nginx or cloud load balancer

3. **Database**: Consider read replicas for high traffic

### Customization

1. **Branding**: Update frontend assets and colors
2. **Storage**: Configure S3/GCS for file storage
3. **Authentication**: Add additional OAuth providers
4. **APIs**: Extend MCP endpoints for AI integrations

## 9. Getting Help

### Logs

```bash
# Application logs
./scripts/deploy.sh logs backend

# System logs  
tail -f /var/log/bitatlas/combined.log

# Database logs
./scripts/deploy.sh logs postgres
```

### Health Checks

```bash
# Detailed health check
curl http://localhost/health | jq

# Service status
./scripts/deploy.sh status

# Resource usage
docker stats
```

### Documentation

- **API Documentation**: Check `/api/docs` endpoint
- **Database Schema**: See `database/README.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Architecture**: See `docs/ARCHITECTURE.md`

### Support

- **GitHub Issues**: Report bugs and feature requests
- **Security Issues**: Email security@yourdomain.com
- **Community**: Join our Discord/Slack

## 10. Success Checklist

- [ ] All services running (`docker-compose ps`)
- [ ] Health check passing (`curl /health`)
- [ ] Can access frontend (http://localhost:3001)
- [ ] OAuth flow working
- [ ] File upload working
- [ ] Database accessible
- [ ] Logs are clean
- [ ] Backups configured
- [ ] SSL enabled (production)
- [ ] Firewall configured (production)
- [ ] Monitoring setup (production)

**Congratulations! BitAtlas is now running! 🎉**

---

*Need help? Check the troubleshooting section above or refer to the full documentation.*