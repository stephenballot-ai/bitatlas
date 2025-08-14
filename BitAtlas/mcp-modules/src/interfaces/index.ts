/**
 * MCP Protocol Interface Definitions for BitAtlas
 */

import type {
  MCPRequest,
  MCPResponse,
  MCPError,
  User,
  Session,
  AuthCredentials,
  AuthToken,
  FileMetadata,
  FileContent,
  SearchQuery,
  SearchResult,
  WSConnection,
  WSMessage,
} from '../types/index.js';

// Core MCP Protocol Interface
export interface MCPProtocol {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Request/Response handling
  request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<MCPResponse<T>>;
  notify(method: string, params?: Record<string, unknown>): Promise<void>;
  
  // Event handling
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  emit(event: string, data: unknown): void;
}

// Authentication Interface
export interface AuthenticationProvider {
  // Login methods
  login(credentials: AuthCredentials): Promise<{ user: User; session: Session }>;
  logout(token: string): Promise<void>;
  refresh(refreshToken: string): Promise<AuthToken>;
  
  // Token validation
  validateToken(token: string): Promise<User>;
  revokeToken(token: string): Promise<void>;
  
  // User management
  getCurrentUser(token: string): Promise<User>;
  updateUser(token: string, updates: Partial<User>): Promise<User>;
}

// File Operations Interface
export interface FileOperations {
  // CRUD operations
  create(path: string, content: string, options?: FileCreateOptions): Promise<FileMetadata>;
  read(path: string, options?: FileReadOptions): Promise<FileContent>;
  update(path: string, content: string, options?: FileUpdateOptions): Promise<FileMetadata>;
  delete(path: string, options?: FileDeleteOptions): Promise<void>;
  
  // Directory operations
  list(path: string, options?: FileListOptions): Promise<FileMetadata[]>;
  createDirectory(path: string, options?: DirectoryCreateOptions): Promise<FileMetadata>;
  
  // File metadata
  stat(path: string): Promise<FileMetadata>;
  exists(path: string): Promise<boolean>;
  
  // File operations
  copy(sourcePath: string, destinationPath: string, options?: FileCopyOptions): Promise<FileMetadata>;
  move(sourcePath: string, destinationPath: string, options?: FileMoveOptions): Promise<FileMetadata>;
  
  // Permissions
  chmod(path: string, permissions: string | number): Promise<FileMetadata>;
  chown(path: string, owner: string, group?: string): Promise<FileMetadata>;
}

// Search Interface
export interface SearchProvider {
  // Text search
  search(query: SearchQuery): Promise<SearchResult>;
  searchContent(query: string, options?: ContentSearchOptions): Promise<SearchResult>;
  searchFiles(pattern: string, options?: FileSearchOptions): Promise<SearchResult>;
  
  // Advanced search
  searchByTags(tags: string[], options?: TagSearchOptions): Promise<SearchResult>;
  searchByDate(dateRange: DateRange, options?: DateSearchOptions): Promise<SearchResult>;
  
  // Index management
  indexFile(path: string): Promise<void>;
  removeFromIndex(path: string): Promise<void>;
  reindex(): Promise<void>;
  getIndexStatus(): Promise<IndexStatus>;
}

// WebSocket Interface
export interface WebSocketHandler {
  // Connection management
  handleConnection(connection: WSConnection): Promise<void>;
  handleDisconnection(connectionId: string): Promise<void>;
  
  // Message handling
  handleMessage(message: WSMessage): Promise<void>;
  broadcast(message: WSMessage, filter?: (connection: WSConnection) => boolean): Promise<void>;
  send(connectionId: string, message: WSMessage): Promise<void>;
  
  // Connection queries
  getConnection(connectionId: string): Promise<WSConnection | null>;
  getConnections(filter?: (connection: WSConnection) => boolean): Promise<WSConnection[]>;
  getActiveConnections(): Promise<WSConnection[]>;
}

// Error Handling Interface
export interface ErrorHandler {
  handleError(error: Error, context?: Record<string, unknown>): MCPError;
  isRetryableError(error: MCPError): boolean;
  shouldLog(error: MCPError): boolean;
  formatError(error: MCPError): string;
}

// Logging Interface
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  
  // Structured logging
  logRequest(request: MCPRequest): void;
  logResponse(response: MCPResponse): void;
  logError(error: MCPError): void;
}

// Configuration Interface
export interface Configuration {
  // Server configuration
  server: {
    host: string;
    port: number;
    ssl: boolean;
    maxConnections: number;
    timeout: number;
  };
  
  // Authentication configuration
  auth: {
    secret: string;
    tokenExpiry: number;
    refreshTokenExpiry: number;
    providers: string[];
  };
  
  // File system configuration
  fileSystem: {
    rootPath: string;
    maxFileSize: number;
    allowedExtensions: string[];
    indexingEnabled: boolean;
  };
  
  // Search configuration
  search: {
    indexPath: string;
    maxResults: number;
    highlightEnabled: boolean;
  };
  
  // WebSocket configuration
  websocket: {
    pingInterval: number;
    maxMessageSize: number;
    compression: boolean;
  };
  
  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file';
    filename?: string;
  };
}

// Supporting types and options
export interface FileCreateOptions {
  encoding?: 'utf8' | 'base64';
  overwrite?: boolean;
  permissions?: string;
}

export interface FileReadOptions {
  encoding?: 'utf8' | 'base64' | 'binary';
  offset?: number;
  length?: number;
}

export interface FileUpdateOptions {
  encoding?: 'utf8' | 'base64';
  createIfNotExists?: boolean;
}

export interface FileDeleteOptions {
  recursive?: boolean;
  force?: boolean;
}

export interface FileListOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  sortBy?: 'name' | 'size' | 'modified';
  sortOrder?: 'asc' | 'desc';
}

export interface DirectoryCreateOptions {
  recursive?: boolean;
  permissions?: string;
}

export interface FileCopyOptions {
  overwrite?: boolean;
  preservePermissions?: boolean;
}

export interface FileMoveOptions {
  overwrite?: boolean;
}

export interface ContentSearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  maxMatches?: number;
}

export interface FileSearchOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  fileTypes?: string[];
}

export interface TagSearchOptions {
  operator?: 'and' | 'or';
  includeSubtags?: boolean;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface DateSearchOptions {
  field?: 'created' | 'modified' | 'accessed';
}

export interface IndexStatus {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  lastUpdated: string;
  isHealthy: boolean;
}