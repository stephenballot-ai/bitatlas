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
   - **Frontend:** http://localhost:5173 (Vite dev server)
   - **Backend API:** http://localhost:3000
   - **In-Memory Storage:** Demo mode (no external database required)

## What You'll See

### 🌐 Frontend (http://localhost:5173)
- **Homepage** with BitAtlas branding using GOV.UK design system
- **User Registration/Login** with secure authentication and enhanced error handling
- **File Dashboard** with classic file system tree UI and folder management
- **File Upload** with 50MB limit and enhanced error messages
- **File Preview** with support for text files and images
- **Multi-select operations** for batch file management

### 🔧 Backend API (http://localhost:3000)
- **REST API** for file operations and user management
- **MCP Endpoints** (`/mcp/v1/*`) for AI assistant integration
- **OAuth 2.0** authorization endpoints (`/oauth/*`)
- **Health Checks** at `/health` and `/ready`

## Key Features You Can Test

### 🔐 User Authentication  
1. Register a new account at http://localhost:5173/register
2. Login with your credentials at http://localhost:5173/login
3. Access the protected dashboard at http://localhost:5173/dashboard

### 📁 File Management (Phase 1 Features)
1. **Upload files** up to 50MB with enhanced error handling
2. **Classic file system UI** - Windows Explorer/macOS Finder style interface
3. **Folder hierarchy** - Create nested folders (up to 5 levels deep)
4. **File operations** - Delete files with soft delete/trash functionality
5. **Multi-select** - Select multiple files for batch operations
6. **File preview** - Enhanced preview for text files and images
7. **Folder navigation** - Collapsible tree sidebar with breadcrumb trail

### 🤖 MCP Integration (AI Assistant Access) 
1. **OAuth Authorization**: Visit http://localhost:3000/oauth/authorize?client_id=test-ai&response_type=code&scope=read%20search&redirect_uri=http://localhost:8080&state=test
2. **Grant Permissions**: Click "✅ Allow Access" (now works in Safari with intermediate success page)
3. **Token Generation**: System generates access token and redirects to dashboard
4. **Test Button Page**: For debugging, visit http://localhost:3000/test-buttons
5. **API Testing**: Use generated tokens with MCP endpoints

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

For development with hot reloading (current setup):

```bash
# Run backend in demo mode (in-memory storage)
cd backend && npm run dev:simple

# In another terminal, run frontend in dev mode  
cd frontend && npm run dev
```

The system will start:
- **Backend**: http://localhost:3000 (with in-memory storage for demo)
- **Frontend**: http://localhost:5173 (Vite dev server with hot reload)

## Troubleshooting

### Port Conflicts
If ports are already in use:
- **Backend**: Running on port 3000 - modify `PORT` environment variable
- **Frontend**: Running on port 5173 - Vite will auto-increment if busy (5174, 5175, etc.)

### Recent Fixes Applied
- ✅ **Registration Error Handling**: Enhanced error messages for better debugging
- ✅ **File Upload Issues**: Increased limit to 50MB with proper MulterError handling  
- ✅ **OAuth Authorization**: Fixed CSP security policy blocking JavaScript execution
- ✅ **Safari Compatibility**: Added intermediate success page for OAuth redirects

### In-Memory Storage (Current Setup)
The demo runs with in-memory storage, so no external database is required:
- **Files**: Stored in `uploads/` directory
- **Data**: Reset when backend restarts
- **Persistence**: Files persist, but metadata resets

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

The current demo deployment includes:
- **In-Memory Storage** for fast demo performance (no external DB required)
- **Express.js API** with TypeScript and enhanced error handling  
- **React frontend** with Vite dev server and classic file system UI
- **Helmet.js security** with configured CSP for OAuth functionality
- **Multer file handling** with 50MB limit and comprehensive error handling
- **MCP integration** with working OAuth 2.0 authorization flow
- **Safari-compatible** OAuth redirects with intermediate success pages

## 🎉 Latest Updates (August 2025)

BitAtlas Phase 1 implementation is now **complete** with all major features working:

### ✅ **Working Features**
- **User Registration/Login** with enhanced error messages
- **File Upload System** with 50MB limit and proper error handling
- **Classic File System UI** - Professional Windows/macOS style interface  
- **Folder Management** - Create, navigate, and organize with hierarchy
- **File Operations** - Delete, restore, multi-select batch operations
- **OAuth Authorization** - Full working flow with Safari compatibility
- **File Preview System** - Enhanced preview for text files and images

### 🔧 **Technical Improvements**
- **CSP Security Configuration** - Properly configured Helmet.js
- **Safari Compatibility** - Fixed OAuth redirect issues
- **Error Handling** - Comprehensive error messages throughout
- **File Size Limits** - Increased from 10MB to 50MB with proper validation

All core functionality is **production-ready** for demo purposes!

Enjoy exploring BitAtlas! 🚀✨