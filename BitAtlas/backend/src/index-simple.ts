import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept most common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only common file types are allowed!'));
    }
  }
});

// In-memory file storage for demo
let uploadedFiles: any[] = [];

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

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileInfo = {
      id: Date.now().toString(),
      name: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      createdAt: new Date().toISOString(),
      path: req.file.path
    };
    
    uploadedFiles.push(fileInfo);
    
    res.json({
      message: 'File uploaded successfully',
      file: fileInfo
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed: ' + (error as Error).message });
  }
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
          <button class="allow" onclick="authorize()">✅ Allow Access</button>
          <button class="deny" onclick="deny()">❌ Deny Access</button>
        </div>
        
        <script>
          function authorize() {
            console.log('Authorize button clicked');
            
            // Show loading state
            const button = document.querySelector('.allow');
            button.textContent = '⏳ Generating token...';
            button.disabled = true;
            
            // Redirect to a server endpoint that will generate the token and redirect
            const redirectUrl = 'http://localhost:3001/oauth/approve?client_id=${client_id}&scope=${scope}&state=${state}';
            console.log('Redirecting to:', redirectUrl);
            
            setTimeout(() => {
              window.location.href = redirectUrl;
            }, 500); // Small delay to show the loading state
          }
          
          function deny() {
            const authUrl = '${process.env.FRONTEND_URL || 'http://localhost:3002'}/dashboard?oauth_error=access_denied&state=${state}&client_id=${client_id}';
            window.location.href = authUrl;
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    return res.redirect(`${frontendUrl}/dashboard?oauth_error=missing_parameters&state=${state}`);
  }
  
  try {
    // Generate access token
    const tokenData = generateAccessToken(client_id.toString(), scope.toString());
    
    // Redirect back to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const redirectUrl = `${frontendUrl}/dashboard?oauth_success=true&access_token=${tokenData.access_token}&token_type=${tokenData.token_type}&expires_in=${tokenData.expires_in}&scope=${encodeURIComponent(tokenData.scope)}&state=${state}&client_id=${client_id}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    res.redirect(`${frontendUrl}/dashboard?oauth_error=token_generation_failed&state=${state}&client_id=${client_id}`);
  }
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
    if (process.env.DATABASE_URL) {
      await mongoose.connect(process.env.DATABASE_URL);
      console.log('✅ Connected to MongoDB');
    } else {
      console.log('⚠️ No DATABASE_URL provided, running without database');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

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