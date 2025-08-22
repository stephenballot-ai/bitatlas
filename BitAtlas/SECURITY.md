# Security Policy

## Reporting Security Vulnerabilities

BitAtlas takes security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Email**: Send details to security@bitatlas.eu
2. **Subject**: Include "SECURITY" in the subject line
3. **Details**: Provide steps to reproduce the vulnerability
4. **Timeline**: We aim to respond within 48 hours

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (optional)

### What NOT to Report Publicly

- Do not create public GitHub issues for security vulnerabilities
- Do not disclose vulnerabilities on social media
- Do not share exploit code publicly until we've had time to address it

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |
| < 0.1   | ❌ No     |

## Security Features

### Data Protection
- **EU-Only Storage**: Files never leave European borders
- **Client-Side Encryption**: E2EE planned for production
- **Access Controls**: OAuth 2.0 with MCP protocol
- **Audit Logging**: Comprehensive activity tracking

### Infrastructure Security
- **Container Security**: Docker images scanned for vulnerabilities
- **Dependency Scanning**: Automated with Dependabot
- **Secret Management**: No secrets in code/config
- **HTTPS Enforcement**: All traffic encrypted in transit

### Development Security
- **CodeQL Scanning**: Automated static analysis
- **Branch Protection**: Required reviews and status checks
- **Signed Commits**: Encouraged for all contributors
- **Security Headers**: Implemented with Helmet.js

## Security Best Practices

### For Users
- Use strong, unique passwords
- Enable 2FA when available
- Regularly review active access tokens
- Report suspicious activity immediately

### For Developers  
- Follow secure coding practices
- Never commit secrets or API keys
- Keep dependencies updated
- Use TypeScript for type safety
- Validate all inputs

## Compliance

BitAtlas is designed with the following compliance frameworks in mind:

- **GDPR**: European data protection regulation
- **ISO 27001**: Information security management
- **SOC 2**: Security, availability, and confidentiality

## Security Contacts

- **General Security**: security@bitatlas.eu
- **GDPR/Privacy**: privacy@bitatlas.eu
- **Incident Response**: incident@bitatlas.eu

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve BitAtlas security (with permission).