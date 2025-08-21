import {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  FileMetadata,
  FileContent,
  CreateFileRequest,
  UpdateFileRequest,
  FileListResponse,
  SearchFilesResponse,
  McpToolsResponse
} from '../types';

class ApiService {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.accessToken = localStorage.getItem('accessToken');
  }

  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Request failed: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Use default error message if JSON parsing fails
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Auth methods
  async register(data: RegisterRequest): Promise<{ user: User }> {
    const result = await this.request<{ user: User }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return result;
  }

  async login(data: LoginRequest): Promise<AuthTokens> {
    const result = await this.request<AuthTokens>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store tokens
    this.accessToken = result.accessToken;
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);

    return result;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await this.request('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }

    // Clear tokens
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request('/api/auth/profile');
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const result = await this.request<AuthTokens>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    // Update stored tokens
    this.accessToken = result.accessToken;
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);

    return result;
  }

  // File methods
  async listFiles(params: {
    path?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<FileListResponse> {
    const searchParams = new URLSearchParams();
    if (params.path) searchParams.set('path', params.path);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const query = searchParams.toString();
    return this.request(`/api/files${query ? `?${query}` : ''}`);
  }

  async getFile(fileId: string, preview = false): Promise<{ file: FileContent }> {
    const params = preview ? '?preview=true' : '';
    return this.request(`/api/files/${fileId}${params}`);
  }

  async createFile(data: CreateFileRequest): Promise<{ file: FileMetadata }> {
    return this.request('/api/files', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFile(
    fileId: string,
    data: UpdateFileRequest
  ): Promise<{ file: FileMetadata }> {
    return this.request(`/api/files/${fileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFile(fileId: string): Promise<{ success: boolean }> {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async searchFiles(params: {
    query: string;
    page?: number;
    pageSize?: number;
  }): Promise<SearchFilesResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.query);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    return this.request(`/api/files/search/query?${searchParams}`);
  }

  async uploadFile(
    file: File,
    path = '/'
  ): Promise<{ file: FileMetadata }> {
    // For now, we'll read the file and send as JSON
    // In a real implementation, you might use FormData for binary uploads
    const content = await this.readFileAsText(file);
    
    return this.createFile({
      name: file.name,
      content,
      path,
      metadata: {
        originalSize: file.size,
        lastModified: new Date(file.lastModified).toISOString(),
      },
    });
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  // MCP methods
  async getMcpTools(): Promise<McpToolsResponse> {
    return this.request('/api/v1/mcp/tools');
  }

  async callMcpMethod(method: string, params: any = {}): Promise<any> {
    return this.request('/api/v1/mcp/call', {
      method: 'POST',
      body: JSON.stringify({
        method,
        params,
        id: `call-${Date.now()}`,
      }),
    });
  }

  // Health check
  async getHealth(): Promise<any> {
    return this.request('/health', { headers: this.getHeaders(false) });
  }

  // Utility methods
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  clearTokens(): void {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  hasValidToken(): boolean {
    return !!this.accessToken;
  }
}

export const apiService = new ApiService();
export default apiService;