#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate cryptographically secure random secrets for production use
 */
function generateSecrets() {
  return {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    encryptionKey: crypto.randomBytes(32).toString('hex'),
    oauthClientSecret: crypto.randomBytes(32).toString('hex')
  };
}

/**
 * Create .env.example file with secure placeholder values
 */
function createEnvExample(secrets) {
  const envExample = `# BitAtlas Environment Configuration
# Copy this file to .env and replace values with your actual secrets

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/bitatlas
REDIS_URL=redis://localhost:6379

# Security Secrets (NEVER use these examples in production)
JWT_SECRET=${secrets.jwtSecret}
SESSION_SECRET=${secrets.sessionSecret}
ENCRYPTION_KEY=${secrets.encryptionKey}

# OAuth Configuration
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=${secrets.oauthClientSecret}

# Application Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# File Storage Configuration
STORAGE_PROVIDER=local
STORAGE_PATH=/app/uploads
MAX_FILE_SIZE=52428800

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
`;

  const examplePath = path.join(__dirname, '..', '.env.example');
  fs.writeFileSync(examplePath, envExample);
  console.log(`✓ Created secure .env.example at ${examplePath}`);
}

/**
 * Update docker-compose files to use environment variables
 */
function updateDockerCompose() {
  const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
  const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');
  
  const updatedContent = dockerComposeContent
    .replace(/JWT_SECRET: your-jwt-secret-change-in-production/, 'JWT_SECRET: ${JWT_SECRET}')
    .replace(/POSTGRES_PASSWORD: password/, 'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}');
  
  fs.writeFileSync(dockerComposePath, updatedContent);
  console.log('✓ Updated docker-compose.yml to use environment variables');
}

/**
 * Create production-ready secrets file
 */
function createProductionSecrets() {
  const secrets = generateSecrets();
  const secretsFile = path.join(__dirname, '..', 'secrets.production.env');
  
  const productionSecrets = `# PRODUCTION SECRETS - KEEP SECURE!
# Generated on: ${new Date().toISOString()}
# 
# SECURITY WARNING:
# - Never commit this file to version control
# - Store securely in your deployment environment
# - Rotate secrets regularly

JWT_SECRET=${secrets.jwtSecret}
SESSION_SECRET=${secrets.sessionSecret}
ENCRYPTION_KEY=${secrets.encryptionKey}
OAUTH_CLIENT_SECRET=${secrets.oauthClientSecret}
POSTGRES_PASSWORD=${crypto.randomBytes(16).toString('hex')}
REDIS_PASSWORD=${crypto.randomBytes(16).toString('hex')}
`;

  fs.writeFileSync(secretsFile, productionSecrets, { mode: 0o600 });
  console.log(`✓ Created production secrets file at ${secretsFile}`);
  console.log('  WARNING: This file contains sensitive data. Secure it appropriately!');
  
  return secrets;
}

/**
 * Add secrets file to .gitignore
 */
function updateGitignore() {
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  let gitignoreContent = '';
  
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }
  
  const secretsEntries = [
    '# Environment and Secrets',
    '.env',
    '.env.local',
    '.env.production',
    'secrets.*.env',
    '*.pem',
    '*.key'
  ];
  
  let needsUpdate = false;
  secretsEntries.forEach(entry => {
    if (!gitignoreContent.includes(entry)) {
      gitignoreContent += `\n${entry}`;
      needsUpdate = true;
    }
  });
  
  if (needsUpdate) {
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('✓ Updated .gitignore with secrets patterns');
  }
}

// Main execution
console.log('🔐 Generating secure secrets for BitAtlas...\n');

try {
  const secrets = createProductionSecrets();
  createEnvExample(secrets);
  updateDockerCompose();
  updateGitignore();
  
  console.log('\n✅ Security setup complete!');
  console.log('\nNext steps:');
  console.log('1. Copy secrets.production.env to your production environment');
  console.log('2. Update your deployment to source environment variables from secrets');
  console.log('3. Delete secrets.production.env from development machine');
  console.log('4. Set up secret rotation schedule');
  
} catch (error) {
  console.error('❌ Error generating secrets:', error.message);
  process.exit(1);
}