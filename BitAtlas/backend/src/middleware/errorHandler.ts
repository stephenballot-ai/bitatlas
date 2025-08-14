import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ErrorHandler {
  static handle = (err: ApiError, req: Request, res: Response, next: NextFunction): void => {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Default error response
    let statusCode = err.statusCode || 500;
    let code = err.code || 'ERR_INTERNAL_ERROR';
    let message = err.message || 'Internal server error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      code = 'ERR_VALIDATION_FAILED';
    } else if (err.name === 'CastError') {
      statusCode = 400;
      code = 'ERR_INVALID_ID';
      message = 'Invalid ID format';
    } else if (err.name === 'MongoError' || err.name === 'PostgresError') {
      statusCode = 500;
      code = 'ERR_DATABASE_ERROR';
      message = 'Database operation failed';
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      message = 'Internal server error';
    }

    res.status(statusCode).json({
      error: message,
      code,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details
      })
    });
  };

  static notFound = (req: Request, res: Response): void => {
    res.status(404).json({
      error: 'Route not found',
      code: 'ERR_NOT_FOUND',
      path: req.path
    });
  };

  static createError = (message: string, statusCode: number = 500, code?: string): ApiError => {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    error.code = code;
    return error;
  };
}

export const errorHandler = ErrorHandler;