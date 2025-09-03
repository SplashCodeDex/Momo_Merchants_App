# Package Management Policy

## Overview

This document outlines the package management strategy for the MoMo Merchant Companion App monorepo, ensuring consistent dependency management, security, and development efficiency across all workspaces.

## Core Principles

### 1. Workspace-First Architecture
- All packages managed through npm workspaces
- Dependencies hoisted to root for optimal performance
- Cross-workspace dependencies explicitly declared
- No duplicate packages across workspaces

### 2. Security by Default
- Automated vulnerability scanning on every PR
- Dependencies updated regularly with automated PRs
- License compliance checked and tracked
- No unapproved packages allowed

### 3. Performance Optimization
- Bundle size monitoring and optimization
- Efficient caching strategies
- Minimal dependency footprint
- Tree-shaking enabled by default

## Workspace Structure

```
momo-merchant-app/
├── package.json              # Root workspace configuration
├── apps/
│   ├── mobile/package.json   # React Native app
│   └── admin/package.json    # Admin dashboard (future)
├── services/
│   ├── app-api/package.json  # Backend API service
│   └── analytics/package.json # Analytics service (future)
└── packages/
    ├── shared-types/package.json    # Shared TypeScript types
    └── api-client/package.json      # API client library
```

## Dependency Management

### Adding Dependencies

#### Root Dependencies (Shared)
```bash
# Add to all workspaces
npm install <package> --workspaces

# Add to root only
npm install <package> --workspace=root
```

#### Workspace-Specific Dependencies
```bash
# Add to specific workspace
npm install <package> --workspace=apps/mobile

# Add as dev dependency
npm install <package> --workspace=apps/mobile --save-dev
```

### Dependency Categories

#### Production Dependencies
- Core functionality packages
- Runtime dependencies
- Must be approved by security review

#### Development Dependencies
- Build tools, linters, test runners
- Development servers and utilities
- Can be added without security review

#### Peer Dependencies
- Used for plugins and extensions
- Must match versions across workspaces
- Documented in workspace README

## Security Policy

### Automated Security Scanning

#### CI/CD Security Gates
```yaml
# .github/workflows/security.yml
- name: Security Audit
  run: npm run audit:ci

- name: Dependency Check
  run: npm run deps:check

- name: License Compliance
  run: npm run licenses:check
```

#### Vulnerability Management
- **Critical/High**: Fix within 24 hours
- **Medium**: Fix within 1 week
- **Low**: Fix within 1 month
- **Informational**: Monitor and assess

### Dependency Approval Process

#### New Package Request
1. **Justification**: Document why the package is needed
2. **Alternatives**: Research alternative packages
3. **Security Review**: Check vulnerability history
4. **License Check**: Verify license compatibility
5. **Approval**: Get sign-off from tech lead

#### Approval Template
```markdown
## Package Request: [Package Name]

### Justification
[Why do we need this package?]

### Alternatives Considered
- [Alternative 1]: [Pros/Cons]
- [Alternative 2]: [Pros/Cons]

### Security Assessment
- Vulnerabilities: [None/Minor/Major]
- Maintenance: [Active/Stale]
- Downloads: [Weekly/Monthly]

### License
- License Type: [MIT/Apache/etc]
- Compatible: [Yes/No]
- Restrictions: [None/Specific]

### Impact
- Bundle Size: [+X KB]
- Performance: [Impact assessment]
- Maintenance: [Effort required]

Approved: [ ] Yes [ ] No [ ] Conditional
```

## Version Management

### Semantic Versioning
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Version Strategy

#### Internal Packages
```json
{
  "name": "@momo-merchant/shared-types",
  "version": "1.2.3",
  "private": true
}
```

#### Published Packages
```json
{
  "name": "@momo-merchant/api-client",
  "version": "1.2.3",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public"
  }
}
```

### Version Updates

#### Automated Updates
```bash
# Update patch versions
npm run deps:update:patch

# Update minor versions
npm run deps:update:minor

# Interactive update
npm run deps:update:interactive
```

#### Manual Updates
```bash
# Check outdated packages
npm run deps:outdated

# Update specific package
npm install package@latest --workspace=apps/mobile
```

## Publishing Strategy

### Internal Packages
- Published to private npm registry
- Versioned with semantic versioning
- Tagged with `latest` and `beta`

### Public Packages
- Published to public npm registry
- Requires security review
- Must include comprehensive documentation
- Follows open source best practices

### Publishing Process
```bash
# Build all packages
npm run build

# Run tests
npm run test

# Publish packages
npm run publish:all

# Tag release
git tag v1.2.3
git push origin v1.2.3
```

## Bundle Optimization

### Bundle Analysis
```bash
# Analyze bundle sizes
npm run analyze:bundle

# Generate bundle report
npm run bundle:report

# Monitor bundle size trends
npm run bundle:monitor
```

### Optimization Strategies

#### Tree Shaking
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false
  }
}
```

#### Code Splitting
```javascript
// Dynamic imports for code splitting
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard')
);
```

#### Dependency Optimization
```json
{
  "sideEffects": false,
  "module": "dist/esm/index.js",
  "main": "dist/cjs/index.js",
  "types": "dist/types/index.d.ts"
}
```

## Development Workflow

### Local Development
```bash
# Install all dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm run test

# Build all workspaces
npm run build
```

### Cross-Workspace Scripts
```json
{
  "scripts": {
    "install:all": "npm install --workspaces",
    "build:all": "npm run build --workspaces",
    "test:all": "npm run test --workspaces",
    "lint:all": "npm run lint --workspaces",
    "clean:all": "npm run clean --workspaces"
  }
}
```

## Monitoring and Maintenance

### Health Checks
```bash
# Package health check
npm run health:check

# Dependency analysis
npm run deps:analyze

# Security audit
npm run audit:full
```

### Automated Maintenance
```yaml
# .github/workflows/maintenance.yml
name: Package Maintenance
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  maintenance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run deps:update:patch
      - run: npm run audit:fix
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v4
        with:
          title: 'chore: weekly dependency updates'
          body: 'Automated weekly dependency updates'
```

## Troubleshooting

### Common Issues

#### 1. Workspace Not Found
```bash
# Check workspace configuration
npm run workspaces:list

# Reinstall workspaces
npm install --workspaces
```

#### 2. Dependency Conflicts
```bash
# Check for conflicts
npm ls --depth=0

# Resolve conflicts
npm install package@version --workspace=workspace-name
```

#### 3. Bundle Size Issues
```bash
# Analyze bundle
npm run analyze:bundle

# Find large dependencies
npm run bundle:analyze
```

#### 4. Publishing Failures
```bash
# Check authentication
npm whoami

# Verify package configuration
npm run publish:dry-run
```

## Compliance and Governance

### License Compliance
- All dependencies must have compatible licenses
- License information tracked and audited
- Third-party license notices included

### Security Compliance
- Dependencies scanned for vulnerabilities
- Security patches applied promptly
- Security incidents reported and tracked

### Audit Trail
- All package changes logged
- Dependency updates documented
- Security incidents tracked

## Tools and Utilities

### Development Tools
```json
{
  "devDependencies": {
    "npm-check-updates": "^16.0.0",
    "license-checker": "^25.0.0",
    "audit-ci": "^6.0.0",
    "webpack-bundle-analyzer": "^4.0.0",
    "npm-tree": "^0.1.0"
  }
}
```

### CI/CD Tools
```yaml
- name: Package Audit
  run: npm run audit:ci

- name: Bundle Analysis
  run: npm run analyze:bundle

- name: License Check
  run: npm run licenses:check
```

## Future Considerations

### Planned Improvements
- **Automated Dependency Updates**: Implement Dependabot
- **Bundle Size Monitoring**: Set up bundle size limits
- **Performance Budgets**: Define performance thresholds
- **Package Registry**: Set up private npm registry

### Scaling Considerations
- **Monorepo Management**: Tools for large monorepos
- **Build Optimization**: Faster builds for large codebases
- **Caching Strategies**: Advanced caching for CI/CD
- **Team Collaboration**: Better workspace isolation

---

*This package management policy ensures consistent, secure, and efficient dependency management across the MoMo Merchant Companion App monorepo.*