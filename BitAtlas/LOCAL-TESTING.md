# 🧪 BitAtlas Local Testing Guide

## ✅ Your Local Environment is Ready!

All services are running successfully:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Status**: http://localhost:3000/api/status
- **Database**: PostgreSQL on localhost:5432
- **Cache**: Redis on localhost:6379

## 🎯 Quick Tests

### 1. Frontend Access
```bash
# Open in browser
open http://localhost:5173
# or
curl http://localhost:5173
```

### 2. API Health Check
```bash
curl http://localhost:3000/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-20T13:55:44.280Z",
  "uptime": 13.720149548,
  "environment": "development"
}
```

### 3. API Status
```bash
curl http://localhost:3000/api/status | jq
```

### 4. OAuth Flow Test
```bash
# Test OAuth authorization page
curl "http://localhost:3000/oauth/authorize?client_id=bitatlas-local-test&response_type=code&scope=read%20search&redirect_uri=http://localhost:8080&state=test"
```

### 5. Database Connection
```bash
# Test database connectivity
docker-compose exec postgres psql -U bitatlas -d bitatlas -c "SELECT 1;"
```

### 6. Redis Connection
```bash
# Test Redis connectivity
docker-compose exec redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d= -f2) ping
```

## 🔧 Management Commands

### Service Control
```bash
# View status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop everything
docker-compose down
```

### Development Workflow
```bash
# Make changes to code, then:
docker-compose restart backend  # For backend changes
# Frontend has hot-reload enabled automatically
```

## 🧭 Key Endpoints to Test

### API Endpoints
- `GET /health` - Health check
- `GET /api/status` - API status and available endpoints
- `GET /oauth/authorize` - OAuth authorization flow
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/files` - List user files (requires auth)
- `POST /api/v1/files/upload` - Upload file (requires auth)

### MCP Endpoints (AI Assistant Integration)
- `POST /mcp/v1/tools/list` - List available tools
- `POST /mcp/v1/tools/call` - Call MCP tools
- `GET /mcp/v1/resources/list` - List resources

### GDPR Endpoints
- `GET /api/gdpr/export` - Export user data (requires auth)
- `GET /api/gdpr/info` - GDPR compliance information

## 🧪 Testing Scenarios

### 1. User Registration & Login
```bash
# Register a test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. File Upload Test
```bash
# Create a test file
echo "Test content" > test-file.txt

# Upload (replace TOKEN with JWT from login)
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test-file.txt"
```

### 3. OAuth Flow Test
```bash
# Step 1: Get authorization code
open "http://localhost:3000/oauth/authorize?client_id=bitatlas-local-test&response_type=code&scope=read%20search&redirect_uri=http://localhost:8080&state=test"

# Step 2: Exchange code for token (after getting code from redirect)
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=YOUR_CODE&client_id=bitatlas-local-test&client_secret=$(grep OAUTH_CLIENT_SECRET .env | cut -d= -f2)"
```

## 🔍 Debugging

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :3000 -i :5173 -i :5432 -i :6379
   ```

2. **Database connection issues**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test connection manually
   docker-compose exec postgres pg_isready -U bitatlas
   ```

3. **Redis connection issues**
   ```bash
   # Check Redis logs
   docker-compose logs redis
   
   # Test Redis manually
   docker-compose exec redis redis-cli -a $(grep REDIS_PASSWORD .env | cut -d= -f2) ping
   ```

### View Detailed Logs
```bash
# All services
docker-compose logs -f

# Specific service with timestamps
docker-compose logs -f -t backend

# Last 50 lines
docker-compose logs --tail=50 backend
```

### Environment Check
```bash
# Verify environment variables are loaded
docker-compose exec backend printenv | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"
```

## 🎨 Frontend Development

The frontend is running with hot-reload, so changes you make to files in `/frontend/src/` will automatically refresh in the browser.

### Key Frontend URLs
- **Main App**: http://localhost:5173
- **Login Page**: http://localhost:5173/login  
- **Register Page**: http://localhost:5173/register
- **Dashboard**: http://localhost:5173/dashboard (requires login)
- **Files**: http://localhost:5173/files (requires login)

## 📊 Monitoring

### Real-time Health Monitoring
```bash
# Continuous health check
watch -n 5 'curl -s http://localhost:3000/health | jq'

# Monitor resource usage
docker stats
```

### Performance Testing
```bash
# Simple load test (install apache2-utils if needed)
ab -n 100 -c 10 http://localhost:3000/health
```

## 🎉 Success!

Your BitAtlas local development environment is fully operational! You can now:

✅ Access the web interface at http://localhost:5173  
✅ Test API endpoints at http://localhost:3000  
✅ Develop and test new features  
✅ Test OAuth integrations  
✅ Upload and manage files  
✅ Test MCP (AI assistant) integrations  

Happy coding! 🚀