# Development Environment Setup Guide

## Overview

This guide provides comprehensive instructions for setting up your development environment for the MoMo Merchant Companion App. The setup process is designed to ensure consistency across the development team and prevent "works on my machine" issues.

## Prerequisites

### System Requirements

- **Operating System**: macOS 12+, Linux (Ubuntu 20.04+), or Windows 10/11 with WSL2
- **RAM**: Minimum 8GB, Recommended 16GB+
- **Storage**: 20GB+ free space
- **Internet**: Stable broadband connection

### Required Software

- **Git**: Version control system
- **Node.js**: JavaScript runtime (managed via nvm)
- **npm**: Package manager (comes with Node.js)
- **React Native CLI**: Mobile development tools

### Platform-Specific Requirements

#### macOS
- Xcode 14+ (for iOS development)
- Xcode Command Line Tools
- Homebrew (package manager)
- CocoaPods (iOS dependency manager)

#### Linux (Ubuntu/Debian)
- Build tools: `build-essential`
- Java 11+ (for Android development)
- Watchman (optional, for better performance)

#### Windows
- Windows Subsystem for Linux 2 (WSL2)
- Ubuntu distribution (recommended)
- Android Studio (for Android development)

## Automated Setup

The easiest way to set up your development environment is using the automated setup script:

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd momo-merchants-app

# Run the setup script
chmod +x scripts/setup-dev-environment.sh
./scripts/setup-dev-environment.sh
```

The script will:
- Install Node.js via nvm
- Set up React Native development tools
- Install project dependencies
- Configure development tools
- Create environment files
- Verify the setup

## Manual Setup Instructions

If you prefer to set up the environment manually or need to troubleshoot the automated setup, follow these steps:

### 1. Install Node.js and npm

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source nvm
source ~/.bashrc

# Install Node.js 18.17.0
nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0

# Verify installation
node --version  # Should show v18.17.0
npm --version   # Should show 9.x.x
```

### 2. Install React Native CLI

```bash
# Install React Native CLI globally
npm install -g @react-native-community/cli react-native-cli

# Verify installation
react-native --version
```

### 3. Platform-Specific Setup

#### macOS Setup

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install iOS dependencies
brew install cocoapods
brew install watchman

# Install Android Studio (optional, for Android development)
# Download from: https://developer.android.com/studio
```

#### Linux Setup

```bash
# Update system packages
sudo apt-get update

# Install Java (required for Android)
sudo apt-get install -y openjdk-11-jdk

# Install other dependencies
sudo apt-get install -y curl unzip build-essential

# Install watchman (optional)
sudo apt-get install -y watchman
```

#### Windows Setup

```bash
# Enable WSL2 and install Ubuntu from Microsoft Store
# Follow: https://docs.microsoft.com/en-us/windows/wsl/install

# In WSL Ubuntu terminal:
sudo apt-get update
sudo apt-get install -y curl unzip build-essential openjdk-11-jdk

# Install Android Studio on Windows host
# Follow: https://developer.android.com/studio
```

### 4. Install Project Dependencies

```bash
# Install project dependencies
npm install

# Setup git hooks (if using husky)
npm run prepare
```

### 5. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL
# - JWT_SECRET
# - AWS_REGION
# - REDIS_URL
```

### 6. Setup Development Tools

```bash
# Install global development tools
npm install -g typescript eslint prettier jest ts-jest

# Verify installations
tsc --version
eslint --version
prettier --version
```

## VS Code Configuration

### Recommended Extensions

Install these extensions for the best development experience:

```json
{
    "recommendations": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json",
        "christian-kohler.path-intellisense",
        "ms-vscode-remote.remote-containers",
        "ms-vscode.vscode-docker",
        "msjsdiag.debugger-for-chrome",
        "formulahendry.auto-rename-tag",
        "bradlc.vscode-tailwindcss"
    ]
}
```

### Workspace Settings

The setup script creates optimized VS Code settings. Key configurations:

```json
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "typescript.suggest.autoImports": true,
    "typescript.updateImportsOnFileMove.enabled": "always"
}
```

## Development Workflow

### Starting Development

```bash
# Start all development servers
npm run dev

# Or start specific services
npm run dev:mobile    # React Native development
npm run dev:backend   # Backend API development
npm run dev:web       # Admin dashboard development
```

### Available Scripts

```bash
# Development
npm run dev              # Start all development servers
npm run build            # Build all packages
npm run clean            # Clean build artifacts

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript type checking

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:reset         # Reset database

# Mobile Development
cd apps/mobile
npm run ios              # Start iOS development
npm run android          # Start Android development
npm run start            # Start Metro bundler
```

## Mobile Development Setup

### iOS Development

1. **Install Xcode**: Download from Mac App Store
2. **Install CocoaPods**: `sudo gem install cocoapods`
3. **Setup iOS Simulator**:
   ```bash
   cd apps/mobile/ios
   pod install
   cd ..
   npm run ios
   ```

### Android Development

1. **Install Android Studio**
2. **Configure Android SDK**:
   - Open Android Studio
   - Go to SDK Manager
   - Install Android 13 (API 33)
   - Install Android SDK Build-Tools 33.0.0
3. **Setup Environment Variables**:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. **Create Android Virtual Device**:
   ```bash
   cd apps/mobile
   npm run android
   ```

## Troubleshooting

### Common Issues

#### 1. Node.js Version Issues
```bash
# Check current version
node --version

# Switch to correct version
nvm use 18.17.0

# Set as default
nvm alias default 18.17.0
```

#### 2. React Native Metro Bundler Issues
```bash
# Clear Metro cache
npm run start -- --reset-cache

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

#### 3. iOS Build Issues
```bash
# Clean iOS build
cd apps/mobile/ios
rm -rf build
pod install
cd ..
npm run ios
```

#### 4. Android Build Issues
```bash
# Clean Android build
cd apps/mobile/android
./gradlew clean
cd ..
npm run android
```

#### 5. Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Getting Help

1. **Check Documentation**: Review this guide and project README
2. **Team Chat**: Ask questions in the development channel
3. **GitHub Issues**: Search existing issues or create new ones
4. **Code Reviews**: Learn from existing code and patterns

## Environment Validation

Run these commands to verify your setup:

```bash
# Check Node.js and npm
node --version
npm --version

# Check React Native
react-native --version

# Check project setup
npm run typecheck
npm run lint
npm run test

# Check mobile setup
cd apps/mobile
npm run start
```

## Next Steps

Once your development environment is set up:

1. **Read the Project Overview**: Check `README.md` for project structure
2. **Review Contributing Guidelines**: See `CONTRIBUTING.md` for development workflow
3. **Explore the Codebase**: Familiarize yourself with the monorepo structure
4. **Start with a Small Task**: Pick an issue from the backlog to get started
5. **Join Team Standups**: Participate in daily development discussions

## Maintenance

### Keeping Your Environment Updated

```bash
# Update Node.js
nvm install node  # Latest LTS
nvm use node
nvm alias default node

# Update global packages
npm update -g

# Update project dependencies
npm update

# Update React Native
npm install react-native@latest
cd apps/mobile/ios && pod update
```

### Regular Cleanup

```bash
# Clear npm cache
npm cache clean --force

# Clear React Native cache
cd apps/mobile
npm run start -- --reset-cache

# Clear iOS build artifacts
cd apps/mobile/ios
rm -rf build
```

---

*This guide is maintained by the development team. Please update it when you discover new setup requirements or troubleshooting solutions.*