import winston from 'winston';
import type { EnvConfig } from '../config/env';

export interface LogContext {
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

export class Logger {
  private winston: winston.Logger;

  constructor(private config: EnvConfig) {
    this.winston = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
    ];

    // Add JSON formatting for production
    if (this.config.LOG_FORMAT === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(
        winston.format.colorize(),
        winston.format.simple()
      );
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: this.config.LOG_LEVEL,
        handleExceptions: true,
        handleRejections: true,
      })
    ];

    // Add file transport for production
    if (this.config.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: '/var/log/bitatlas/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: '/var/log/bitatlas/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10,
        })
      );
    }

    return winston.createLogger({
      level: this.config.LOG_LEVEL,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false,
    });
  }

  error(message: string, context?: LogContext): void {
    this.winston.error(message, this.sanitizeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.sanitizeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, this.sanitizeContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.sanitizeContext(context));
  }

  /**
   * Log HTTP requests
   */
  logRequest(context: LogContext): void {
    const { method, url, statusCode, duration, userId, ip } = context;
    const level = statusCode >= 400 ? 'warn' : 'info';
    
    this.winston.log(level, 'HTTP Request', {
      type: 'http_request',
      method,
      url,
      statusCode,
      duration,
      userId,
      ip,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, context?: LogContext): void {
    this.winston.warn(`SECURITY: ${event}`, {
      type: 'security_event',
      event,
      ...this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log database operations
   */
  logDatabase(operation: string, context?: LogContext): void {
    this.winston.info(`DB: ${operation}`, {
      type: 'database_operation',
      operation,
      ...this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log application errors with stack traces
   */
  logError(error: Error, context?: LogContext): void {
    this.winston.error('Application Error', {
      type: 'application_error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metrics
   */
  logMetrics(metric: string, value: number, unit: string, context?: LogContext): void {
    this.winston.info('Performance Metric', {
      type: 'performance_metric',
      metric,
      value,
      unit,
      ...this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
    ];

    const sanitized = { ...context };

    // Remove or mask sensitive fields
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// Global logger instance
let globalLogger: Logger;

export function initializeLogger(config: EnvConfig): Logger {
  globalLogger = new Logger(config);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    globalLogger.logError(error, { type: 'uncaught_exception' });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    globalLogger.error('Unhandled Promise Rejection', {
      type: 'unhandled_rejection',
      reason: String(reason),
      promise: String(promise),
    });
  });

  return globalLogger;
}

export function getLogger(): Logger {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeLogger first.');
  }
  return globalLogger;
}