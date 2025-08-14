export interface StorageProvider {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  generateSignedUrl(key: string, expiresIn: number): Promise<string>;
}

export interface UploadOptions {
  key: string;
  metadata?: Record<string, any>;
  encryption?: string;
  contentType?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  etag?: string;
}

export class StorageOrchestrator {
  private providers: Map<string, StorageProvider> = new Map();
  private defaultProvider: string = 'local'; // Will be set to EU provider in production

  constructor() {
    // Providers will be initialized based on configuration
    // this.providers.set('ovh', new OvhStorage());
    // this.providers.set('scaleway', new ScalewayStorage());
    // this.providers.set('hetzner', new HetznerStorage());
  }

  async uploadFile(file: Buffer, options: {
    provider?: string;
    key: string;
    metadata?: any;
  }): Promise<UploadResult> {
    const provider = this.providers.get(options.provider || this.defaultProvider);
    if (!provider) {
      throw new Error(`Unknown storage provider: ${options.provider || this.defaultProvider}`);
    }

    // Encrypt file before upload (European data sovereignty requirement)
    const encryptedFile = await this.encryptFile(file);
    
    return provider.upload(encryptedFile, {
      key: options.key,
      metadata: options.metadata,
      encryption: 'AES-256-GCM'
    });
  }

  async getFile(provider: string, key: string): Promise<Buffer> {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new Error(`Unknown storage provider: ${provider}`);
    }

    const encryptedFile = await storageProvider.download(key);
    
    // Decrypt file after download
    return this.decryptFile(encryptedFile);
  }

  async deleteFile(provider: string, key: string): Promise<void> {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new Error(`Unknown storage provider: ${provider}`);
    }

    return storageProvider.delete(key);
  }

  async generateSignedUrl(provider: string, key: string, expiresIn: number = 3600): Promise<string> {
    const storageProvider = this.providers.get(provider);
    if (!storageProvider) {
      throw new Error(`Unknown storage provider: ${provider}`);
    }

    return storageProvider.generateSignedUrl(key, expiresIn);
  }

  private async encryptFile(file: Buffer): Promise<Buffer> {
    // TODO: Implement AES-256-GCM encryption
    // Use European-generated encryption keys stored in secure key management
    // For now, return file as-is (placeholder)
    return file;
  }

  private async decryptFile(encryptedFile: Buffer): Promise<Buffer> {
    // TODO: Implement AES-256-GCM decryption
    // For now, return file as-is (placeholder)
    return encryptedFile;
  }
}