import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import and validate configuration
import { validateEnv, getSafeEnvConfig } from './config/env';

// Import database and middleware
import { db } from './database/connection';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import { authRoutes } from './routes/auth';
import { fileRoutes } from './routes/files';
import { mcpRoutes } from './routes/mcp';
import { oauthRoutes } from './routes/oauth';
import { gdprRoutes } from './routes/gdpr';

// Import services
import { initializeLogger } from './services/logger';
import { initializeMonitoring } from './services/monitoring';
import { initializeSecrets } from './services/secretsManager';
import { requestLogger, errorLogger } from './middleware/requestLogger';

// Validate environment configuration
let config;
try {
  config = validateEnv();
  console.log('✅ Environment configuration validated');
  console.log('📋 Configuration:', getSafeEnvConfig(config));
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Initialize services
const logger = initializeLogger(config);
const monitoring = initializeMonitoring(config);

// Initialize secrets manager
try {
  await initializeSecrets();
} catch (error) {
  logger.error('Failed to initialize secrets manager', { error: error.message });
  process.exit(1);
}

const app = express();
const PORT = config.PORT;

// Trust proxy for rate limiting (important for production)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(compression());

// Global rate limiting
app.use(rateLimiter.ipLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 minutes per IP

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Production request logging
app.use(requestLogger);

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await monitoring.getHealthCheck();
    res.status(healthCheck.status === 'unhealthy' ? 503 : 200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/mcp', mcpRoutes);
app.use('/oauth', oauthRoutes);

// Token management API routes
app.use('/api/tokens', oauthRoutes);

// GDPR compliance API routes
app.use('/api/gdpr', gdprRoutes);

// Legacy status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({ 
    message: 'BitAtlas API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(errorHandler.notFound);

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use(errorHandler.handle);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  await rateLimiter.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close();
  await rateLimiter.close();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Run database migrations
    console.log('Running database migrations...');
    await db.runMigrations();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 BitAtlas backend server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
      console.log(`Redis: ${process.env.REDIS_URL ? 'Configured' : 'Not configured'}`);
      console.log('\n📋 Available endpoints:');
      console.log('  GET  /health - Health check');
      console.log('  GET  /api/v1/status - API status');
      console.log('  POST /api/v1/auth/register - User registration');
      console.log('  POST /api/v1/auth/login - User login');
      console.log('  GET  /api/v1/auth/profile - User profile');
      console.log('  GET  /api/v1/files - List files');
      console.log('  POST /api/v1/files - Create file');
      console.log('  GET  /api/v1/mcp/tools - MCP tools for AI assistants');
      console.log('  POST /api/v1/mcp/call - MCP protocol endpoint');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;