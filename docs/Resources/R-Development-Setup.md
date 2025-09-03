# Development Environment Setup Guide

## Overview

This guide provides comprehensive instructions for setting up a development environment for the MoMo Merchant Companion App. The setup process is automated through scripts, but this guide explains each component and provides manual setup options.

## Quick Start

### Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/momo-merchant-app.git
cd momo-merchant-app

# Run the automated setup script
./scripts/setup-dev-environment.sh

# For quick setup (skip databases)
./scripts/setup-dev-environment.sh --quick

# Check environment health
./scripts/setup-dev-environment.sh --check-only
```

### Manual Setup

If the automated script doesn't work for your system, follow the manual setup instructions below.

---

## Prerequisites

### System Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| **Node.js** | 18.17+ | LTS version recommended |
| **npm** | 8.0+ | Comes with Node.js |
| **Git** | 2.30+ | Version control |
| **Docker** | 20.0+ | For local databases |
| **Python** | 3.9+ | For some development tools |

### Hardware Requirements

- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB free space
- **CPU**: Multi-core processor
- **Network**: Stable internet connection

---

## Platform-Specific Setup

### macOS Setup

#### 1. Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Install Node.js
```bash
brew install node@18
echo 'export PATH="/usr/local/opt/node@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### 3. Install React Native Dependencies
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Android Studio (for Android development)
# Download from: https://developer.android.com/studio

# Install iOS Simulator dependencies
sudo gem install cocoapods
```

#### 4. Install Development Tools
```bash
brew install git docker docker-compose
brew install --cask visual-studio-code
```

### Linux Setup (Ubuntu/Debian)

#### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Install React Native Dependencies
```bash
# Install Java
sudo apt install -y openjdk-17-jdk

# Install Android development tools
sudo apt install -y android-tools-adb android-tools-fastboot

# Install build tools
sudo apt install -y build-essential
```

#### 4. Install Development Tools
```bash
sudo apt install -y git docker.io docker-compose
sudo usermod -aG docker $USER
```

### Windows Setup

#### 1. Install Chocolatey
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
```

#### 2. Install Node.js
```powershell
choco install nodejs-lts
```

#### 3. Install React Native Dependencies
```powershell
# Install Java
choco install openjdk17

# Install Android Studio
choco install androidstudio

# Install Python (if not present)
choco install python
```

#### 4. Install Development Tools
```powershell
choco install git docker-desktop vscode
```

---

## Project Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/momo-merchant-app.git
cd momo-merchant-app
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
npm install

# Install iOS dependencies (macOS only)
cd apps/mobile && npm run ios:install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your local configuration
nano .env.local
```

#### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/momo_merchant_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-development-jwt-secret-change-in-production"

# AWS (for local development)
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# App Configuration
NODE_ENV="development"
PORT=3000

# React Native
EXPO_TOKEN="your-expo-token"
```

### 4. Set Up Local Databases
```bash
# Start databases
docker-compose -f docker-compose.dev.yml up -d

# Wait for databases to be ready
sleep 10

# Test database connection
npm run db:test
```

### 5. Initialize Database
```bash
# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

---

## Development Workflows

### Starting the Development Server

#### Mobile App (React Native)
```bash
# Start Metro bundler
npm run mobile:dev

# iOS Simulator (macOS only)
npm run mobile:ios

# Android Emulator/Device
npm run mobile:android

# Web version for testing
npm run mobile:web
```

#### Backend API
```bash
# Start development server
npm run api:dev

# With debugging
npm run api:debug

# API will be available at http://localhost:3000
```

#### Admin Dashboard (Next.js)
```bash
# Start development server
npm run admin:dev

# Dashboard will be available at http://localhost:3001
```

### Running Tests

#### Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific workspace tests
npm run test --workspace=apps/mobile
npm run test --workspace=services/app-api

# Watch mode
npm run test:watch
```

#### Integration Tests
```bash
# Run integration tests
npm run test:integration

# With coverage
npm run test:integration:coverage
```

#### End-to-End Tests
```bash
# Start test databases
npm run test:e2e:setup

# Run E2E tests
npm run test:e2e

# Clean up
npm run test:e2e:cleanup
```

### Code Quality

#### Linting
```bash
# Lint all workspaces
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Lint specific workspace
npm run lint --workspace=apps/mobile
```

#### Type Checking
```bash
# Type check all workspaces
npm run typecheck

# Type check specific workspace
npm run typecheck --workspace=services/app-api
```

#### Formatting
```bash
# Format all code
npm run format

# Check formatting
npm run format:check
```

---

## IDE Configuration

### Visual Studio Code

#### Recommended Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker",
    "ms-vscode.vscode-jest",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-git-graph"
  ]
}
```

#### Workspace Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### IntelliJ IDEA / WebStorm

#### Recommended Plugins
- TypeScript
- Prettier
- ESLint
- Tailwind CSS
- React Native Console

---

## Database Management

### Local Development Database

#### PostgreSQL
```bash
# Connect to database
psql postgresql://postgres:password@localhost:5432/momo_merchant_dev

# View tables
\d

# View data
SELECT * FROM users LIMIT 5;
```

#### Redis
```bash
# Connect to Redis
redis-cli

# View keys
KEYS *

# View key value
GET mykey
```

### Database Tools

#### pgAdmin (Database GUI)
```bash
# Install pgAdmin
# macOS: brew install --cask pgadmin4
# Linux: sudo apt install pgadmin4
# Windows: Download from pgadmin.org

# Connect to local database
# Host: localhost
# Port: 5432
# Database: momo_merchant_dev
# Username: postgres
# Password: password
```

#### RedisInsight (Redis GUI)
```bash
# Download from redis.com/redis-enterprise/redis-insight

# Connect to local Redis
# Host: localhost
# Port: 6379
```

---

## API Testing

### Postman Collections

#### Import Collection
```bash
# Collections are available in docs/api/
# Import momo-merchant-api.postman_collection.json
```

#### Environment Setup
```json
{
  "baseUrl": "http://localhost:3000",
  "databaseUrl": "postgresql://postgres:password@localhost:5432/momo_merchant_dev",
  "jwtSecret": "your-development-jwt-secret"
}
```

### cURL Examples

#### Health Check
```bash
curl -X GET http://localhost:3000/health
```

#### User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "password": "password123",
    "businessName": "Test Business"
  }'
```

#### Transaction Creation
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "deposit",
    "amount": 100.00,
    "customerNumber": "+0987654321",
    "customerName": "John Doe"
  }'
```

---

## Debugging

### React Native Debugging

#### Metro Bundler
```bash
# Clear Metro cache
npm run mobile:clean

# Start with verbose logging
npm run mobile:dev -- --verbose
```

#### Device Debugging
```bash
# iOS Device Logs
xcrun simctl spawn booted log stream --level=debug --predicate 'process == "YourApp"'

# Android Device Logs
adb logcat | grep ReactNative
```

### Backend Debugging

#### Node.js Inspector
```bash
# Start with debugging enabled
npm run api:debug

# Connect debugger at chrome://inspect
```

#### Database Query Logging
```bash
# Enable query logging in .env.local
DATABASE_DEBUG=true
```

### Network Debugging

#### API Request Logging
```bash
# Enable request logging
DEBUG=api:*
npm run api:dev
```

#### Charles Proxy / mitmproxy
```bash
# Install Charles Proxy
# Configure mobile device proxy settings
# Inspect API requests and responses
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### 2. Database Connection Issues
```bash
# Check if database is running
docker ps | grep postgres

# Restart database
docker-compose -f docker-compose.dev.yml restart postgres

# Reset database
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

#### 3. Node Modules Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

#### 4. React Native Metro Issues
```bash
# Clear Metro cache
npm run mobile:clean

# Reset Metro
npm run mobile:reset
```

#### 5. Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

### Getting Help

#### Documentation
- **API Documentation**: `docs/api/README.md`
- **Architecture Guide**: `docs/ARCHITECTURE_GUIDE.md`
- **Contributing Guide**: `CONTRIBUTING.md`

#### Support Channels
- **GitHub Issues**: For bugs and feature requests
- **Slack/Teams**: For team communication
- **Documentation Wiki**: For detailed guides

#### Debug Commands
```bash
# System information
npm run info

# Environment health check
./scripts/setup-dev-environment.sh --check-only

# Dependency analysis
npm run deps:check
```

---

## Performance Optimization

### Development Performance

#### 1. Fast Refresh
```javascript
// Enable Fast Refresh in React Native
// Already configured in metro.config.js
```

#### 2. Bundle Splitting
```javascript
// Code splitting for better performance
const AdminApp = lazy(() => import('./AdminApp'));
```

#### 3. Development Database
```bash
# Use lightweight database for development
# PostgreSQL with minimal configuration
```

### Build Optimization

#### 1. Build Caching
```bash
# Turborepo caching is already configured
npm run build  # Uses cache automatically
```

#### 2. Development vs Production
```bash
# Development build (fast)
npm run dev

# Production build (optimized)
npm run build
```

---

## Security Considerations

### Development Security

#### 1. Environment Variables
```bash
# Never commit secrets
# Use .env.local for local development
# Use secure secret management for production
```

#### 2. Database Security
```bash
# Use strong passwords
# Limit database access
# Use database migrations for schema changes
```

#### 3. API Security
```bash
# Use HTTPS in production
# Implement proper authentication
# Validate all inputs
# Use rate limiting
```

### Code Security

#### 1. Dependency Scanning
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

#### 2. Code Analysis
```bash
# Run security linting
npm run security:check

# Check for secrets in code
npm run secrets:check
```

---

## Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   ```bash
   # Follow conventional commits
   # Write tests for new features
   # Update documentation
   ```

3. **Run Quality Checks**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   # Create PR with description
   ```

### Code Standards

#### Commit Messages
```bash
# Good commit messages
feat: add user authentication
fix: resolve database connection issue
docs: update API documentation
refactor: simplify transaction logic

# Bad commit messages
fixed bug
updated code
changes
```

#### Code Style
```javascript
// Use consistent formatting
// Follow ESLint rules
// Use TypeScript for type safety
// Write comprehensive tests
```

---

## Next Steps

### After Setup

1. **Explore the Codebase**
   ```bash
   # Read architecture documentation
   cat docs/ARCHITECTURE_GUIDE.md

   # Understand project structure
   tree -I node_modules

   # Review API documentation
   cat docs/api/README.md
   ```

2. **Run Example Features**
   ```bash
   # Test basic functionality
   npm run test:e2e -- --grep "user registration"

   # Explore admin dashboard
   npm run admin:dev
   ```

3. **Learn the Tech Stack**
   - React Native for mobile development
   - Node.js/Express for backend API
   - PostgreSQL for data storage
   - Redis for caching
   - TypeScript for type safety

### Getting Started with Development

1. **Pick a Task**: Check the ToDo.md for available tasks
2. **Understand Requirements**: Read the relevant documentation
3. **Write Code**: Follow the established patterns
4. **Write Tests**: Ensure test coverage for new features
5. **Test Locally**: Verify functionality works as expected
6. **Create PR**: Submit your changes for review

---

*This guide is continuously updated. Check for the latest version in the repository.*