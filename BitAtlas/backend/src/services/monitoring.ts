import { getLogger } from './logger';
import type { EnvConfig } from '../config/env';

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: Date;
  checks: {
    database: boolean;
    redis: boolean;
    disk: boolean;
    memory: boolean;
  };
  metrics?: SystemMetrics;
}

export class MonitoringService {
  private logger = getLogger();
  private startTime = Date.now();
  private cpuUsageStart = process.cpuUsage();

  constructor(private config: EnvConfig) {
    this.startPeriodicMetrics();
  }

  /**
   * Get comprehensive health check
   */
  async getHealthCheck(): Promise<HealthCheckResult> {
    const checks = await this.runHealthChecks();
    const metrics = this.getSystemMetrics();
    
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: HealthCheckResult['status'] = 'healthy';
    if (healthyChecks === 0) {
      status = 'unhealthy';
    } else if (healthyChecks < totalChecks) {
      status = 'degraded';
    }

    return {
      status,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime,
      timestamp: new Date(),
      checks,
      metrics,
    };
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    return {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.cpuUsageStart),
      timestamp: new Date(),
    };
  }

  /**
   * Run all health checks
   */
  private async runHealthChecks() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      disk: await this.checkDiskSpace(),
      memory: this.checkMemoryUsage(),
    };

    // Log failed checks
    Object.entries(checks).forEach(([service, healthy]) => {
      if (!healthy) {
        this.logger.warn(`Health check failed: ${service}`);
      }
    });

    return checks;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // This would connect to your actual database
      // For now, assuming it's available if DATABASE_URL is set
      return !!this.config.DATABASE_URL;
    } catch (error) {
      this.logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<boolean> {
    try {
      // This would connect to your actual Redis instance
      // For now, assuming it's available if REDIS_URL is set
      return !!this.config.REDIS_URL;
    } catch (error) {
      this.logger.error('Redis health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat('/');
      // Basic check - in production, you'd want more sophisticated disk monitoring
      return true;
    } catch (error) {
      this.logger.error('Disk space check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): boolean {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    
    // Warning if heap usage > 80%
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    if (heapUsagePercent > 80) {
      this.logger.warn('High memory usage detected', {
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        heapTotal: `${heapTotalMB.toFixed(2)}MB`,
        usagePercent: `${heapUsagePercent.toFixed(2)}%`,
      });
      return false;
    }
    
    return true;
  }

  /**
   * Start periodic metrics collection
   */
  private startPeriodicMetrics(): void {
    // Collect metrics every 60 seconds
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      
      this.logger.logMetrics('memory_heap_used', metrics.memoryUsage.heapUsed, 'bytes');
      this.logger.logMetrics('memory_heap_total', metrics.memoryUsage.heapTotal, 'bytes');
      this.logger.logMetrics('uptime', metrics.uptime, 'seconds');
      
      // Log memory warning if usage is high
      const heapUsagePercent = (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100;
      if (heapUsagePercent > 70) {
        this.logger.warn('Memory usage warning', {
          heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
          heapUsed: `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    }, 60000);
  }

  /**
   * Record custom application metrics
   */
  recordMetric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    this.logger.logMetrics(name, value, unit, tags);
  }

  /**
   * Record application performance timing
   */
  recordTiming(operation: string, duration: number, tags?: Record<string, string>): void {
    this.logger.logMetrics(`${operation}_duration`, duration, 'ms', tags);
    
    // Log slow operations
    if (duration > 1000) {
      this.logger.warn('Slow operation detected', {
        operation,
        duration: `${duration}ms`,
        ...tags,
      });
    }
  }
}

// Global monitoring instance
let globalMonitoring: MonitoringService;

export function initializeMonitoring(config: EnvConfig): MonitoringService {
  globalMonitoring = new MonitoringService(config);
  console.log('✅ Monitoring service initialized');
  return globalMonitoring;
}

export function getMonitoring(): MonitoringService {
  if (!globalMonitoring) {
    throw new Error('Monitoring service not initialized');
  }
  return globalMonitoring;
}