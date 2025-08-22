import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { db } from './database/connection';
import { EuPolicyService, enforceEuPolicy } from './services/euPolicyService';
import { AuditService } from './services/auditService';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline JavaScript
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers like onclick
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline CSS
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null, // Disable HTTPS upgrade forcing
    },
  },
}));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize audit service
const auditService = new AuditService();

// Audit logging middleware (before EU policy)
app.use(auditService.auditMiddleware());

// EU Policy enforcement middleware
app.use(enforceEuPolicy());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept most common file types
    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|zip)$/i;
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip'
    ];
    
    const hasValidExtension = allowedExtensions.test(file.originalname.toLowerCase());
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    
    if (hasValidExtension && hasValidMimeType) {
      return cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: jpeg, jpg, png, gif, pdf, doc, docx, txt, csv, xlsx, zip. Received: ${file.mimetype}`));
    }
  }
});

// In-memory file storage for demo (Phase 1: Enhanced with soft delete support)
let uploadedFiles: any[] = [];
let deletedFiles: any[] = []; // Trash bin for soft-deleted files

// In-memory folder storage for demo (Phase 1: Basic folder hierarchy)
let folders: any[] = [
  { id: 'root', name: 'root', parentId: null, path: '/', materialized_path: 'root', depth: 0, fileCount: 0, subfolderCount: 0, createdAt: new Date().toISOString() }
];

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'BitAtlas API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not ready',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    api: 'BitAtlas Cloud Storage',
    version: '1.0.0',
    features: [
      'User Authentication',
      'File Management',
      'MCP Integration',
      'Security Monitoring',
      'GDPR Compliance'
    ],
    endpoints: {
      health: '/health',
      ready: '/ready',
      auth: '/api/auth/*',
      files: '/api/files/*',
      search: '/api/files/search/query',
      mcp: '/mcp/v1/*',
      oauth: '/oauth/*'
    }
  });
});

// Auth endpoints (simplified for demo)
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Email validation
  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Password validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
  }
  
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
  }
  
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one number' });
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one special character' });
  }
  
  // Simulate user registration
  res.json({
    message: 'User registered successfully',
    user: { id: '1', email, createdAt: new Date().toISOString() }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Email validation
  const emailRegex = /\S+@\S+\.\S+/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  // Simulate user login
  res.json({
    message: 'Login successful',
    token: 'demo-jwt-token',
    user: { id: '1', email }
  });
});

// Files endpoints (simplified for demo)
app.get('/api/files', (req, res) => {
  const defaultFiles = [
    { id: '1', name: 'document.pdf', size: 1024000, createdAt: new Date().toISOString() },
    { id: '2', name: 'photo.jpg', size: 2048000, createdAt: new Date().toISOString() },
    { id: '3', name: 'spreadsheet.xlsx', size: 512000, createdAt: new Date().toISOString() }
  ];
  
  const allFiles = [...defaultFiles, ...uploadedFiles];
  
  res.json({
    files: allFiles,
    total: allFiles.length
  });
});

// Search files endpoint
app.get('/api/files/search/query', (req, res) => {
  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const query = q.toLowerCase();
  
  // Combine default files and uploaded files
  const defaultFiles = [
    { id: '1', name: 'document.pdf', size: 1024000, createdAt: new Date().toISOString() },
    { id: '2', name: 'photo.jpg', size: 2048000, createdAt: new Date().toISOString() },
    { id: '3', name: 'spreadsheet.xlsx', size: 512000, createdAt: new Date().toISOString() }
  ];
  
  const allFiles = [...defaultFiles, ...uploadedFiles];
  
  // Simple search by filename (case-insensitive)
  const searchResults = allFiles.filter(file => 
    file.name.toLowerCase().includes(query)
  );
  
  res.json({
    files: searchResults,
    total: searchResults.length,
    query: q
  });
});

// Get individual file or preview
app.get('/api/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  const { preview } = req.query;
  
  // Combine default files and uploaded files
  const defaultFiles = [
    { id: '1', name: 'document.pdf', size: 1024000, createdAt: new Date().toISOString(), type: 'pdf', content: 'This is a sample PDF document content for preview.' },
    { id: '2', name: 'photo.jpg', size: 2048000, createdAt: new Date().toISOString(), type: 'image', content: null },
    { id: '3', name: 'spreadsheet.xlsx', size: 512000, createdAt: new Date().toISOString(), type: 'excel', content: 'Sample spreadsheet data for preview.' }
  ];
  
  const allFiles = [...defaultFiles, ...uploadedFiles];
  
  const file = allFiles.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // If it's a preview request, add content
  if (preview === 'true') {
    let content = '';
    
    if (file.type === 'pdf') {
      content = 'This is a sample PDF document content for preview.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
    } else if (file.type === 'excel') {
      content = 'Sample spreadsheet data:\n\nColumn A | Column B | Column C\n---------|----------|----------\nData 1   | Value 1  | 100\nData 2   | Value 2  | 200\nData 3   | Value 3  | 300';
    } else if (file.mimetype === 'text/plain') {
      // For uploaded text files, try to read actual content
      try {
        if (file.path) {
          // Ensure we have the correct file path
          const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
          console.log(`Reading file from: ${fullPath}`);
          content = fs.readFileSync(fullPath, 'utf8');
        } else {
          content = 'Text file content preview not available.';
        }
      } catch (error) {
        console.error('Error reading text file:', error);
        content = `Unable to read file content. Error: ${error.message}`;
      }
    } else if (file.mimetype?.startsWith('image/')) {
      // For images, provide metadata and preview info
      try {
        if (file.path) {
          const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
          const stats = fs.statSync(fullPath);
          content = {
            type: 'image',
            previewUrl: `/api/files/${file.id}/raw`, // URL to serve the raw image
            metadata: {
              size: stats.size,
              lastModified: stats.mtime.toISOString(),
              format: file.mimetype
            }
          };
        } else {
          content = { type: 'image', error: 'Image file not found on disk' };
        }
      } catch (error) {
        console.error('Error processing image:', error);
        content = { type: 'image', error: 'Unable to process image file' };
      }
    } else {
      content = 'Preview not available for this file type.';
    }
    
    res.json({
      file: {
        ...file,
        content: content
      }
    });
  } else {
    // Regular file info without content
    res.json({
      file: file
    });
  }
});

app.post('/api/files/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Invalid file field name. Expected "file".' });
      } else if (err.message && err.message.includes('File type not allowed')) {
        return res.status(400).json({ error: err.message });
      } else {
        return res.status(400).json({ error: 'Upload failed: ' + err.message });
      }
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
    
      const { folderId } = req.body; // Support folder assignment
      
      // Validate folder exists if folderId provided
      if (folderId && folderId !== 'root') {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) {
          return res.status(404).json({ error: 'Target folder not found' });
        }
      }
      
      const fileInfo = {
        id: Date.now().toString(),
        name: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        folderId: folderId || 'root', // Assign to folder or root
        createdAt: new Date().toISOString(),
        path: req.file.path
      };
      
      uploadedFiles.push(fileInfo);
      
      // Update folder file count
      const targetFolder = folders.find(f => f.id === (folderId || 'root'));
      if (targetFolder) {
        targetFolder.fileCount += 1;
      }
      
      res.json({
        message: 'File uploaded successfully',
        file: fileInfo
      });
    } catch (error) {
      res.status(500).json({ error: 'Upload failed: ' + (error as Error).message });
    }
  });
});

// MCP endpoints (simplified for demo)
app.get('/mcp/v1/search', (req, res) => {
  const { query } = req.query;
  res.json({
    results: [
      { id: '1', name: 'document.pdf', relevance: 0.95, snippet: 'Important document about...' },
      { id: '2', name: 'notes.txt', relevance: 0.78, snippet: 'Meeting notes from...' }
    ],
    total: 2,
    query
  });
});

// MCP Tools Discovery
app.get('/api/v1/mcp/tools', authMiddleware, (req, res) => {
  const userScopes = req.user?.scopes || [];
  
  const tools = [
    {
      name: 'searchFiles',
      description: 'Search through the user\'s files by name, content, or metadata',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', default: 20, maximum: 100 }
        },
        required: ['query']
      },
      enabled: userScopes.includes('files:read')
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
      },
      enabled: userScopes.includes('files:read')
    },
    {
      name: 'createFile',
      description: 'Create a new file with specified content',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'File name' },
          content: { type: 'string', description: 'File content' },
          path: { type: 'string', default: '/' }
        },
        required: ['name']
      },
      enabled: userScopes.includes('files:write')
    },
    {
      name: 'batchOperation',
      description: 'Perform multiple file operations in a single request',
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                operation: { type: 'string', enum: ['create', 'read', 'update', 'delete', 'search'] },
                params: { type: 'object' }
              },
              required: ['operation', 'params']
            }
          }
        },
        required: ['operations']
      },
      enabled: userScopes.includes('files:write')
    },
    {
      name: 'listFiles',
      description: 'List files in a directory with pagination',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', default: '/' },
          page: { type: 'number', default: 1 },
          limit: { type: 'number', default: 20, maximum: 100 }
        }
      },
      enabled: userScopes.includes('files:read')
    }
  ];

  res.json({
    tools: tools.filter(t => t.enabled).map(({enabled, ...tool}) => tool),
    version: '1.0',
    userScopes
  });
});

// MCP Call Endpoint
app.post('/api/v1/mcp/call', authMiddleware, async (req, res) => {
  try {
    const { method, params, id } = req.body;
    
    if (!method) {
      return res.status(400).json({
        id: id || null,
        error: { code: 'ERR_INVALID_REQUEST', message: 'Method is required' }
      });
    }

    // Mock MCP responses for development
    let result;
    switch (method) {
      case 'searchFiles':
        result = {
          results: [
            {
              id: 'mock-file-1',
              name: `${params?.query || 'example'}_document.txt`,
              path: '/documents',
              size: 1024,
              mimeType: 'text/plain',
              createdAt: new Date().toISOString()
            }
          ],
          total: 1
        };
        break;
        
      case 'readFile':
        result = {
          id: params?.fileId || 'unknown',
          name: 'mock_file.txt',
          content: `Mock content for file ${params?.fileId || 'unknown'}`,
          mimeType: 'text/plain',
          size: 50
        };
        break;
        
      case 'createFile':
        result = {
          fileId: `created-${Date.now()}`,
          name: params?.name || 'untitled.txt',
          path: params?.path || '/',
          createdAt: new Date().toISOString()
        };
        break;
        
      case 'listFiles':
        const { path = '/', page = 1, limit = 20 } = params || {};
        result = {
          files: [
            {
              id: 'list-file-1',
              name: 'document1.txt',
              path: path,
              size: 1024,
              mimeType: 'text/plain',
              createdAt: new Date().toISOString()
            },
            {
              id: 'list-file-2', 
              name: 'data.json',
              path: path,
              size: 2048,
              mimeType: 'application/json',
              createdAt: new Date().toISOString()
            }
          ],
          total: 2,
          page,
          limit,
          path
        };
        break;
        
      case 'batchOperation':
        const operations = params?.operations || [];
        const batchResults = [];
        
        for (const op of operations) {
          try {
            switch (op.operation) {
              case 'create':
                batchResults.push({
                  operation: 'create',
                  success: true,
                  result: {
                    fileId: `batch-created-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    name: op.params?.name || 'batch-file.txt'
                  }
                });
                break;
              case 'search':
                batchResults.push({
                  operation: 'search',
                  success: true,
                  result: {
                    results: [{
                      id: `batch-search-${Date.now()}`,
                      name: `${op.params?.query || 'batch'}_result.txt`
                    }],
                    total: 1
                  }
                });
                break;
              default:
                batchResults.push({
                  operation: op.operation,
                  success: false,
                  error: `Operation ${op.operation} not implemented in demo`
                });
            }
          } catch (error) {
            batchResults.push({
              operation: op.operation,
              success: false,
              error: `Failed to execute ${op.operation}`
            });
          }
        }
        
        result = {
          operations: batchResults,
          totalOperations: operations.length,
          successfulOperations: batchResults.filter(r => r.success).length
        };
        break;
        
      default:
        return res.status(400).json({
          id: id || null,
          error: { code: 'ERR_INVALID_REQUEST', message: `Unknown method: ${method}` }
        });
    }

    res.json({
      id: id || null,
      result,
      version: '1.0'
    });
  } catch (error) {
    res.status(500).json({
      id: req.body.id || null,
      error: { code: 'ERR_INTERNAL_ERROR', message: 'Internal server error' }
    });
  }
});

// Serve raw files (for image preview, downloads, etc.)
app.get('/api/files/:fileId/raw', (req, res) => {
  const { fileId } = req.params;
  
  // Find file in uploaded files
  const allFiles = [...uploadedFiles, ...deletedFiles];
  const file = allFiles.find(f => f.id === fileId);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const fullPath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving file' });
      }
    });
    
  } catch (error) {
    console.error('Error serving raw file:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

// File deletion endpoint (Phase 1: Soft delete with trash)
app.delete('/api/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  const { permanent } = req.query;
  
  // Find file in uploaded files
  const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  const file = uploadedFiles[fileIndex];
  
  if (permanent === 'true') {
    // Permanent deletion
    try {
      // Delete actual file from disk
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      // Remove from uploaded files
      uploadedFiles.splice(fileIndex, 1);
      
      // Remove from deleted files if it was there
      const deletedIndex = deletedFiles.findIndex(f => f.id === fileId);
      if (deletedIndex !== -1) {
        deletedFiles.splice(deletedIndex, 1);
      }
      
      res.json({ 
        message: 'File permanently deleted',
        fileId: fileId
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file permanently' });
    }
  } else {
    // Soft delete (move to trash)
    const deletedFile = {
      ...file,
      deletedAt: new Date().toISOString(),
      isDeleted: true
    };
    
    // Add to deleted files
    deletedFiles.push(deletedFile);
    
    // Remove from active files
    uploadedFiles.splice(fileIndex, 1);
    
    res.json({ 
      message: 'File moved to trash',
      fileId: fileId,
      canRestore: true
    });
  }
});

// Get trash/deleted files
app.get('/api/trash', (req, res) => {
  res.json({
    files: deletedFiles,
    total: deletedFiles.length
  });
});

// Restore file from trash
app.post('/api/files/:fileId/restore', (req, res) => {
  const { fileId } = req.params;
  
  const deletedIndex = deletedFiles.findIndex(f => f.id === fileId);
  
  if (deletedIndex === -1) {
    return res.status(404).json({ error: 'File not found in trash' });
  }
  
  const file = deletedFiles[deletedIndex];
  
  // Remove deletion metadata
  delete file.deletedAt;
  delete file.isDeleted;
  
  // Move back to active files
  uploadedFiles.push(file);
  
  // Remove from deleted files
  deletedFiles.splice(deletedIndex, 1);
  
  res.json({
    message: 'File restored successfully',
    file: file
  });
});

// Batch file operations
app.post('/api/files/batch', (req, res) => {
  const { operation, fileIds } = req.body;
  
  if (!operation || !Array.isArray(fileIds)) {
    return res.status(400).json({ error: 'Operation and fileIds array required' });
  }
  
  const results = [];
  
  for (const fileId of fileIds) {
    try {
      if (operation === 'delete') {
        const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
        if (fileIndex !== -1) {
          const file = uploadedFiles[fileIndex];
          const deletedFile = {
            ...file,
            deletedAt: new Date().toISOString(),
            isDeleted: true
          };
          
          deletedFiles.push(deletedFile);
          uploadedFiles.splice(fileIndex, 1);
          
          results.push({ fileId, success: true, operation: 'delete' });
        } else {
          results.push({ fileId, success: false, error: 'File not found' });
        }
      }
    } catch (error) {
      results.push({ fileId, success: false, error: error.message });
    }
  }
  
  res.json({
    results,
    total: fileIds.length,
    successful: results.filter(r => r.success).length
  });
});

// Folder management endpoints (Phase 1: Basic folder operations)

// Create new folder
app.post('/api/folders', (req, res) => {
  const { name, parentId } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  // Validate parent folder exists (if parentId provided)
  let parentFolder = null;
  if (parentId && parentId !== 'root') {
    parentFolder = folders.find(f => f.id === parentId);
    if (!parentFolder) {
      return res.status(404).json({ error: 'Parent folder not found' });
    }
    
    // Check depth limit (VP recommendation: max 5 levels)
    if (parentFolder.depth >= 4) {
      return res.status(400).json({ error: 'Maximum folder depth of 5 levels exceeded' });
    }
  }
  
  // Check for duplicate folder names in the same parent
  const existingFolder = folders.find(f => 
    f.name === name && f.parentId === (parentId || 'root')
  );
  if (existingFolder) {
    return res.status(400).json({ error: 'Folder with this name already exists in the parent directory' });
  }
  
  const folderId = Date.now().toString();
  const depth = parentFolder ? parentFolder.depth + 1 : 0;
  const parentPath = parentFolder ? parentFolder.path : '/';
  const path = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
  const materialized_path = parentFolder ? 
    `${parentFolder.materialized_path}/${folderId}` : 
    folderId;
  
  const newFolder = {
    id: folderId,
    name,
    parentId: parentId || 'root',
    path,
    materialized_path,
    depth,
    fileCount: 0,
    subfolderCount: 0,
    createdAt: new Date().toISOString()
  };
  
  folders.push(newFolder);
  
  // Update parent's subfolder count
  if (parentFolder) {
    parentFolder.subfolderCount += 1;
  }
  
  res.json({
    message: 'Folder created successfully',
    folder: newFolder
  });
});

// Get folder contents
app.get('/api/folders/:folderId/contents', (req, res) => {
  const { folderId } = req.params;
  
  // Find the folder
  const folder = folders.find(f => f.id === folderId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  
  // Get subfolders
  const subfolders = folders.filter(f => f.parentId === folderId);
  
  // Get files in this folder
  const folderFiles = uploadedFiles.filter(f => f.folderId === folderId);
  
  res.json({
    folder: folder,
    subfolders: subfolders,
    files: folderFiles,
    totals: {
      subfolders: subfolders.length,
      files: folderFiles.length
    }
  });
});

// Get all folders (for folder tree)
app.get('/api/folders', (req, res) => {
  res.json({
    folders: folders,
    total: folders.length
  });
});

// Delete folder
app.delete('/api/folders/:folderId', (req, res) => {
  const { folderId } = req.params;
  const { recursive } = req.query;
  
  if (folderId === 'root') {
    return res.status(400).json({ error: 'Cannot delete root folder' });
  }
  
  const folder = folders.find(f => f.id === folderId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  
  // Check if folder has contents
  const hasSubfolders = folders.some(f => f.parentId === folderId);
  const hasFiles = uploadedFiles.some(f => f.folderId === folderId);
  
  if ((hasSubfolders || hasFiles) && recursive !== 'true') {
    return res.status(400).json({ 
      error: 'Folder is not empty. Use recursive=true to delete folder and all contents.',
      hasSubfolders,
      hasFiles
    });
  }
  
  // Recursive deletion
  if (recursive === 'true') {
    // Delete all files in folder and subfolders
    const deleteFromFolder = (targetFolderId) => {
      // Delete files
      const filesToDelete = uploadedFiles.filter(f => f.folderId === targetFolderId);
      filesToDelete.forEach(file => {
        // Move to trash
        const deletedFile = {
          ...file,
          deletedAt: new Date().toISOString(),
          isDeleted: true
        };
        deletedFiles.push(deletedFile);
        
        // Remove from active files
        const fileIndex = uploadedFiles.findIndex(f => f.id === file.id);
        if (fileIndex !== -1) {
          uploadedFiles.splice(fileIndex, 1);
        }
      });
      
      // Delete subfolders recursively
      const subfolders = folders.filter(f => f.parentId === targetFolderId);
      subfolders.forEach(subfolder => {
        deleteFromFolder(subfolder.id);
      });
    };
    
    deleteFromFolder(folderId);
  }
  
  // Remove the folder itself
  const folderIndex = folders.findIndex(f => f.id === folderId);
  if (folderIndex !== -1) {
    folders.splice(folderIndex, 1);
  }
  
  // Update parent's subfolder count
  const parentFolder = folders.find(f => f.id === folder.parentId);
  if (parentFolder) {
    parentFolder.subfolderCount -= 1;
  }
  
  res.json({
    message: recursive === 'true' ? 'Folder and all contents deleted' : 'Folder deleted',
    folderId: folderId
  });
});

// Rename folder
app.put('/api/folders/:folderId', (req, res) => {
  const { folderId } = req.params;
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  if (folderId === 'root') {
    return res.status(400).json({ error: 'Cannot rename root folder' });
  }
  
  const folder = folders.find(f => f.id === folderId);
  if (!folder) {
    return res.status(404).json({ error: 'Folder not found' });
  }
  
  // Check for duplicate names in same parent
  const existingFolder = folders.find(f => 
    f.name === name && f.parentId === folder.parentId && f.id !== folderId
  );
  if (existingFolder) {
    return res.status(400).json({ error: 'Folder with this name already exists in the parent directory' });
  }
  
  // Update folder name and path
  const oldPath = folder.path;
  folder.name = name;
  
  // Update path for this folder and all descendants
  const parentPath = folder.parentId === 'root' ? '/' : 
    folders.find(f => f.id === folder.parentId)?.path || '/';
  const newPath = parentPath === '/' ? `/${name}` : `${parentPath}/${name}`;
  
  folder.path = newPath;
  
  // Update paths for all descendant folders
  const updateDescendantPaths = (parentId, oldParentPath, newParentPath) => {
    const children = folders.filter(f => f.parentId === parentId);
    children.forEach(child => {
      child.path = child.path.replace(oldParentPath, newParentPath);
      updateDescendantPaths(child.id, oldParentPath, newParentPath);
    });
  };
  
  updateDescendantPaths(folderId, oldPath, newPath);
  
  res.json({
    message: 'Folder renamed successfully',
    folder: folder
  });
});

// Simple auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'ERR_UNAUTHORIZED'
    });
  }

  const token = authHeader.substring(7);
  
  // For demo, validate token from our in-memory storage
  const tokenData = Object.values(oauthTokens).find((t: any) => t.access_token === token);
  
  if (!tokenData) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'ERR_UNAUTHORIZED'
    });
  }

  // Mock user object with scopes
  req.user = {
    userId: 'demo-user-123',
    scopes: (tokenData as any).scope?.split(' ') || ['files:read', 'files:write']
  };
  
  next();
}

// In-memory OAuth storage for demo
let oauthCodes: Record<string, any> = {};
let oauthTokens: Record<string, any> = {};

// Generate access token
function generateAccessToken(clientId: string, scope: string) {
  const tokenId = 'bat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  const tokenData = {
    access_token: tokenId,
    token_type: 'Bearer',
    expires_in: 7776000, // 90 days
    scope: scope,
    client_id: clientId,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7776000 * 1000).toISOString()
  };
  
  oauthTokens[tokenId] = tokenData;
  return tokenData;
}

// OAuth endpoints (simplified for demo)
app.get('/oauth/authorize', (req, res) => {
  const { client_id, response_type, scope, redirect_uri, state } = req.query;
  
  // Validate required parameters
  if (!client_id || !response_type || !scope || !redirect_uri) {
    return res.status(400).send('Missing required OAuth parameters');
  }
  
  res.send(`
    <html>
      <head>
        <title>BitAtlas OAuth - Authorize Access</title>
        <style>
          body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
          .permissions { background: #f3f2f1; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .permission { margin: 5px 0; }
          .buttons { margin: 30px 0; }
          button { padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 16px; }
          .allow { background: #00703c; color: white; }
          .deny { background: #d4351c; color: white; }
          .client-info { background: #e8f4f8; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🔐 Authorize AI Assistant Access</h1>
        
        <div class="client-info">
          <h3>Application Details</h3>
          <p><strong>Client:</strong> ${client_id}</p>
          <p><strong>Type:</strong> AI Assistant Integration</p>
        </div>
        
        <p>This application would like to access your BitAtlas account with the following permissions:</p>
        
        <div class="permissions">
          <h3>Requested Permissions:</h3>
          ${scope.toString().split(' ').map(s => {
            const descriptions = {
              'read': 'View your files and folder structure',
              'search': 'Search through your files and content',
              'files:read': 'Read file contents and metadata',
              'files:search': 'Search and index your files',
              'profile': 'Access your basic profile information'
            };
            const desc = descriptions[s] || 'Access specific functionality';
            return `<div class="permission">• <strong>${s}</strong> - ${desc}</div>`;
          }).join('')}
        </div>
        
        <p><strong>By authorizing this application, you allow it to:</strong></p>
        <ul>
          <li>Access your files according to the permissions above</li>
          <li>Perform actions on your behalf within the granted scope</li>
          <li>Access your account until you revoke this authorization</li>
        </ul>
        
        <div class="buttons">
          <button class="allow" onclick="authorize();">✅ Allow Access</button>
          <button class="deny" onclick="deny();">❌ Deny Access</button>
        </div>
        
        <script>
          console.log('OAuth authorization page loaded');
          
          function authorize() {
            console.log('Authorization button clicked');
            
            // Show loading state on button
            const button = document.querySelector('.allow');
            if (button) {
              button.textContent = '⏳ Generating Token...';
              button.disabled = true;
            }
            
            // Clean redirect without alerts
            setTimeout(() => {
              try {
                const redirectUrl = 'http://localhost:3000/oauth/approve?client_id=${client_id}&scope=${encodeURIComponent(scope.toString())}&state=${state}';
                console.log('Redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
              } catch (error) {
                console.error('Redirect error:', error);
                if (button) {
                  button.textContent = '❌ Redirect Failed';
                  button.style.background = '#d4351c';
                }
              }
            }, 800);
          }
          
          function deny() {
            console.log('Access denied');
            
            // Show loading state on button  
            const button = document.querySelector('.deny');
            if (button) {
              button.textContent = '⏳ Denying Access...';
              button.disabled = true;
            }
            
            setTimeout(() => {
              window.location.href = '${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?oauth_error=access_denied&state=${state}&client_id=${client_id}';
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
});

// OAuth approval endpoint (handles the approval redirect)
app.get('/oauth/approve', (req, res) => {
  const { client_id, scope, state } = req.query;
  
  if (!client_id || !scope) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard?oauth_error=missing_parameters&state=${state}`);
  }
  
  try {
    // Generate access token
    const tokenData = generateAccessToken(client_id.toString(), scope.toString());
    
    // Create success page with shorter redirect URL (Safari-friendly)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Store token temporarily for shorter URL
    const sessionId = `oauth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Store in memory (in production this would be Redis/database)
    if (!global.oauthSessions) {
      global.oauthSessions = new Map();
    }
    
    global.oauthSessions.set(sessionId, {
      success: true,
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      clientId: client_id,
      state: state,
      timestamp: Date.now(),
      expires: Date.now() + (5 * 60 * 1000) // 5 minute expiry
    });
    
    // Shorter redirect URL
    const redirectUrl = `${frontendUrl}/dashboard?session=${sessionId}`;
    
    res.send(`
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { font-family: system-ui; max-width: 500px; margin: 100px auto; text-align: center; padding: 20px; }
            .success { color: #00703c; font-size: 1.2em; margin: 20px 0; }
            .redirect-info { background: #f3f2f1; padding: 20px; border-radius: 4px; margin: 20px 0; }
            button { background: #1d70b8; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>✅ Authorization Successful!</h1>
          <div class="success">
            Your access token has been generated successfully.
          </div>
          <div class="redirect-info">
            <p><strong>Client:</strong> ${client_id}</p>
            <p><strong>Scope:</strong> ${scope}</p>
            <p><strong>Token:</strong> ${tokenData.access_token.substring(0, 20)}...</p>
          </div>
          <p>Click below to return to BitAtlas:</p>
          <button onclick="goToDashboard()">Return to Dashboard</button>
          
          <script>
            let redirectCompleted = false;
            
            function goToDashboard() {
              if (redirectCompleted) return;
              redirectCompleted = true;
              
              console.log('Manual redirect clicked');
              const url = '${redirectUrl}';
              console.log('Redirecting to:', url);
              
              // Update button state
              const button = document.querySelector('button');
              if (button) {
                button.textContent = '⏳ Redirecting...';
                button.disabled = true;
              }
              
              setTimeout(() => {
                window.location.href = url;
              }, 300);
            }
            
            // Auto-redirect after 2 seconds (cleaner, no alerts)
            setTimeout(() => {
              if (redirectCompleted) return;
              redirectCompleted = true;
              
              console.log('Auto-redirecting to dashboard...');
              const url = '${redirectUrl}';
              console.log('Auto-redirect URL:', url);
              
              // Show countdown
              const button = document.querySelector('button');
              if (button) {
                button.textContent = '⏳ Redirecting automatically...';
                button.disabled = true;
              }
              
              window.location.href = url;
            }, 2000);
            
            console.log('OAuth token generated successfully');
            console.log('Session-based redirect URL: ${redirectUrl}');
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?oauth_error=token_generation_failed&state=${state}&client_id=${client_id}`);
  }
});

// OAuth session endpoint (for retrieving stored session data)
app.get('/oauth/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!global.oauthSessions || !global.oauthSessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found or expired' });
  }
  
  const sessionData = global.oauthSessions.get(sessionId);
  
  // Check if session has expired
  if (Date.now() > sessionData.expires) {
    global.oauthSessions.delete(sessionId);
    return res.status(410).json({ error: 'Session expired' });
  }
  
  // Return session data and delete it (single use)
  global.oauthSessions.delete(sessionId);
  
  res.json({
    oauth_success: 'true',
    access_token: sessionData.accessToken,
    token_type: sessionData.tokenType,
    expires_in: sessionData.expiresIn,
    scope: sessionData.scope,
    client_id: sessionData.clientId,
    state: sessionData.state
  });
});

// OAuth token generation endpoint (for demo authorization flow)
app.post('/oauth/generate-token', (req, res) => {
  const { client_id, scope } = req.body;
  
  if (!client_id || !scope) {
    return res.status(400).json({ error: 'Missing client_id or scope' });
  }
  
  const tokenData = generateAccessToken(client_id, scope);
  res.json(tokenData);
});

// OAuth token exchange endpoint (standard OAuth flow)
app.post('/oauth/token', (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;
  
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  
  if (!code || !client_id) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  
  const tokenData = generateAccessToken(client_id, 'read search files:read');
  res.json(tokenData);
});

// Token management endpoints
app.get('/api/tokens', (req, res) => {
  const tokens = Object.values(oauthTokens).map(token => ({
    access_token: token.access_token,
    client_id: token.client_id,
    scope: token.scope,
    created_at: token.created_at,
    expires_at: token.expires_at,
    is_expired: new Date() > new Date(token.expires_at)
  }));
  
  res.json({ tokens });
});

app.delete('/api/tokens/:token', (req, res) => {
  const { token } = req.params;
  
  if (oauthTokens[token]) {
    delete oauthTokens[token];
    res.json({ message: 'Token revoked successfully' });
  } else {
    res.status(404).json({ error: 'Token not found' });
  }
});

// Database connection
async function connectDatabase() {
  try {
    const dbHealthy = await db.healthCheck();
    if (dbHealthy) {
      console.log('✅ Connected to PostgreSQL database');
    } else {
      console.log('⚠️ Database health check failed, running with limited functionality');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('ℹ️ Running in development mode with mock responses');
  }
}

// EU compliance endpoint
app.get('/eu-compliance', (req, res) => {
  const report = EuPolicyService.generateComplianceReport();
  res.json({
    status: 'compliant',
    ...report,
    approvedProviders: EuPolicyService.getApprovedProviders()
  });
});

// Start server
async function startServer() {
  await connectDatabase();
  
  app.listen(PORT, () => {
    console.log(`
🚀 BitAtlas API Server running!

📍 Server: http://localhost:${PORT}
🔍 Health: http://localhost:${PORT}/health
📊 Status: http://localhost:${PORT}/api/status
🔐 OAuth: http://localhost:${PORT}/oauth/authorize?client_id=test-ai&response_type=code&scope=read%20search&redirect_uri=http://localhost:8080&state=test

Environment: ${process.env.NODE_ENV || 'development'}
    `);
  });
}

startServer().catch(console.error);