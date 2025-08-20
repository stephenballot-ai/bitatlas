// Re-export MCP protocol types for backend use
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
  RATE_LIMITED = 'ERR_RATE_LIMITED',
  FILE_TOO_LARGE = 'ERR_FILE_TOO_LARGE',
  STORAGE_FULL = 'ERR_STORAGE_FULL',
  INSUFFICIENT_PERMISSIONS = 'ERR_INSUFFICIENT_PERMISSIONS'
}