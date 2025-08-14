import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimiter {
  private redis: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redis.on('error', (err) => {
      console.error('Redis client error:', err);
      this.connected = false;
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
      this.connected = true;
    });

    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  createLimiter(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!this.connected) {
        console.warn('Redis not connected, skipping rate limiting');
        next();
        return;
      }

      try {
        const key = options.keyGenerator ? options.keyGenerator(req) : this.defaultKeyGenerator(req);
        const window = Math.floor(Date.now() / options.windowMs);
        const redisKey = `ratelimit:${key}:${window}`;

        const current = await this.redis.incr(redisKey);
        
        if (current === 1) {
          await this.redis.expire(redisKey, Math.ceil(options.windowMs / 1000));
        }

        if (current > options.maxRequests) {
          const resetTime = (window + 1) * options.windowMs;
          
          res.status(429).json({
            error: 'Too many requests',
            code: 'ERR_RATE_LIMITED',
            limit: options.maxRequests,
            current: current,
            resetTime: resetTime,
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
          });
          return;
        }

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': options.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, options.maxRequests - current).toString(),
          'X-RateLimit-Reset': ((window + 1) * options.windowMs).toString()
        });

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // If Redis fails, allow the request through
        next();
      }
    };
  }

  // IP-based rate limiting
  ipLimiter(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    return this.createLimiter({
      windowMs,
      maxRequests,
      keyGenerator: (req) => `ip:${this.getClientIP(req)}`
    });
  }

  // User-based rate limiting (requires authentication)
  userLimiter(windowMs: number = 15 * 60 * 1000, maxRequests: number = 1000) {
    return this.createLimiter({
      windowMs,
      maxRequests,
      keyGenerator: (req) => {
        const user = (req as any).user;
        return user ? `user:${user.userId}` : `ip:${this.getClientIP(req)}`;
      }
    });
  }

  // Endpoint-specific rate limiting
  endpointLimiter(endpoint: string, windowMs: number = 60 * 1000, maxRequests: number = 60) {
    return this.createLimiter({
      windowMs,
      maxRequests,
      keyGenerator: (req) => `endpoint:${endpoint}:${this.getClientIP(req)}`
    });
  }

  // Authentication rate limiting (stricter for login attempts)
  authLimiter(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    return this.createLimiter({
      windowMs,
      maxRequests,
      keyGenerator: (req) => `auth:${this.getClientIP(req)}`,
      skipSuccessfulRequests: true // Only count failed attempts
    });
  }

  // OAuth rate limiting
  oauthLimiter(windowMs: number = 60 * 60 * 1000, maxRequests: number = 100) {
    return this.createLimiter({
      windowMs,
      maxRequests,
      keyGenerator: (req) => `oauth:${this.getClientIP(req)}`
    });
  }

  private defaultKeyGenerator(req: Request): string {
    return `default:${this.getClientIP(req)}`;
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      'unknown'
    );
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.redis.quit();
    }
  }
}

export const rateLimiter = new RateLimiter();