export class StorageOrchestrator {
    providers = new Map();
    defaultProvider = 'local'; // Will be set to EU provider in production
    constructor() {
        // Providers will be initialized based on configuration
        // this.providers.set('ovh', new OvhStorage());
        // this.providers.set('scaleway', new ScalewayStorage());
        // this.providers.set('hetzner', new HetznerStorage());
    }
    async uploadFile(file, options) {
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
    async getFile(provider, key) {
        const storageProvider = this.providers.get(provider);
        if (!storageProvider) {
            throw new Error(`Unknown storage provider: ${provider}`);
        }
        const encryptedFile = await storageProvider.download(key);
        // Decrypt file after download
        return this.decryptFile(encryptedFile);
    }
    async deleteFile(provider, key) {
        const storageProvider = this.providers.get(provider);
        if (!storageProvider) {
            throw new Error(`Unknown storage provider: ${provider}`);
        }
        return storageProvider.delete(key);
    }
    async generateSignedUrl(provider, key, expiresIn = 3600) {
        const storageProvider = this.providers.get(provider);
        if (!storageProvider) {
            throw new Error(`Unknown storage provider: ${provider}`);
        }
        return storageProvider.generateSignedUrl(key, expiresIn);
    }
    async encryptFile(file) {
        // TODO: Implement AES-256-GCM encryption
        // Use European-generated encryption keys stored in secure key management
        // For now, return file as-is (placeholder)
        return file;
    }
    async decryptFile(encryptedFile) {
        // TODO: Implement AES-256-GCM decryption
        // For now, return file as-is (placeholder)
        return encryptedFile;
    }
}
//# sourceMappingURL=storageOrchestrator.js.map