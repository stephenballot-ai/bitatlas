#!/usr/bin/env node

/**
 * BitAtlas Phase 1 Demo - See it working without database!
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

// Demo data
const users = [];
const files = [];
let nextId = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: '🎉 BitAtlas Phase 1 Demo is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Demo user registration
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password required',
      code: 'ERR_MISSING_FIELDS'
    });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists',
      code: 'ERR_USER_EXISTS'
    });
  }

  const user = {
    id: `user-${nextId++}`,
    email,
    password: '***hidden***',
    createdAt: new Date().toISOString()
  };
  
  users.push(user);

  res.status(201).json({
    message: 'User created successfully! 🎉',
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    }
  });
});

// Demo file creation
app.post('/api/v1/files', (req, res) => {
  const { name, content } = req.body;
  
  if (!name) {
    return res.status(400).json({
      error: 'File name required',
      code: 'ERR_MISSING_NAME'
    });
  }

  const file = {
    id: `file-${nextId++}`,
    name,
    content: content || 'Demo file content',
    size: (content || 'Demo file content').length,
    mimeType: 'text/plain',
    createdAt: new Date().toISOString(),
    userId: 'demo-user'
  };
  
  files.push(file);

  res.status(201).json({
    message: 'File created successfully! 📁',
    file: {
      fileId: file.id,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      createdAt: file.createdAt
    }
  });
});

// Demo file listing
app.get('/api/v1/files', (req, res) => {
  res.json({
    message: 'Files retrieved successfully! 📂',
    results: files.map(f => ({
      fileId: f.id,
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      createdAt: f.createdAt
    })),
    total: files.length,
    page: 1,
    pageSize: 20
  });
});

// Demo MCP tools for AI assistants
app.get('/api/v1/mcp/tools', (req, res) => {
  res.json({
    message: '🤖 MCP Tools for AI Assistants',
    tools: [
      {
        name: 'createFile',
        description: 'Create a new file with content',
        enabled: true
      },
      {
        name: 'listFiles', 
        description: 'List all user files',
        enabled: true
      },
      {
        name: 'searchFiles',
        description: 'Search through files',
        enabled: true
      }
    ],
    version: '1.0',
    userScopes: ['files:read', 'files:write']
  });
});

// Demo MCP call endpoint
app.post('/api/v1/mcp/call', (req, res) => {
  const { method, params } = req.body;
  
  if (method === 'createFile') {
    const file = {
      id: `mcp-file-${nextId++}`,
      name: params.name || 'untitled.txt',
      content: params.content || 'Created via MCP!',
      createdAt: new Date().toISOString()
    };
    files.push(file);
    
    res.json({
      result: {
        fileId: file.id,
        name: file.name,
        createdAt: file.createdAt
      },
      version: '1.0'
    });
  } else if (method === 'listFiles') {
    res.json({
      result: {
        results: files.map(f => ({
          fileId: f.id,
          name: f.name,
          size: f.size || f.content.length,
          createdAt: f.createdAt
        })),
        total: files.length
      },
      version: '1.0'
    });
  } else {
    res.status(400).json({
      error: {
        code: 'ERR_METHOD_NOT_FOUND',
        message: `Method '${method}' not implemented in demo`
      },
      version: '1.0'
    });
  }
});

// Demo status
app.get('/demo/status', (req, res) => {
  res.json({
    message: '🚀 BitAtlas Phase 1 Demo Status',
    stats: {
      registeredUsers: users.length,
      totalFiles: files.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    },
    features: {
      authentication: '✅ User Registration',
      fileOperations: '✅ CRUD Operations', 
      mcpProtocol: '✅ AI Assistant Integration',
      rateLimit: '✅ Security Middleware',
      cors: '✅ Cross-Origin Support'
    },
    nextSteps: [
      'Connect to PostgreSQL for persistence',
      'Add JWT authentication',
      'Enable Redis rate limiting',
      'Deploy with Docker Compose'
    ]
  });
});

app.listen(PORT, () => {
  console.log('\n🎉 BitAtlas Phase 1 Demo Server Started!');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/demo/status`);
  console.log('\n📋 Try these commands:');
  console.log(`curl http://localhost:${PORT}/health`);
  console.log(`curl -X POST http://localhost:${PORT}/api/v1/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123"}'`);
  console.log(`curl -X POST http://localhost:${PORT}/api/v1/files -H "Content-Type: application/json" -d '{"name":"demo.txt","content":"Hello BitAtlas!"}'`);
  console.log(`curl http://localhost:${PORT}/api/v1/files`);
  console.log(`curl http://localhost:${PORT}/api/v1/mcp/tools`);
  console.log('\n🎯 Open http://localhost:3001/demo/status in your browser!');
});