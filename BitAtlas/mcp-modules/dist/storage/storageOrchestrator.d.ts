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
export declare class StorageOrchestrator {
    private providers;
    private defaultProvider;
    constructor();
    uploadFile(file: Buffer, options: {
        provider?: string;
        key: string;
        metadata?: any;
    }): Promise<UploadResult>;
    getFile(provider: string, key: string): Promise<Buffer>;
    deleteFile(provider: string, key: string): Promise<void>;
    generateSignedUrl(provider: string, key: string, expiresIn?: number): Promise<string>;
    private encryptFile;
    private decryptFile;
}
//# sourceMappingURL=storageOrchestrator.d.ts.map