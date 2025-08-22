// Simple console logger for demo mode
const logger = {
  info: (message: string, context?: any) => {
    console.log(`[EU-POLICY-INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  },
  warn: (message: string, context?: any) => {
    console.warn(`[EU-POLICY-WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  },
  error: (message: string, context?: any) => {
    console.error(`[EU-POLICY-ERROR] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }
};

/**
 * EU-Only Policy Enforcement Service
 * Ensures all storage operations comply with EU data sovereignty requirements
 */

interface EuProvider {
  name: string;
  country: string;
  endpoints: string[];
  verified: boolean;
  gdprCompliant: boolean;
}

// Approved EU cloud storage providers
const EU_PROVIDERS: EuProvider[] = [
  {
    name: 'Scaleway',
    country: 'France',
    endpoints: [
      's3.fr-par.scw.cloud',
      's3.nl-ams.scw.cloud',
      's3.pl-waw.scw.cloud'
    ],
    verified: true,
    gdprCompliant: true
  },
  {
    name: 'OVH',
    country: 'France', 
    endpoints: [
      's3.gra.io.cloud.ovh.net',
      's3.sbg.io.cloud.ovh.net',
      's3.rbx.io.cloud.ovh.net',
      's3.de.io.cloud.ovh.net'
    ],
    verified: true,
    gdprCompliant: true
  },
  {
    name: 'Hetzner',
    country: 'Germany',
    endpoints: [
      's3.hel1.your-objectstorage.com',
      's3.fsn1.your-objectstorage.com',
      's3.nbg1.your-objectstorage.com'
    ],
    verified: true,
    gdprCompliant: true
  }
];

// Blocked non-EU providers (for safety)
const BLOCKED_PROVIDERS = [
  'amazonaws.com',
  'storage.googleapis.com', 
  'blob.core.windows.net',
  'digitaloceanspaces.com',
  'backblazeb2.com'
];

export class EuPolicyService {
  /**
   * Validates that an endpoint is EU-compliant
   */
  static validateEndpoint(endpoint: string): { valid: boolean; provider?: EuProvider; reason?: string } {
    // Check if endpoint is blocked
    for (const blocked of BLOCKED_PROVIDERS) {
      if (endpoint.includes(blocked)) {
        logger.warn('EU Policy Violation: Blocked non-EU endpoint', { 
          endpoint,
          blocked_provider: blocked,
          action: 'reject'
        });
        return { 
          valid: false, 
          reason: `Endpoint ${endpoint} uses non-EU provider ${blocked}. BitAtlas only supports EU-based storage.`
        };
      }
    }

    // Check if endpoint is approved EU provider
    for (const provider of EU_PROVIDERS) {
      for (const euEndpoint of provider.endpoints) {
        if (endpoint.includes(euEndpoint)) {
          logger.info('EU Policy Check: Valid EU endpoint', {
            endpoint,
            provider: provider.name,
            country: provider.country,
            action: 'accept'
          });
          return { valid: true, provider };
        }
      }
    }

    // Unknown endpoint - reject by default
    logger.warn('EU Policy Violation: Unknown/unverified endpoint', {
      endpoint,
      action: 'reject',
      reason: 'endpoint_not_whitelisted'
    });
    
    return { 
      valid: false, 
      reason: `Endpoint ${endpoint} is not a verified EU provider. Only Scaleway, OVH, and Hetzner are currently supported.`
    };
  }

  /**
   * Assert that an endpoint is EU-compliant (throws on failure)
   */
  static assertEndpointIsEu(endpoint: string): void {
    const validation = this.validateEndpoint(endpoint);
    if (!validation.valid) {
      throw new EuPolicyViolationError(validation.reason || 'EU policy violation');
    }
  }

  /**
   * Get list of approved EU providers
   */
  static getApprovedProviders(): EuProvider[] {
    return EU_PROVIDERS.filter(p => p.verified && p.gdprCompliant);
  }

  /**
   * Validate storage configuration for EU compliance
   */
  static validateStorageConfig(config: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (config.region && !this.isEuRegion(config.region)) {
      violations.push(`Region ${config.region} is not within EU borders`);
    }

    if (config.endpoint) {
      const endpointValidation = this.validateEndpoint(config.endpoint);
      if (!endpointValidation.valid) {
        violations.push(endpointValidation.reason || 'Invalid endpoint');
      }
    }

    if (config.encryption === false) {
      violations.push('Encryption must be enabled for EU compliance');
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Check if a region code represents an EU location
   */
  private static isEuRegion(region: string): boolean {
    const euRegions = [
      // Scaleway regions
      'fr-par', 'nl-ams', 'pl-waw',
      // OVH regions  
      'gra', 'sbg', 'rbx', 'de',
      // Hetzner regions
      'hel1', 'fsn1', 'nbg1',
      // Generic EU indicators
      'eu-', 'europe-'
    ];

    return euRegions.some(euRegion => region.toLowerCase().includes(euRegion));
  }

  /**
   * Generate EU compliance report
   */
  static generateComplianceReport(): {
    timestamp: string;
    approvedProviders: number;
    blockedProviders: number;
    gdprCompliant: boolean;
    dataResidency: string;
  } {
    return {
      timestamp: new Date().toISOString(),
      approvedProviders: EU_PROVIDERS.filter(p => p.verified).length,
      blockedProviders: BLOCKED_PROVIDERS.length,
      gdprCompliant: true,
      dataResidency: 'EU-ONLY'
    };
  }
}

/**
 * Custom error for EU policy violations
 */
export class EuPolicyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EuPolicyViolationError';
  }
}

/**
 * Middleware to enforce EU policy on all storage operations
 */
export function enforceEuPolicy() {
  return (req: any, res: any, next: any) => {
    // Check if request involves storage operations
    if (req.body?.storageConfig) {
      try {
        const validation = EuPolicyService.validateStorageConfig(req.body.storageConfig);
        if (!validation.valid) {
          logger.error('EU Policy Violation in request', {
            url: req.url,
            violations: validation.violations,
            ip: req.ip
          });

          return res.status(403).json({
            error: 'EU Policy Violation',
            message: 'This operation violates BitAtlas EU-only data sovereignty policy',
            violations: validation.violations
          });
        }
      } catch (error) {
        logger.error('EU Policy Service error', { error: error.message });
        return res.status(500).json({
          error: 'EU Policy Check Failed',
          message: 'Unable to validate EU compliance'
        });
      }
    }

    next();
  };
}