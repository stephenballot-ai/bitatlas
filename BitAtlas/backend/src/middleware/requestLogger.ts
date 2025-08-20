import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../services/logger';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request logging middleware
 */
export function requestLogger(req: RequestWithId, res: Response, next: NextFunction): void {
  const logger = getLogger();
  
  // Generate unique request ID
  req.id = generateRequestId();
  req.startTime = Date.now();

  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', req.id);

  // Extract user info if available
  const userId = (req as any).user?.id;

  // Log request start
  logger.debug('Request started', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    
    logger.logRequest({
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLogger(
  error: Error,
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  const logger = getLogger();
  
  logger.logError(error, {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });

  next(error);
}