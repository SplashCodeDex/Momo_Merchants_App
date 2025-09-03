# Dependency Management Policy

## Overview

This document outlines the dependency management strategy for the MoMo Merchant Companion App monorepo. It establishes policies for dependency selection, versioning, security, and maintenance to ensure reliable, secure, and maintainable code.

## Core Principles

### 1. Minimal Dependencies
- **Rationale**: Each dependency increases maintenance burden and security surface
- **Policy**: Prefer built-in Node.js/React Native APIs over third-party packages
- **Guidelines**:
  - Evaluate if functionality can be implemented with existing dependencies
  - Consider bundle size impact for mobile applications
  - Assess long-term maintenance viability

### 2. Security First
- **Rationale**: Dependencies are the primary attack vector for supply chain attacks
- **Policy**: All dependencies must pass security review before inclusion
- **Guidelines**:
  - Regular security audits using `npm audit`
  - Automated vulnerability scanning in CI/CD
  - Immediate patching of critical/high severity vulnerabilities

### 3. Version Stability
- **Rationale**: Unstable dependencies cause unpredictable build failures
- **Policy**: Use exact version pinning for production dependencies
- **Guidelines**:
  - Exact versions in `package.json` (no `^` or `~`)
  - Regular, scheduled dependency updates
  - Semantic versioning compliance

## Dependency Categories

### Production Dependencies
```json
{
  "dependencies": {
    "package-name": "1.2.3"  // Exact version, no wildcards
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "package-name": "^1.2.3"  // Caret allowed for dev tools
  }
}
```

### Peer Dependencies
```json
{
  "peerDependencies": {
    "react": "^18.0.0",      // Compatible with React 18.x
    "react-native": "^0.72.0" // Compatible with RN 0.72.x
  }
}
```

## Package Selection Criteria

### Technical Criteria
- [ ] **Maintenance**: Active development, recent commits (< 6 months)
- [ ] **Popularity**: > 1,000 weekly downloads, > 50 GitHub stars
- [ ] **Compatibility**: Compatible with React Native and Node.js versions
- [ ] **Bundle Size**: < 100KB minified for mobile packages
- [ ] **TypeScript**: TypeScript support or type definitions available

### Security Criteria
- [ ] **Audit**: Passes `npm audit` with no critical vulnerabilities
- [ ] **License**: OSI-approved license compatible with project
- [ ] **Supply Chain**: Published by reputable organization or verified publisher
- [ ] **Dependencies**: No dependencies with known security issues

### Business Criteria
- [ ] **Support**: Commercial support available if needed
- [ ] **Documentation**: Comprehensive documentation and examples
- [ ] **Community**: Active community with responsive maintainers
- [ ] **Cost**: No unexpected licensing costs

## Version Management

### Semantic Versioning
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Version Pinning Strategy
```json
{
  "dependencies": {
    // Exact versions for stability
    "react": "18.2.0",
    "react-native": "0.72.6",

    // Compatible ranges for flexibility
    "@types/react": "^18.0.0"
  }
}
```

### Internal Package Versioning
- Internal packages use `workspace:*` protocol
- Version alignment across workspaces
- Automated version bumping with changesets

## Security Management

### Vulnerability Scanning
```bash
# Daily automated scans
npm audit --audit-level moderate

# Fix vulnerabilities
npm audit fix

# Manual review for complex fixes
npm audit --json | jq '.vulnerabilities'
```

### Dependency Updates
```bash
# Check for updates
npm outdated

# Interactive updates
npx npm-check-updates -u

# Update specific package
npm update package-name@latest
```

### Security Review Process
1. **Automated Check**: CI/CD runs `npm audit`
2. **Manual Review**: Security team reviews new dependencies
3. **Risk Assessment**: Evaluate impact and exploitability
4. **Mitigation Plan**: Define patching strategy
5. **Documentation**: Record security decisions

## Maintenance Procedures

### Weekly Maintenance
- [ ] Run `npm audit` and address issues
- [ ] Check for outdated packages
- [ ] Review dependency usage analytics
- [ ] Update development dependencies

### Monthly Maintenance
- [ ] Major dependency updates (breaking changes)
- [ ] Security audit review
- [ ] Bundle size analysis
- [ ] Performance impact assessment

### Quarterly Maintenance
- [ ] Complete dependency audit
- [ ] License compliance review
- [ ] Remove unused dependencies
- [ ] Architecture review for dependency choices

## Tools and Automation

### Development Tools
```json
{
  "scripts": {
    "deps:check": "npm audit && npm outdated",
    "deps:update": "npx npm-check-updates -u",
    "deps:clean": "rm -rf node_modules && npm install",
    "bundle:analyze": "npx webpack-bundle-analyzer"
  }
}
```

### CI/CD Integration
```yaml
# .github/workflows/security.yml
- name: Security Audit
  run: npm audit --audit-level high

- name: Bundle Analysis
  run: npx bundle-analyzer build/static/js/*.js

- name: License Check
  run: npx license-checker --failOn GPL
```

### Monitoring
- **Bundle Size**: Track JavaScript bundle size trends
- **Vulnerabilities**: Monitor security advisory databases
- **Download Counts**: Track package popularity and maintenance
- **Update Frequency**: Monitor dependency update patterns

## Exception Process

### Adding New Dependencies
1. **Justification**: Document why the dependency is needed
2. **Alternatives**: Evaluate 2-3 alternative packages
3. **Security Review**: Complete security assessment
4. **Approval**: Get approval from technical lead
5. **Documentation**: Add to dependency inventory

### Emergency Updates
1. **Risk Assessment**: Evaluate security/critical bug impact
2. **Testing**: Comprehensive testing of the update
3. **Rollback Plan**: Define rollback strategy
4. **Communication**: Notify team of emergency update
5. **Documentation**: Record the emergency update

## Dependency Inventory

### Core Dependencies
| Package | Version | Purpose | Security Status |
|---------|---------|---------|-----------------|
| react | 18.2.0 | UI Framework | ✅ Clean |
| react-native | 0.72.6 | Mobile Framework | ✅ Clean |
| typescript | 5.2.0 | Type Safety | ✅ Clean |
| express | 4.18.0 | API Framework | ✅ Clean |

### Development Dependencies
| Package | Version | Purpose | Update Frequency |
|---------|---------|---------|------------------|
| eslint | ^8.50.0 | Code Linting | Monthly |
| prettier | ^3.0.0 | Code Formatting | Monthly |
| jest | ^29.0.0 | Testing | Monthly |
| typescript | ^5.2.0 | Type Checking | Monthly |

## Contact and Support

- **Dependency Reviews**: Security Team
- **Technical Decisions**: Architecture Team
- **Emergency Updates**: DevOps Team
- **Documentation**: This document

---

*This policy is reviewed quarterly and updated as needed. Last updated: September 2025*