import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage for demo
const users: any[] = [];
const files: any[] = [];
let nextId = 1;

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'OK',
    message: '🚀 BitAtlas Phase 1 - Development Mode',
    timestamp: new Date().toISOString(),
    database: 'In-Memory (Development)',
    version: '1.0.0',
    stats: {
      users: users.length,
      files: files.length
    }
  });
});

// Authentication endpoints
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'ERR_MISSING_FIELDS'
    });
  }

  // Check if user exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists with this email',
      code: 'ERR_USER_EXISTS'
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
      code: 'ERR_WEAK_PASSWORD'
    });
  }

  const user = {
    id: `user-${nextId++}`,
    email,
    password_hash: '***hashed***', // Would be bcrypt in real implementation
    created_at: new Date().toISOString()
  };

  users.push(user);

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required',
      code: 'ERR_MISSING_FIELDS'
    });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({
      error: 'Invalid email or password',
      code: 'ERR_INVALID_CREDENTIALS'
    });
  }

  // Mock JWT response
  res.json({
    message: 'Login successful',
    accessToken: 'mock-jwt-token-' + Date.now(),
    refreshToken: 'mock-refresh-token-' + Date.now(),
    expiresIn: 3600
  });
});

// File endpoints
app.post('/api/v1/files', (req, res) => {
  const { name, content, path = '/', metadata = {} } = req.body;

  if (!name) {
    return res.status(400).json({
      error: 'File name is required',
      code: 'ERR_MISSING_NAME'
    });
  }

  const file = {
    id: `file-${nextId++}`,
    user_id: 'demo-user',
    name,
    path,
    size: content ? content.length : 0,
    mime_type: name.endsWith('.txt') ? 'text/plain' : 'application/octet-stream',
    content,
    metadata,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  files.push(file);

  res.status(201).json({
    message: 'File created successfully',
    file: {
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.created_at
    }
  });
});

app.get('/api/v1/files/:id', (req, res) => {
  const { id } = req.params;
  const { preview } = req.query;

  const file = files.find(f => f.id === id);
  if (!file) {
    return res.status(404).json({
      error: 'File not found',
      code: 'ERR_FILE_NOT_FOUND'
    });
  }

  res.json({
    file: {
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.created_at,
      content: preview === 'true' ? file.content : undefined
    }
  });
});

app.get('/api/v1/files', (req, res) => {
  const { path = '/', page = '1', pageSize = '20' } = req.query;
  
  const filteredFiles = files.filter(f => f.path === path);
  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const start = (pageNum - 1) * size;
  const end = start + size;

  res.json({
    message: 'Files retrieved successfully',
    results: filteredFiles.slice(start, end).map(f => ({
      fileId: f.id,
      name: f.name,
      path: f.path,
      size: f.size,
      mimeType: f.mime_type,
      createdAt: f.created_at
    })),
    total: filteredFiles.length,
    page: pageNum,
    pageSize: size
  });
});

app.get('/api/v1/files/search/query', (req, res) => {
  const { q: query, page = '1', pageSize = '20' } = req.query;

  if (!query) {
    return res.status(400).json({
      error: 'Search query is required',
      code: 'ERR_MISSING_QUERY'
    });
  }

  const searchResults = files.filter(f => 
    f.name.toLowerCase().includes((query as string).toLowerCase()) ||
    (f.content && f.content.toLowerCase().includes((query as string).toLowerCase()))
  );

  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const start = (pageNum - 1) * size;
  const end = start + size;

  res.json({
    message: 'Search completed successfully',
    results: searchResults.slice(start, end).map(f => ({
      fileId: f.id,
      name: f.name,
      path: f.path,
      size: f.size,
      mimeType: f.mime_type,
      createdAt: f.created_at
    })),
    total: searchResults.length,
    page: pageNum,
    pageSize: size
  });
});

// MCP endpoints
app.get('/api/v1/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'searchFiles',
        description: 'Search through the user\'s files by name or content',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 20 }
          },
          required: ['query']
        }
      },
      {
        name: 'readFile',
        description: 'Read the content of a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'File ID to read' },
            preview: { type: 'boolean', default: false }
          },
          required: ['fileId']
        }
      },
      {
        name: 'createFile',
        description: 'Create a new file with content',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'File name' },
            content: { type: 'string', description: 'File content' },
            path: { type: 'string', default: '/' }
          },
          required: ['name']
        }
      },
      {
        name: 'listFiles',
        description: 'List files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', default: '/' },
            page: { type: 'number', default: 1 },
            pageSize: { type: 'number', default: 20 }
          }
        }
      }
    ],
    version: '1.0',
    userScopes: ['files:read', 'files:write', 'files:delete']
  });
});

app.post('/api/v1/mcp/call', (req, res) => {
  const { method, params = {}, id } = req.body;

  if (!method) {
    return res.status(400).json({
      id: id || null,
      error: {
        code: 'ERR_INVALID_REQUEST',
        message: 'Method is required'
      }
    });
  }

  let result;

  switch (method) {
    case 'createFile':
      const file = {
        id: `file-${nextId++}`,
        name: params.name || 'untitled.txt',
        content: params.content || '',
        path: params.path || '/',
        created_at: new Date().toISOString()
      };
      files.push(file);
      result = {
        fileId: file.id,
        name: file.name,
        createdAt: file.created_at
      };
      break;

    case 'listFiles':
      const pathFiles = files.filter(f => f.path === (params.path || '/'));
      result = {
        results: pathFiles.map(f => ({
          fileId: f.id,
          name: f.name,
          size: f.size || 0,
          createdAt: f.created_at
        })),
        total: pathFiles.length
      };
      break;

    case 'searchFiles':
      if (!params.query) {
        return res.status(400).json({
          id: id || null,
          error: {
            code: 'ERR_INVALID_REQUEST',
            message: 'Query parameter is required for searchFiles'
          }
        });
      }
      const searchResults = files.filter(f => 
        f.name.toLowerCase().includes(params.query.toLowerCase())
      );
      result = {
        results: searchResults.map(f => ({
          fileId: f.id,
          name: f.name,
          size: f.size || 0,
          createdAt: f.created_at
        })),
        total: searchResults.length
      };
      break;

    case 'readFile':
      const targetFile = files.find(f => f.id === params.fileId);
      if (!targetFile) {
        return res.status(404).json({
          id: id || null,
          error: {
            code: 'ERR_FILE_NOT_FOUND',
            message: 'File not found'
          }
        });
      }
      result = {
        id: targetFile.id,
        name: targetFile.name,
        content: targetFile.content || '',
        mimeType: targetFile.mime_type || 'text/plain'
      };
      break;

    default:
      return res.status(400).json({
        id: id || null,
        error: {
          code: 'ERR_METHOD_NOT_FOUND',
          message: `Unknown method: ${method}`
        }
      });
  }

  res.json({
    id: id || null,
    result,
    version: '1.0'
  });
});

// Legacy status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({ 
    message: 'BitAtlas API is running - Development Mode',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mode: 'In-Memory Storage',
    stats: {
      users: users.length,
      files: files.length,
      uptime: process.uptime()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'ERR_NOT_FOUND',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 BitAtlas Phase 1 - Development Server Started!');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/v1/status`);
  console.log(`🤖 MCP Tools: http://localhost:${PORT}/api/v1/mcp/tools`);
  console.log('\n📋 Mode: In-Memory Storage (No Database Required)');
  console.log('\n✨ Try these commands:');
  console.log(`curl http://localhost:${PORT}/health`);
  console.log(`curl -X POST http://localhost:${PORT}/api/v1/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'`);
  console.log(`curl -X POST http://localhost:${PORT}/api/v1/files -H "Content-Type: application/json" -d '{"name":"test.txt","content":"Hello BitAtlas"}'`);
  console.log(`curl http://localhost:${PORT}/api/v1/mcp/tools`);
});

export default app;