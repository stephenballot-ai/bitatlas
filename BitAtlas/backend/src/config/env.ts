import { z } from 'zod';

// Environment schema with validation rules
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),

  // Database configuration
  DATABASE_URL: z.string().url().refine(
    (url) => url.startsWith('postgresql://'),
    'DATABASE_URL must be a PostgreSQL connection string'
  ),
  
  // Redis configuration
  REDIS_URL: z.string().url().refine(
    (url) => url.startsWith('redis://'),
    'REDIS_URL must be a Redis connection string'
  ),

  // Security secrets
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // OAuth configuration
  OAUTH_CLIENT_ID: z.string().min(1, 'OAUTH_CLIENT_ID is required'),
  OAUTH_CLIENT_SECRET: z.string().min(16, 'OAUTH_CLIENT_SECRET must be at least 16 characters'),

  // Application URLs
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  
  // File storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs']).default('local'),
  STORAGE_PATH: z.string().default('/app/uploads'),
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('52428800'), // 50MB

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Optional SSL/TLS
  SSL_CERT_PATH: z.string().optional(),
  SSL_KEY_PATH: z.string().optional(),

  // Optional monitoring
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables
 * @throws Error if validation fails
 */
export function validateEnv(): EnvConfig {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Production-specific validations
    if (parsed.NODE_ENV === 'production') {
      validateProductionSecrets(parsed);
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

/**
 * Additional validations for production environment
 */
function validateProductionSecrets(config: EnvConfig): void {
  const insecureDefaults = [
    'your-jwt-secret-change-in-production',
    'your-super-secret-jwt-key-change-in-production',
    'change-me-in-production',
    'password',
    'secret',
    'admin',
    '123',
  ];

  const secrets = [
    { name: 'JWT_SECRET', value: config.JWT_SECRET },
    { name: 'SESSION_SECRET', value: config.SESSION_SECRET },
    { name: 'ENCRYPTION_KEY', value: config.ENCRYPTION_KEY },
    { name: 'OAUTH_CLIENT_SECRET', value: config.OAUTH_CLIENT_SECRET },
  ];

  const insecureSecrets = secrets.filter(secret => 
    insecureDefaults.some(defaultValue => 
      secret.value.toLowerCase().includes(defaultValue.toLowerCase())
    )
  );

  if (insecureSecrets.length > 0) {
    const secretNames = insecureSecrets.map(s => s.name).join(', ');
    throw new Error(
      `SECURITY ERROR: Production environment detected insecure default values for: ${secretNames}. ` +
      'Please generate secure secrets using: npm run generate-secrets'
    );
  }

  // Ensure HTTPS in production
  if (!config.FRONTEND_URL.startsWith('https://')) {
    console.warn('WARNING: FRONTEND_URL should use HTTPS in production');
  }

  // Check for SSL configuration
  if (!config.SSL_CERT_PATH || !config.SSL_KEY_PATH) {
    console.warn('WARNING: SSL certificates not configured. Consider enabling HTTPS.');
  }
}

/**
 * Safe environment config for logging (excludes secrets)
 */
export function getSafeEnvConfig(config: EnvConfig) {
  const { JWT_SECRET, SESSION_SECRET, ENCRYPTION_KEY, OAUTH_CLIENT_SECRET, ...safeConfig } = config;
  
  return {
    ...safeConfig,
    JWT_SECRET: '[REDACTED]',
    SESSION_SECRET: '[REDACTED]',
    ENCRYPTION_KEY: '[REDACTED]',
    OAUTH_CLIENT_SECRET: '[REDACTED]',
  };
}