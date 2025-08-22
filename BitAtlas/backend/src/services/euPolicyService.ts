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
 * Data Residency Policy Enforcement Service
 * Ensures all customer content and metadata are stored only within EEA regions
 * Global customers welcome - data stays in EU
 */

export type Provider = 'scaleway' | 'ovh' | 'hetzner' | 'exoscale' | 'ionos';

interface EeaProvider {
  name: string;
  country: string;
  endpoints: string[];
  verified: boolean;
  gdprCompliant: boolean;
  regions: string[];
}

// Comprehensive EEA region prefixes
const EEA_REGION_PREFIXES = new Set([
  'fr', 'nl', 'de', 'pl', 'eu', 'es', 'it', 'ie', 'be', 'fi', 'se', 'cz', 'at', 'pt', 'gr'
]);

// Approved EEA cloud storage providers (Global customers, EEA data)
const EEA_PROVIDERS: EeaProvider[] = [
  {
    name: 'Scaleway',
    country: 'France',
    endpoints: [
      's3.fr-par.scw.cloud',
      's3.nl-ams.scw.cloud',
      's3.pl-waw.scw.cloud'
    ],
    regions: ['fr-par', 'nl-ams', 'pl-waw'],
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
    regions: ['gra', 'sbg', 'rbx', 'de'],
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
    regions: ['hel1', 'fsn1', 'nbg1'],
    verified: true,
    gdprCompliant: true
  },
  {
    name: 'Exoscale',
    country: 'Switzerland',
    endpoints: [
      'sos-ch-gva-2.exo.io',
      'sos-ch-dk-2.exo.io',
      'sos-de-fra-1.exo.io',
      'sos-de-muc-1.exo.io'
    ],
    regions: ['ch-gva-2', 'ch-dk-2', 'de-fra-1', 'de-muc-1'],
    verified: true,
    gdprCompliant: true
  },
  {
    name: 'IONOS',
    country: 'Germany',
    endpoints: [
      's3-eu-central-1.ionoscloud.com',
      's3-de.ionoscloud.com'
    ],
    regions: ['eu-central-1', 'de'],
    verified: true,
    gdprCompliant: true
  }
];

// Hostname whitelist for EEA endpoints (European companies only)
const HOST_ALLOW_PATTERNS = [
  /\.objects\.scw\.cloud$/,         // Scaleway
  /\.storage\.cloud\.ovh\.net$/,    // OVHcloud
  /\.io\.cloud\.ovh\.net$/,         // OVHcloud S3
  /\.hetzner\.cloud$/,              // Hetzner
  /\.your-objectstorage\.com$/,     // Hetzner Object Storage
  /\.exo\.io$/,                     // Exoscale
  /\.ionoscloud\.com$/              // IONOS
];

// Explicitly blocked American tech companies (even EU regions forbidden)
const BLOCKED_US_COMPANIES = [
  'amazonaws.com',                  // Amazon/AWS
  'storage.googleapis.com',         // Google Cloud
  'blob.core.windows.net',          // Microsoft Azure
  'digitaloceanspaces.com',         // DigitalOcean
  'backblazeb2.com',                // Backblaze
  'wasabisys.com',                  // Wasabi
  'dropbox.com',                    // Dropbox
  'box.com'                         // Box
];

export class DataResidencyService {
  /**
   * Assert that an endpoint is EEA-compliant (throws on failure)
   */
  static assertEndpointIsEEA(url: string): void {
    const host = new URL(url).host;
    
    // First check: Explicitly reject American companies
    for (const blockedCompany of BLOCKED_US_COMPANIES) {
      if (host.includes(blockedCompany)) {
        const error: any = new Error(`POLICY_US_COMPANY_BLOCKED: ${blockedCompany} is an American company. Only European providers allowed.`);
        error.code = 'POLICY_US_COMPANY_BLOCKED';
        
        logger.error('Data Residency Violation: American company blocked', {
          endpoint: url,
          host,
          blocked_company: blockedCompany,
          action: 'reject',
          reason: 'american_company_not_allowed'
        });
        
        throw error;
      }
    }
    
    // Second check: Must be in European whitelist
    if (!HOST_ALLOW_PATTERNS.some(rx => rx.test(host))) {
      const error: any = new Error(`POLICY_NON_EEA_ENDPOINT: ${host} is not a verified European provider`);
      error.code = 'POLICY_NON_EEA_ENDPOINT';
      
      logger.error('Data Residency Violation: Non-European endpoint rejected', {
        endpoint: url,
        host,
        action: 'reject',
        reason: 'endpoint_not_european_provider'
      });
      
      throw error;
    }

    logger.info('Data Residency Check: Valid European provider endpoint', {
      endpoint: url,
      host,
      action: 'accept'
    });
  }

  /**
   * Assert that a region is EEA-compliant (throws on failure) 
   */
  static assertRegionIsEEA(region: string): void {
    const prefix = region.split(/[-_]/)[0].toLowerCase();
    if (!EEA_REGION_PREFIXES.has(prefix)) {
      const error: any = new Error(`POLICY_NON_EEA_REGION: ${region}`);
      error.code = 'POLICY_NON_EEA_REGION';
      
      logger.error('Data Residency Violation: Non-EEA region rejected', {
        region,
        prefix,
        action: 'reject',
        reason: 'region_not_in_eea'
      });
      
      throw error;
    }

    logger.info('Data Residency Check: Valid EEA region', {
      region,
      prefix,
      action: 'accept'
    });
  }

  /**
   * Validates that an endpoint is EEA-compliant (non-throwing)
   */
  static validateEndpoint(endpoint: string): { valid: boolean; provider?: EeaProvider; reason?: string } {
    try {
      this.assertEndpointIsEEA(endpoint);
      
      // Find matching provider
      const host = new URL(endpoint).host;
      for (const provider of EEA_PROVIDERS) {
        for (const eeaEndpoint of provider.endpoints) {
          if (host.includes(eeaEndpoint) || endpoint.includes(eeaEndpoint)) {
            return { valid: true, provider };
          }
        }
      }
      
      return { valid: true }; // Valid but provider not specifically identified
      
    } catch (error) {
      return { 
        valid: false, 
        reason: error.message || 'EEA data residency policy violation'
      };
    }
  }

  /**
   * Get list of approved EEA providers
   */
  static getApprovedProviders(): EeaProvider[] {
    return EEA_PROVIDERS.filter(p => p.verified && p.gdprCompliant);
  }

  /**
   * Verify actual bucket/namespace location at runtime
   */
  static async ensureBucketInEEA(s3Client: any, bucket: string): Promise<void> {
    try {
      // This would be implemented with actual S3 client
      // const { LocationConstraint } = await s3Client.send(new GetBucketLocationCommand({ Bucket: bucket }));
      // const region = LocationConstraint || 'eu-west-1'; // legacy default fallback
      // this.assertRegionIsEEA(region);
      
      // For demo mode - log the check
      logger.info('Bucket location verification requested', {
        bucket,
        action: 'verify_bucket_location',
        note: 'Runtime verification would happen here in production'
      });
    } catch (error) {
      logger.error('Bucket location verification failed', {
        bucket,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate storage configuration for EEA data residency compliance
   */
  static validateStorageConfig(config: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (config.region) {
      try {
        this.assertRegionIsEEA(config.region);
      } catch (error) {
        violations.push(`Region ${config.region} is not within EEA borders`);
      }
    }

    if (config.endpoint) {
      const endpointValidation = this.validateEndpoint(config.endpoint);
      if (!endpointValidation.valid) {
        violations.push(endpointValidation.reason || 'Invalid endpoint');
      }
    }

    if (config.encryption === false) {
      violations.push('Encryption must be enabled for EEA data residency compliance');
    }

    // Check for transfer acceleration or non-EEA CDN
    if (config.transferAcceleration === true) {
      violations.push('Transfer acceleration may store data outside EEA - disabled for compliance');
    }

    if (config.cdnEnabled === true && !config.cdnEeaOnly) {
      violations.push('CDN must be EEA-only for data residency compliance');
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Generate EEA data residency compliance report
   */
  static generateComplianceReport(): {
    timestamp: string;
    approvedProviders: number;
    blockedUSCompanies: number;
    dataResidency: string;
    gdprCompliant: boolean;
    eeaRegions: number;
    philosophy: string;
    policy: string;
  } {
    return {
      timestamp: new Date().toISOString(),
      approvedProviders: EEA_PROVIDERS.filter(p => p.verified).length,
      blockedUSCompanies: BLOCKED_US_COMPANIES.length,
      dataResidency: 'EEA-ONLY',
      gdprCompliant: true,
      eeaRegions: EEA_REGION_PREFIXES.size,
      philosophy: 'Global customers welcome - data stays in EEA',
      policy: 'European providers only - No American tech companies'
    };
  }
}

/**
 * Custom error for data residency policy violations
 */
export class DataResidencyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataResidencyViolationError';
  }
}

/**
 * Middleware to enforce EEA data residency policy on all storage operations
 */
export function enforceDataResidency() {
  return (req: any, res: any, next: any) => {
    // Check if request involves storage operations
    if (req.body?.storageConfig) {
      try {
        const validation = DataResidencyService.validateStorageConfig(req.body.storageConfig);
        if (!validation.valid) {
          logger.error('Data Residency Policy Violation in request', {
            url: req.url,
            violations: validation.violations,
            ip: req.ip,
            philosophy: 'Global customers welcome, but data must stay in EEA'
          });

          return res.status(403).json({
            error: 'Data Residency Policy Violation',
            message: 'This operation violates BitAtlas EEA data residency requirements. Global customers are welcome, but all data must remain within EEA regions.',
            violations: validation.violations,
            philosophy: 'Global customers welcome - data stays in EEA'
          });
        }
      } catch (error) {
        logger.error('Data Residency Policy Service error', { error: error.message });
        return res.status(500).json({
          error: 'Data Residency Check Failed',
          message: 'Unable to validate EEA data residency compliance'
        });
      }
    }

    next();
  };
}

// Legacy export for backward compatibility
export const enforceEuPolicy = enforceDataResidency;
export const EuPolicyService = DataResidencyService;