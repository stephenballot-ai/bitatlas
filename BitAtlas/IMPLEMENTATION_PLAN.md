# BitAtlas Implementation Plan - Dual Experience Platform

## Overview

BitAtlas provides two distinct user experiences:
1. **🌐 Standalone Website (bitatlas.com)** - Traditional cloud storage interface
2. **🔌 MCP Integration Experience** - OAuth-secured API for AI assistant integration

---

## Phase 1: Foundation (Weeks 1-3)

### 1.1 Core Infrastructure

**Database Setup**
```sql
-- PostgreSQL schemas
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  account_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_login_attempt TIMESTAMP
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  storage_provider VARCHAR(50),
  storage_key TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  search_vector tsvector
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR(255) NOT NULL,
  access_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  scopes TEXT[],
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Redis Configuration**
```bash
# Session management & rate limiting
redis-server /etc/redis/redis.conf
# Configure for EU data residency
```

### 1.2 MCP Protocol Foundation

**Core MCP Types**
```typescript
// /mcp-modules/src/types/mcpProtocol.ts
export interface McpRequest {
  version: string;
  id: string;
  method: string;
  params: Record<string, any>;
}

export interface McpResponse {
  version: string;
  id: string;
  result?: any;
  error?: McpError;
}

export interface McpError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export enum McpErrorCode {
  UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  NOT_FOUND = 'ERR_NOT_FOUND',
  INVALID_REQUEST = 'ERR_INVALID_REQUEST',
  INTERNAL_ERROR = 'ERR_INTERNAL_ERROR',
  RATE_LIMITED = 'ERR_RATE_LIMITED'
}
```

**Authentication Service**
```typescript
// /backend/src/services/authService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  async hashPassword(password: string): Promise<{hash: string, salt: string}> {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateJWT(userId: string, scopes?: string[]): string {
    return jwt.sign(
      { userId, scopes: scopes || [] },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
```

### 1.3 Backend API Structure

**File Controller**
```typescript
// /backend/src/controllers/fileController.ts
import { McpOrchestrator } from '../services/mcpOrchestrator';

export class FileController {
  constructor(private mcpOrchestrator: McpOrchestrator) {}

  async createFile(req: Request, res: Response) {
    try {
      const result = await this.mcpOrchestrator.call('file.create', {
        userId: req.user.id,
        name: req.body.name,
        content: req.file?.buffer || req.body.content
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async readFile(req: Request, res: Response) {
    const result = await this.mcpOrchestrator.call('file.read', {
      userId: req.user.id,
      fileId: req.params.id
    });
    res.json(result);
  }

  async updateFile(req: Request, res: Response) {
    const result = await this.mcpOrchestrator.call('file.update', {
      userId: req.user.id,
      fileId: req.params.id,
      updates: req.body
    });
    res.json(result);
  }

  async deleteFile(req: Request, res: Response) {
    const result = await this.mcpOrchestrator.call('file.delete', {
      userId: req.user.id,
      fileId: req.params.id
    });
    res.json(result);
  }
}
```

---

## Phase 2: Web Experience (Weeks 4-6)

### 2.1 React Frontend Structure

**File Explorer Component**
```tsx
// /frontend/src/components/files/FileExplorer.tsx
import React, { useState, useEffect } from 'react';
import { useFiles } from '../../hooks/useFiles';

export const FileExplorer: React.FC = () => {
  const { files, loading, uploadFile, createFolder, deleteFile } = useFiles();
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  return (
    <div className="file-explorer">
      <div className="toolbar">
        <button onClick={() => createFolder('New Folder')}>
          Create Folder
        </button>
        <input
          type="file"
          multiple
          onChange={(e) => {
            Array.from(e.target.files || []).forEach(uploadFile);
          }}
        />
      </div>
      
      <div className="file-grid">
        {files.map(file => (
          <FileItem
            key={file.id}
            file={file}
            selected={selectedFiles.includes(file.id)}
            onSelect={(id) => setSelectedFiles(prev => 
              prev.includes(id) 
                ? prev.filter(f => f !== id)
                : [...prev, id]
            )}
            onDelete={() => deleteFile(file.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

**Custom Hooks**
```typescript
// /frontend/src/hooks/useFiles.ts
import { useState, useEffect } from 'react';
import { fileService } from '../services/fileService';

export const useFiles = (path = '/') => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await fileService.listFiles(path);
      setFiles(result.data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    
    await fileService.uploadFile(formData);
    loadFiles(); // Refresh file list
  };

  const createFolder = async (name: string) => {
    await fileService.createFolder({ name, path });
    loadFiles();
  };

  const deleteFile = async (fileId: string) => {
    await fileService.deleteFile(fileId);
    loadFiles();
  };

  useEffect(() => {
    loadFiles();
  }, [path]);

  return { files, loading, uploadFile, createFolder, deleteFile };
};
```

### 2.2 File Operations

**File Service**
```typescript
// /frontend/src/services/fileService.ts
class FileService {
  private baseURL = '/api/v1';

  async listFiles(path: string = '/') {
    const response = await fetch(`${this.baseURL}/files?path=${encodeURIComponent(path)}`, {
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  async uploadFile(formData: FormData) {
    const response = await fetch(`${this.baseURL}/files`, {
      method: 'POST',
      body: formData,
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  async createFolder(data: { name: string; path: string }) {
    const response = await fetch(`${this.baseURL}/folders`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async deleteFile(fileId: string) {
    const response = await fetch(`${this.baseURL}/files/${fileId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  async searchFiles(query: string, filters?: any) {
    const params = new URLSearchParams({ q: query, ...filters });
    const response = await fetch(`${this.baseURL}/search?${params}`, {
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export const fileService = new FileService();
```

---

## Phase 3: MCP Integration Experience (Weeks 7-9)

### 3.1 OAuth Implementation

**OAuth Controller**
```typescript
// /backend/src/controllers/oauthController.ts
export class OAuthController {
  async authorize(req: Request, res: Response) {
    const { client_id, redirect_uri, scope, state } = req.query;
    
    // Validate client and redirect URI
    const client = await this.validateClient(client_id as string);
    if (!client) {
      return res.status(400).json({ error: 'invalid_client' });
    }

    // Generate authorization code
    const authCode = crypto.randomBytes(32).toString('hex');
    await this.storeAuthorizationCode(authCode, {
      userId: req.user.id,
      clientId: client_id,
      scopes: (scope as string).split(' '),
      redirectUri: redirect_uri,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    const redirectUrl = `${redirect_uri}?code=${authCode}&state=${state}`;
    res.redirect(redirectUrl);
  }

  async token(req: Request, res: Response) {
    const { grant_type, code, client_id, client_secret } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    // Validate authorization code
    const authData = await this.validateAuthorizationCode(code);
    if (!authData) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      { 
        userId: authData.userId,
        clientId: client_id,
        scopes: authData.scopes
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');

    await this.storeOAuthToken({
      userId: authData.userId,
      clientId: client_id,
      accessToken,
      refreshToken,
      scopes: authData.scopes,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authData.scopes.join(' ')
    });
  }
}
```

### 3.2 MCP Server Implementation

**MCP Server**
```typescript
// /mcp-modules/src/server/mcpServer.ts
import { McpRequest, McpResponse, McpErrorCode } from '../types/mcpProtocol';

export class McpServer {
  private tools: Map<string, Function> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools() {
    this.tools.set('searchFiles', this.searchFiles.bind(this));
    this.tools.set('readFile', this.readFile.bind(this));
    this.tools.set('createFile', this.createFile.bind(this));
    this.tools.set('updateFile', this.updateFile.bind(this));
    this.tools.set('deleteFile', this.deleteFile.bind(this));
  }

  async handleRequest(request: McpRequest, authContext: any): Promise<McpResponse> {
    try {
      // Validate OAuth scopes
      await this.validateScopes(request.method, authContext.scopes);

      const tool = this.tools.get(request.method);
      if (!tool) {
        return {
          version: request.version,
          id: request.id,
          error: {
            code: McpErrorCode.INVALID_REQUEST,
            message: `Unknown method: ${request.method}`
          }
        };
      }

      const result = await tool(request.params, authContext);
      
      return {
        version: request.version,
        id: request.id,
        result
      };

    } catch (error) {
      return {
        version: request.version,
        id: request.id,
        error: {
          code: McpErrorCode.INTERNAL_ERROR,
          message: error.message
        }
      };
    }
  }

  private async searchFiles(params: any, authContext: any) {
    const { query, fileType, limit = 20 } = params;
    
    // Call database search with user context
    const files = await this.fileService.search({
      userId: authContext.userId,
      query,
      fileType,
      limit
    });

    return {
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        mimeType: f.mime_type,
        createdAt: f.created_at
      }))
    };
  }

  private async readFile(params: any, authContext: any) {
    const { fileId } = params;
    
    const file = await this.fileService.getFile({
      id: fileId,
      userId: authContext.userId
    });

    if (!file) {
      throw new Error('File not found');
    }

    const content = await this.storageService.getFileContent(file.storage_key);
    
    return {
      id: file.id,
      name: file.name,
      content: content.toString(),
      mimeType: file.mime_type
    };
  }

  private async createFile(params: any, authContext: any) {
    const { name, content, path = '/' } = params;
    
    const file = await this.fileService.createFile({
      userId: authContext.userId,
      name,
      content,
      path
    });

    return {
      id: file.id,
      name: file.name,
      path: file.path,
      createdAt: file.created_at
    };
  }

  private async validateScopes(method: string, userScopes: string[]) {
    const requiredScopes = {
      'searchFiles': ['files:read'],
      'readFile': ['files:read'],
      'createFile': ['files:write'],
      'updateFile': ['files:write'],
      'deleteFile': ['files:delete']
    };

    const required = requiredScopes[method] || [];
    const hasPermission = required.every(scope => userScopes.includes(scope));

    if (!hasPermission) {
      throw new Error('Insufficient permissions');
    }
  }
}
```

### 3.3 MCP Tools Definition

**Tool Definitions for AI Assistants**
```json
{
  "tools": [
    {
      "name": "searchFiles",
      "description": "Search through the user's files by name, content, or metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Search query (can include file names, content, or metadata)"
          },
          "fileType": {
            "type": "string",
            "description": "Filter by file type (e.g., 'image', 'document', 'code')",
            "enum": ["image", "document", "code", "audio", "video", "archive"]
          },
          "limit": {
            "type": "number",
            "description": "Maximum number of results to return",
            "default": 20,
            "maximum": 100
          }
        },
        "required": ["query"]
      }
    },
    {
      "name": "readFile",
      "description": "Read the content of a specific file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string",
            "description": "The unique identifier of the file to read"
          }
        },
        "required": ["fileId"]
      }
    },
    {
      "name": "createFile",
      "description": "Create a new file with specified content",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the file to create"
          },
          "content": {
            "type": "string",
            "description": "Content of the file"
          },
          "path": {
            "type": "string",
            "description": "Directory path where to create the file",
            "default": "/"
          }
        },
        "required": ["name", "content"]
      }
    },
    {
      "name": "updateFile",
      "description": "Update an existing file's content or metadata",
      "inputSchema": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string",
            "description": "The unique identifier of the file to update"
          },
          "content": {
            "type": "string",
            "description": "New content for the file"
          },
          "name": {
            "type": "string",
            "description": "New name for the file"
          }
        },
        "required": ["fileId"]
      }
    },
    {
      "name": "deleteFile",
      "description": "Delete a file (soft delete with recovery option)",
      "inputSchema": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string",
            "description": "The unique identifier of the file to delete"
          }
        },
        "required": ["fileId"]
      }
    }
  ]
}
```

---

## Phase 4: Advanced Features (Weeks 10-12)

### 4.1 European Cloud Storage Integration

**Storage Orchestrator**
```typescript
// /mcp-modules/src/storage/storageOrchestrator.ts
import { OvhStorage } from './providers/ovhStorage';
import { ScalewayStorage } from './providers/scalewayStorage';
import { HetznerStorage } from './providers/hetznerStorage';

export class StorageOrchestrator {
  private providers: Map<string, any> = new Map();

  constructor() {
    this.providers.set('ovh', new OvhStorage());
    this.providers.set('scaleway', new ScalewayStorage());
    this.providers.set('hetzner', new HetznerStorage());
  }

  async uploadFile(file: Buffer, options: {
    provider: string;
    key: string;
    metadata?: any;
  }) {
    const provider = this.providers.get(options.provider);
    if (!provider) {
      throw new Error(`Unknown storage provider: ${options.provider}`);
    }

    // Encrypt file before upload
    const encryptedFile = await this.encryptFile(file);
    
    return provider.upload(encryptedFile, {
      key: options.key,
      metadata: options.metadata,
      encryption: 'AES-256-GCM'
    });
  }

  async getFile(provider: string, key: string) {
    const storageProvider = this.providers.get(provider);
    const encryptedFile = await storageProvider.download(key);
    
    // Decrypt file after download
    return this.decryptFile(encryptedFile);
  }

  private async encryptFile(file: Buffer): Promise<Buffer> {
    // Implement AES-256-GCM encryption
    // Use European-generated encryption keys
    return file; // Placeholder
  }

  private async decryptFile(encryptedFile: Buffer): Promise<Buffer> {
    // Implement AES-256-GCM decryption
    return encryptedFile; // Placeholder
  }
}
```

### 4.2 GDPR Compliance Module

**GDPR Service**
```typescript
// /mcp-modules/src/gdpr/gdprService.ts
export class GdprService {
  async exportUserData(userId: string): Promise<any> {
    const userData = await this.collectUserData(userId);
    
    return {
      exportDate: new Date().toISOString(),
      userId,
      profile: userData.profile,
      files: userData.files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        createdAt: f.created_at,
        // Exclude storage keys and internal metadata
      })),
      sessions: userData.sessions.map(s => ({
        deviceInfo: s.device_info,
        createdAt: s.created_at,
        lastUsed: s.last_used
      })),
      auditLog: userData.auditLog
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // 1. Delete all files from storage providers
    const userFiles = await this.fileService.getUserFiles(userId);
    for (const file of userFiles) {
      await this.storageOrchestrator.deleteFile(file.storage_provider, file.storage_key);
    }

    // 2. Delete database records
    await this.db.transaction(async (trx) => {
      await trx('oauth_tokens').where('user_id', userId).del();
      await trx('sessions').where('user_id', userId).del();
      await trx('files').where('user_id', userId).del();
      await trx('users').where('id', userId).del();
    });

    // 3. Log deletion for compliance
    await this.auditService.log({
      action: 'USER_DATA_DELETED',
      userId,
      timestamp: new Date(),
      details: 'Complete user data deletion per GDPR request'
    });
  }

  async generateAuditTrail(userId: string): Promise<any> {
    return this.auditService.getUserAuditTrail(userId);
  }
}
```

---

## Deployment Configuration

### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: bitatlas
      POSTGRES_USER: bitatlas
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://bitatlas:password@postgres:5432/bitatlas
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-jwt-secret-here
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

### Production Deployment (Hetzner)
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitatlas-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bitatlas-backend
  template:
    metadata:
      labels:
        app: bitatlas-backend
    spec:
      containers:
      - name: backend
        image: bitatlas/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: bitatlas-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: bitatlas-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Success Metrics & Monitoring

### Key Performance Indicators
```typescript
// Metrics to track
export const KPIs = {
  webExperience: {
    uploadSpeed: 'avg_upload_speed_mbps',
    searchLatency: 'search_response_time_ms',
    userEngagement: 'daily_active_users',
    featureAdoption: 'feature_usage_rate'
  },
  mcpExperience: {
    oauthConversion: 'oauth_completion_rate',
    apiSuccessRate: 'api_request_success_rate',
    aiIntegrationUsage: 'mcp_calls_per_day',
    scopeUtilization: 'permission_scope_usage'
  },
  infrastructure: {
    uptime: 'service_availability',
    dataResidency: 'eu_data_compliance',
    security: 'security_incidents_count',
    performance: 'p95_response_time_ms'
  }
};
```

### Monitoring Dashboard
```typescript
// Prometheus metrics collection
export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code']
  }),
  
  mcpCallsTotal: new Counter({
    name: 'mcp_calls_total',
    help: 'Total number of MCP calls',
    labelNames: ['method', 'client_id', 'status']
  }),

  fileOperationsTotal: new Counter({
    name: 'file_operations_total',
    help: 'Total file operations',
    labelNames: ['operation', 'user_id', 'status']
  }),

  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Number of currently active users'
  })
};
```

---

## Testing Strategy

### Test Structure
```bash
# Test organization
tests/
├── unit/
│   ├── services/
│   ├── controllers/
│   └── mcp-modules/
├── integration/
│   ├── api/
│   ├── oauth/
│   └── mcp/
├── e2e/
│   ├── web-interface/
│   └── mcp-integration/
└── performance/
    ├── load-testing/
    └── security/
```

### Key Test Cases
```typescript
// Critical test scenarios
describe('MCP Integration', () => {
  test('OAuth flow completes successfully', async () => {
    // Test complete OAuth authorization flow
  });

  test('AI assistant can search user files', async () => {
    // Test MCP search functionality
  });

  test('File permissions are enforced', async () => {
    // Test scope-based access control
  });
});

describe('GDPR Compliance', () => {
  test('User data export is complete', async () => {
    // Verify all user data is included in export
  });

  test('Data deletion removes all traces', async () => {
    // Verify complete data deletion
  });
});
```

---

This implementation plan provides a complete roadmap for building BitAtlas with both web and MCP experiences while maintaining European data sovereignty and GDPR compliance.