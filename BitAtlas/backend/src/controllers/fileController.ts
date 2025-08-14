import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { McpOrchestrator } from '../services/mcpOrchestrator';

export class FileController {
  private mcpOrchestrator: McpOrchestrator;

  constructor() {
    this.mcpOrchestrator = new McpOrchestrator();
  }

  createFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, content, path, folderId, metadata } = req.body;

      if (!name) {
        res.status(400).json({
          error: 'File name is required',
          code: 'ERR_MISSING_NAME'
        });
        return;
      }

      const result = await this.mcpOrchestrator.call('file.create', {
        name,
        content,
        path,
        folderId,
        metadata
      }, {
        userId: req.user.userId,
        scopes: req.user.scopes
      });

      res.status(201).json({
        message: 'File created successfully',
        file: result
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'File creation failed',
        code: 'ERR_FILE_CREATE_FAILED'
      });
    }
  };

  getFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { preview } = req.query;

      const result = await this.mcpOrchestrator.call('file.read', {
        fileId: id,
        preview: preview === 'true'
      }, {
        userId: req.user.userId,
        scopes: req.user.scopes
      });

      res.json({
        file: result
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'File not found',
          code: 'ERR_FILE_NOT_FOUND'
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'File retrieval failed',
          code: 'ERR_FILE_READ_FAILED'
        });
      }
    }
  };

  updateFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, path, metadata } = req.body;

      const result = await this.mcpOrchestrator.call('file.update', {
        fileId: id,
        name,
        path,
        metadata
      }, {
        userId: req.user.userId,
        scopes: req.user.scopes
      });

      res.json({
        message: 'File updated successfully',
        file: result
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'File not found',
          code: 'ERR_FILE_NOT_FOUND'
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'File update failed',
          code: 'ERR_FILE_UPDATE_FAILED'
        });
      }
    }
  };

  deleteFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.mcpOrchestrator.call('file.delete', {
        fileId: id
      }, {
        userId: req.user.userId,
        scopes: req.user.scopes
      });

      res.json({
        message: 'File deleted successfully',
        result
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'File not found',
          code: 'ERR_FILE_NOT_FOUND'
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'File deletion failed',
          code: 'ERR_FILE_DELETE_FAILED'
        });
      }
    }
  };

  listFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { path = '/', page = '1', pageSize = '20' } = req.query;

      const result = await this.mcpOrchestrator.call('file.list', {
        path: path as string,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      }, {
        userId: req.user.userId,
        scopes: req.user.scopes
      });

      res.json({
        message: 'Files retrieved successfully',
        ...result
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'File listing failed',
        code: 'ERR_FILE_LIST_FAILED'
      });
    }
  };

  searchFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { q: query, page = '1', pageSize = '20' } = req.query;

      if (!query) {
        res.status(400).json({
          error: 'Search query is required',
          code: 'ERR_MISSING_QUERY'
        });
        return;
      }

      const result = await this.mcpOrchestrator.call('search.files', {
        query: query as string,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string)
      }, {
        userId: req.user.userId,
        scopes: req.user.scopes
      });

      res.json({
        message: 'Search completed successfully',
        ...result
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Search failed',
        code: 'ERR_SEARCH_FAILED'
      });
    }
  };
}