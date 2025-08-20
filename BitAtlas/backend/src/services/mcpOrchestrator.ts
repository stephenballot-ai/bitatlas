import { McpRequest, McpResponse, McpErrorCode } from '../types/mcpProtocol';
import { db } from '../database/connection';

export interface McpCallOptions {
  userId: string;
  clientId?: string;
  scopes?: string[];
}

export interface FileOperationResult {
  fileId?: string;
  name?: string;
  path?: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
  content?: string;
}

export interface SearchResult {
  results: FileOperationResult[];
  total: number;
  page: number;
  pageSize: number;
}

export class McpOrchestrator {
  constructor() {}

  async call(method: string, params: any, options?: McpCallOptions): Promise<any> {
    const request: McpRequest = {
      version: '1.0',
      id: this.generateRequestId(),
      method,
      params
    };

    try {
      switch (method) {
        case 'file.create':
          return this.handleFileCreate(request.params, options);
        case 'file.read':
          return this.handleFileRead(request.params, options);
        case 'file.update':
          return this.handleFileUpdate(request.params, options);
        case 'file.delete':
          return this.handleFileDelete(request.params, options);
        case 'file.list':
          return this.handleFileList(request.params, options);
        case 'search.files':
          return this.handleSearchFiles(request.params, options);
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      const response: McpResponse = {
        version: request.version,
        id: request.id,
        error: {
          code: error.name === 'ValidationError' ? McpErrorCode.INVALID_REQUEST : McpErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: { method, params }
        }
      };
      throw response.error;
    }
  }

  private async handleFileCreate(params: any, options?: McpCallOptions): Promise<FileOperationResult> {
    if (!params.name) {
      throw new Error('File name is required');
    }

    if (!options?.userId) {
      throw new Error('User ID is required');
    }

    const path = params.path || '/';
    let size = 0;
    let storageKey = `${options.userId}/${Date.now()}-${params.name}`;

    // Handle file content
    if (params.content) {
      if (typeof params.content === 'string') {
        // Assume base64 encoded content from file upload
        try {
          const buffer = Buffer.from(params.content, 'base64');
          size = buffer.length;
          
          // Store the actual file content (in Phase 2, we store in uploads directory)
          const fs = require('fs');
          const uploadPath = `./uploads/${storageKey}`;
          
          // Ensure uploads directory exists
          const uploadDir = './uploads';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          fs.writeFileSync(uploadPath, buffer);
        } catch (error) {
          throw new Error('Invalid file content encoding');
        }
      } else {
        size = Buffer.byteLength(params.content, 'utf8');
      }
    }

    const mimeType = this.detectMimeType(params.name);

    const result = await db.query(`
      INSERT INTO files (user_id, name, path, size, mime_type, metadata, storage_provider, storage_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, path, size, mime_type, created_at
    `, [
      options.userId,
      params.name,
      path,
      size,
      mimeType,
      params.metadata || {},
      'local',
      storageKey
    ]);

    const file = result.rows[0];

    return {
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.created_at.toISOString()
    };
  }

  private async handleFileRead(params: any, options?: McpCallOptions): Promise<FileOperationResult> {
    if (!params.fileId) {
      throw new Error('File ID is required');
    }

    if (!options?.userId) {
      throw new Error('User ID is required');
    }

    const result = await db.query(`
      SELECT id, name, path, size, mime_type, created_at, updated_at, storage_key
      FROM files 
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    `, [params.fileId, options.userId]);

    if (result.rows.length === 0) {
      throw new Error('File not found');
    }

    const file = result.rows[0];

    // Read actual file content if requested
    let content = '';
    if (params.preview || params.download) {
      try {
        const fs = require('fs');
        const uploadPath = `./uploads/${file.storage_key}`;
        
        if (fs.existsSync(uploadPath)) {
          if (file.mime_type?.startsWith('text/') || params.preview) {
            // For text files or preview, return as text
            const buffer = fs.readFileSync(uploadPath);
            if (file.mime_type?.startsWith('text/')) {
              content = buffer.toString('utf8');
            } else {
              // For binary files in preview, return base64
              content = buffer.toString('base64');
            }
          } else if (params.download) {
            // For download, return base64 encoded
            const buffer = fs.readFileSync(uploadPath);
            content = buffer.toString('base64');
          }
        } else {
          content = `File not found in storage: ${file.name}`;
        }
      } catch (error) {
        content = `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return {
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.created_at.toISOString(),
      content: content || undefined
    };
  }

  private async handleFileUpdate(params: any, options?: McpCallOptions): Promise<FileOperationResult> {
    if (!params.fileId) {
      throw new Error('File ID is required');
    }

    if (!options?.userId) {
      throw new Error('User ID is required');
    }

    const updates: string[] = [];
    const values: any[] = [params.fileId, options.userId];
    let paramIndex = 3;

    if (params.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(params.name);
    }

    if (params.path) {
      updates.push(`path = $${paramIndex++}`);
      values.push(params.path);
    }

    if (params.metadata) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(params.metadata);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Only updated_at
      throw new Error('No fields to update');
    }

    const result = await db.query(`
      UPDATE files 
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id, name, path, size, mime_type, updated_at
    `, values);

    if (result.rows.length === 0) {
      throw new Error('File not found or update failed');
    }

    const file = result.rows[0];

    return {
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.updated_at.toISOString()
    };
  }

  private async handleFileDelete(params: any, options?: McpCallOptions): Promise<{ success: boolean; fileId: string }> {
    if (!params.fileId) {
      throw new Error('File ID is required');
    }

    if (!options?.userId) {
      throw new Error('User ID is required');
    }

    // Soft delete - set deleted_at timestamp
    const result = await db.query(`
      UPDATE files 
      SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [params.fileId, options.userId]);

    if (result.rows.length === 0) {
      throw new Error('File not found');
    }

    return {
      success: true,
      fileId: params.fileId
    };
  }

  private async handleFileList(params: any, options?: McpCallOptions): Promise<SearchResult> {
    if (!options?.userId) {
      throw new Error('User ID is required');
    }

    const path = params.path || '/';
    const page = Math.max(1, parseInt(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM files 
      WHERE user_id = $1 AND path = $2 AND deleted_at IS NULL
    `, [options.userId, path]);

    const total = parseInt(countResult.rows[0].total);

    // Get files
    const filesResult = await db.query(`
      SELECT id, name, path, size, mime_type, created_at, updated_at
      FROM files 
      WHERE user_id = $1 AND path = $2 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `, [options.userId, path, pageSize, offset]);

    const results = filesResult.rows.map(file => ({
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.created_at.toISOString()
    }));

    return {
      results,
      total,
      page,
      pageSize
    };
  }

  private async handleSearchFiles(params: any, options?: McpCallOptions): Promise<SearchResult> {
    if (!params.query) {
      throw new Error('Search query is required');
    }

    if (!options?.userId) {
      throw new Error('User ID is required');
    }

    const page = Math.max(1, parseInt(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    // Use PostgreSQL full-text search
    const searchQuery = params.query.split(' ').join(' & ');

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total 
      FROM files 
      WHERE user_id = $1 
        AND deleted_at IS NULL
        AND (
          search_vector @@ to_tsquery('english', $2)
          OR name ILIKE $3
          OR path ILIKE $3
        )
    `, [options.userId, searchQuery, `%${params.query}%`]);

    const total = parseInt(countResult.rows[0].total);

    // Get files with relevance ranking
    const filesResult = await db.query(`
      SELECT 
        id, name, path, size, mime_type, created_at,
        ts_rank(search_vector, to_tsquery('english', $2)) as rank
      FROM files 
      WHERE user_id = $1 
        AND deleted_at IS NULL
        AND (
          search_vector @@ to_tsquery('english', $2)
          OR name ILIKE $3
          OR path ILIKE $3
        )
      ORDER BY rank DESC, created_at DESC
      LIMIT $4 OFFSET $5
    `, [options.userId, searchQuery, `%${params.query}%`, pageSize, offset]);

    const results = filesResult.rows.map(file => ({
      fileId: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      mimeType: file.mime_type,
      createdAt: file.created_at.toISOString()
    }));

    return {
      results,
      total,
      page,
      pageSize
    };
  }

  private detectMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'text/javascript',
      'ts': 'text/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}