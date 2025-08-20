import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface SecretConfig {
  encrypted: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export class SecretsManager {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private masterKey: Buffer | null = null;

  constructor(private readonly secretsDir: string = '/app/secrets') {}

  /**
   * Initialize the secrets manager with a master key
   */
  async initialize(masterKeySource?: string): Promise<void> {
    if (masterKeySource) {
      this.masterKey = this.deriveMasterKey(masterKeySource);
    } else {
      // Try to load from environment or generate new
      const envMasterKey = process.env.MASTER_KEY;
      if (envMasterKey) {
        this.masterKey = this.deriveMasterKey(envMasterKey);
      } else {
        console.warn('WARNING: No master key provided. Using default - NOT SECURE for production!');
        this.masterKey = this.deriveMasterKey('INSECURE_DEFAULT_KEY');
      }
    }

    // Ensure secrets directory exists
    await this.ensureSecretsDir();
  }

  /**
   * Derive a consistent master key from a source string
   */
  private deriveMasterKey(source: string): Buffer {
    return crypto.pbkdf2Sync(source, 'bitatlas-salt', 100000, this.keyLength, 'sha512');
  }

  /**
   * Encrypt a secret value
   */
  encrypt(plaintext: string): SecretConfig {
    if (!this.masterKey) {
      throw new Error('SecretsManager not initialized');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    cipher.setAAD(Buffer.from('bitatlas-secret'));

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag,
      algorithm: this.algorithm
    };
  }

  /**
   * Decrypt a secret value
   */
  decrypt(secretConfig: SecretConfig): string {
    if (!this.masterKey) {
      throw new Error('SecretsManager not initialized');
    }

    const decipher = crypto.createDecipher(secretConfig.algorithm, this.masterKey);
    decipher.setAAD(Buffer.from('bitatlas-secret'));
    decipher.setAuthTag(Buffer.from(secretConfig.tag, 'hex'));

    let decrypted = decipher.update(secretConfig.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store a secret securely on disk
   */
  async storeSecret(name: string, value: string): Promise<void> {
    const encrypted = this.encrypt(value);
    const secretPath = path.join(this.secretsDir, `${name}.json`);
    
    await fs.writeFile(
      secretPath, 
      JSON.stringify(encrypted, null, 2), 
      { mode: 0o600 }
    );
  }

  /**
   * Retrieve a secret from disk
   */
  async getSecret(name: string): Promise<string> {
    const secretPath = path.join(this.secretsDir, `${name}.json`);
    
    try {
      const encryptedData = await fs.readFile(secretPath, 'utf8');
      const secretConfig: SecretConfig = JSON.parse(encryptedData);
      return this.decrypt(secretConfig);
    } catch (error) {
      throw new Error(`Failed to retrieve secret '${name}': ${error.message}`);
    }
  }

  /**
   * Generate a cryptographically secure random secret
   */
  generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Rotate all stored secrets
   */
  async rotateSecrets(): Promise<void> {
    try {
      const files = await fs.readdir(this.secretsDir);
      const secretFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of secretFiles) {
        const name = file.replace('.json', '');
        const currentValue = await this.getSecret(name);
        
        // Generate new secret and store
        const newSecret = this.generateSecret();
        await this.storeSecret(`${name}_new`, newSecret);
        
        console.log(`✓ Rotated secret: ${name}`);
      }
      
      console.log('Secret rotation complete. Update your application to use new secrets.');
    } catch (error) {
      throw new Error(`Secret rotation failed: ${error.message}`);
    }
  }

  /**
   * Health check for secrets manager
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test encryption/decryption
      const testSecret = 'test-secret-value';
      const encrypted = this.encrypt(testSecret);
      const decrypted = this.decrypt(encrypted);
      
      if (decrypted !== testSecret) {
        throw new Error('Encryption/decryption test failed');
      }
      
      // Test directory access
      await this.ensureSecretsDir();
      
      return true;
    } catch (error) {
      console.error('SecretsManager health check failed:', error.message);
      return false;
    }
  }

  /**
   * Ensure secrets directory exists with proper permissions
   */
  private async ensureSecretsDir(): Promise<void> {
    try {
      await fs.mkdir(this.secretsDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

// Singleton instance
export const secretsManager = new SecretsManager();

/**
 * Initialize secrets manager for the application
 */
export async function initializeSecrets(): Promise<void> {
  const masterKey = process.env.MASTER_KEY || process.env.ENCRYPTION_KEY;
  
  if (!masterKey && process.env.NODE_ENV === 'production') {
    throw new Error('MASTER_KEY or ENCRYPTION_KEY must be set in production');
  }
  
  await secretsManager.initialize(masterKey);
  
  const healthy = await secretsManager.healthCheck();
  if (!healthy) {
    throw new Error('Secrets manager health check failed');
  }
  
  console.log('✅ Secrets manager initialized successfully');
}