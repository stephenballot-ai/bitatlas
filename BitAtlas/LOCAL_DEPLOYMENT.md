# BitAtlas Local Deployment Guide

This guide will help you run the BitAtlas cloud storage platform locally on your machine.

## Prerequisites

Make sure you have the following installed:
- **Docker** (with Docker Compose)
- **Node.js** 18+ 
- **Git**

## Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd /Users/stephen.ballot/Library/Mobile\ Documents/com~apple~CloudDocs/bitatlascode/bitatlas/BitAtlas
   ```

2. **Install dependencies:**
   ```bash
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies  
   cd frontend && npm install && cd ..
   ```

3. **Start the full stack with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.local.yml up -d
   ```

4. **Access the application:**
   - **Frontend:** http://localhost:3001
   - **Backend API:** http://localhost:3000
   - **MongoDB:** localhost:27017
   - **Redis:** localhost:6379

## What You'll See

### 🌐 Frontend (http://localhost:3001)
- **Homepage** with BitAtlas branding using GOV.UK design system
- **User Registration/Login** with secure authentication
- **File Dashboard** for uploading, organizing, and managing files
- **Security Panel** with MFA settings and audit logs
- **Privacy Center** with GDPR data export/deletion

### 🔧 Backend API (http://localhost:3000)
- **REST API** for file operations and user management
- **MCP Endpoints** (`/mcp/v1/*`) for AI assistant integration
- **OAuth 2.0** authorization endpoints (`/oauth/*`)
- **Health Checks** at `/health` and `/ready`

## Key Features You Can Test

### 🔐 User Authentication
1. Register a new account at http://localhost:3001/register
2. Login with your credentials
3. Access the protected dashboard

### 📁 File Management
1. Upload files via drag-and-drop interface
2. Create folders and organize files
3. Search through your files with full-text search
4. Download and share files

### 🤖 MCP Integration (AI Assistant Access)
1. Visit: http://localhost:3000/oauth/authorize?client_id=test-ai-assistant&response_type=code&scope=read%20search%20files:read&redirect_uri=http://localhost:8080/oauth/callback&code_challenge=example&code_challenge_method=S256&state=test
2. Grant permissions to the test AI assistant
3. Use the MCP API endpoints to search and access files

### 🛡️ Security Features
1. Check security status in the dashboard
2. View active sessions and audit logs
3. Test MCP session monitoring (try rapid requests to trigger alerts)

## Sample Data

The system will automatically create:
- **Test OAuth Client** for MCP integration testing
- **Database indexes** for optimal performance
- **Sample user** (register your own to test)

## Stopping the Application

```bash
docker-compose -f docker-compose.local.yml down
```

To remove all data (reset everything):
```bash
docker-compose -f docker-compose.local.yml down -v
```

## Development Mode

For development with hot reloading:

```bash
# Start just the databases
docker-compose -f docker-compose.local.yml up mongodb redis -d

# Run backend in dev mode
cd backend && npm run dev

# In another terminal, run frontend in dev mode
cd frontend && npm run dev
```

## Troubleshooting

### Port Conflicts
If ports are already in use, you can modify the ports in `docker-compose.local.yml`:
- Frontend: Change `3001:3000` to `4001:3000`
- Backend: Change `3000:3000` to `4000:3000`

### Database Connection Issues
1. Ensure Docker containers are running: `docker ps`
2. Check logs: `docker-compose -f docker-compose.local.yml logs`
3. Restart if needed: `docker-compose -f docker-compose.local.yml restart`

### Dependency Issues
```bash
# Clean install
rm -rf backend/node_modules frontend/node_modules
cd backend && npm install && cd ../frontend && npm install
```

## API Testing

You can test the API directly:

```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Architecture

The local deployment includes:
- **MongoDB** for primary data storage
- **Redis** for caching and session management  
- **Express.js API** with TypeScript
- **React frontend** with GOV.UK design system
- **MCP integration** for AI assistant access
- **OAuth 2.0** for secure third-party authorization

Enjoy exploring BitAtlas! 🚀