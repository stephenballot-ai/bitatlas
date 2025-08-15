// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  code?: string;
  data?: T;
}

// User types
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// File types
export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface FileContent extends FileMetadata {
  content?: string;
}

export interface CreateFileRequest {
  name: string;
  content?: string;
  path?: string;
  metadata?: Record<string, any>;
}

export interface UpdateFileRequest {
  name?: string;
  path?: string;
  metadata?: Record<string, any>;
}

export interface FileListResponse {
  message: string;
  files: FileMetadata[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchFilesResponse extends FileListResponse {}

// Upload types
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// UI State types
export interface ViewMode {
  type: 'grid' | 'list';
  size: 'small' | 'medium' | 'large';
}

export interface SortOptions {
  field: 'name' | 'size' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  mimeTypes: string[];
  sizeLimits: {
    min?: number;
    max?: number;
  };
  dateRange: {
    from?: string;
    to?: string;
  };
}

// Navigation types
export interface BreadcrumbItem {
  name: string;
  path: string;
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// Toast notification types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// MCP types
export interface McpTool {
  name: string;
  description: string;
  enabled: boolean;
  inputSchema?: any;
}

export interface McpToolsResponse {
  tools: McpTool[];
  version: string;
  userScopes: string[];
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultViewMode: ViewMode;
  defaultSortOptions: SortOptions;
  autoUpload: boolean;
  showHiddenFiles: boolean;
}