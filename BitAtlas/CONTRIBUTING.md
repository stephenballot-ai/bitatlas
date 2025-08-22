# Contributing to BitAtlas

Thank you for your interest in contributing to BitAtlas! This project prioritizes **EU data sovereignty** and **privacy by design**.

## Core Principles

All contributions must align with our core values:

- 🇪🇺 **EU Data Sovereignty**: Files must never leave European borders
- 🔐 **Privacy by Design**: Client-side encryption and minimal data collection  
- 🛡️ **Security First**: All code changes must maintain or improve security
- 📏 **GDPR Compliance**: Respect user privacy and data protection rights

## Getting Started

### Prerequisites
- **Node.js** 18+
- **Docker** with Docker Compose
- **Git** with commit signing recommended

### Local Development
```bash
# Clone and setup
cd BitAtlas
cd backend && npm install && cd ../frontend && npm install && cd ..

# Start development servers
cd backend && npm run dev:simple  # Terminal 1
cd frontend && npm run dev         # Terminal 2
```

## Contribution Types

### 🐛 Bug Reports
Use the bug report template and include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (browser, OS)
- Security implications (if any)

### ✨ Feature Requests  
New features must:
- Support EU data sovereignty goals
- Maintain or improve privacy protections
- Include security impact assessment
- Be documented with clear use cases

### 🔧 Code Contributions

#### Before You Start
1. Check existing issues and PRs
2. Create an issue for discussion (for significant changes)
3. Fork the repository
4. Create a feature branch: `git checkout -b feature/your-feature-name`

#### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Follow existing configuration  
- **Security**: Never commit secrets, API keys, or credentials
- **Testing**: Add tests for new functionality
- **EU Focus**: Ensure changes support EU data residency

#### Commit Guidelines
Follow conventional commits:
```
feat(backend): add Scaleway object storage adapter
fix(frontend): resolve file upload error handling  
security(auth): implement rate limiting for OAuth
docs(readme): update EU compliance section
```

#### Pull Request Process
1. **Update Documentation**: README, SECURITY.md, etc.
2. **Add Tests**: Unit and integration tests where applicable
3. **Security Review**: Consider privacy and security implications
4. **EU Compliance**: Verify data stays within EU borders
5. **CI Checks**: Ensure all automated checks pass

### 📝 Documentation
Help improve:
- README clarity and accuracy
- API documentation
- Security guidelines
- GDPR compliance procedures

## EU Provider Integration

When adding new EU cloud providers:

1. **Verify EU Status**: Must be headquartered and operate within EU
2. **Data Residency**: Confirm data stays within EU borders
3. **Adapter Pattern**: Follow existing storage adapter interface
4. **Security Review**: Assess provider security certifications
5. **Compliance Check**: GDPR compliance verification

### Approved EU Providers
- ✅ **Scaleway** (France)
- ✅ **OVH** (France)  
- ✅ **Hetzner** (Germany)
- 🔄 **Under Review**: Others being evaluated

## Security Considerations

### Required for All PRs
- [ ] No secrets or credentials committed
- [ ] Input validation for all user data
- [ ] Proper error handling without information leakage
- [ ] Security headers maintained or improved
- [ ] Authentication/authorization preserved

### Security-Sensitive Changes
Require additional review for:
- Authentication/authorization changes
- Cryptographic implementations
- Data storage/transmission modifications
- Third-party integrations
- Infrastructure configuration

## Testing

### Required Tests
- **Unit Tests**: Core business logic
- **Integration Tests**: API endpoints
- **Security Tests**: Authentication flows
- **EU Compliance Tests**: Data residency validation

### Test Commands
```bash
# Run all tests
cd backend && npm test
cd frontend && npm test

# Type checking
npx tsc --noEmit

# Security audit
npm audit
```

## Review Process

### Automated Checks
- TypeScript compilation
- Linting (ESLint)
- Security scanning (CodeQL)
- Dependency audit
- Build verification

### Manual Review
- Code quality and architecture
- Security implications
- EU compliance verification
- Documentation completeness
- Test coverage

## Code of Conduct

### Be Respectful
- Use inclusive language
- Respect different viewpoints
- Focus on constructive feedback
- Help newcomers learn

### Stay Focused
- Keep discussions relevant to BitAtlas
- Prioritize EU data sovereignty goals
- Consider security in all decisions
- Respect maintainer time and decisions

## Questions?

- **General**: Open a GitHub issue with the "question" label
- **Security**: Email security@bitatlas.eu (private)
- **EU Compliance**: Email privacy@bitatlas.eu

## Recognition

Contributors who help improve BitAtlas security, privacy, or EU compliance will be acknowledged in our documentation (with permission).

---

By contributing, you agree that your contributions will be licensed under the same license as BitAtlas.