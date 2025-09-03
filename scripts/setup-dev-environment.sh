#!/bin/bash

# MoMo Merchant Companion App - Development Environment Setup
# This script sets up a complete development environment for the project

set -e

# Configuration
PROJECT_NAME="momo-merchant-app"
NODE_VERSION="18.17.0"
REACT_NATIVE_VERSION="0.72.6"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check OS
get_os() {
    case "$(uname -s)" in
        Darwin)
            echo "macos"
            ;;
        Linux)
            echo "linux"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

OS=$(get_os)
print_info "Detected OS: $OS"

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_deps=()

    # Check Git
    if ! command_exists git; then
        missing_deps+=("Git")
    else
        print_success "Git is installed: $(git --version)"
    fi

    # Check curl or wget
    if ! command_exists curl && ! command_exists wget; then
        missing_deps+=("curl or wget")
    else
        print_success "HTTP client available"
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing prerequisites: ${missing_deps[*]}"
        print_info "Please install missing dependencies and run this script again."
        exit 1
    fi
}

# Setup Node.js and npm
setup_nodejs() {
    print_header "Setting up Node.js and npm"

    # Check if nvm is installed
    if ! command_exists nvm; then
        print_step "Installing nvm (Node Version Manager)..."

        if command_exists curl; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        elif command_exists wget; then
            wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        fi

        # Source nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

        print_success "nvm installed successfully"
    else
        print_success "nvm is already installed"
        # Source nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Install and use specified Node.js version
    print_step "Installing Node.js $NODE_VERSION..."
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION"
    nvm alias default "$NODE_VERSION"

    print_success "Node.js $NODE_VERSION installed and set as default"

    # Verify installation
    print_info "Node.js version: $(node --version)"
    print_info "npm version: $(npm --version)"
}

# Setup React Native development environment
setup_react_native() {
    print_header "Setting up React Native Development Environment"

    case $OS in
        macos)
            setup_react_native_macos
            ;;
        linux)
            setup_react_native_linux
            ;;
        windows)
            setup_react_native_windows
            ;;
        *)
            print_error "Unsupported OS for React Native development: $OS"
            print_info "React Native development requires macOS, Linux, or Windows with WSL2"
            ;;
    esac
}

setup_react_native_macos() {
    print_step "Setting up React Native for macOS..."

    # Check if Xcode is installed
    if ! command_exists xcodebuild; then
        print_error "Xcode is not installed"
        print_info "Please install Xcode from the Mac App Store and run 'xcode-select --install'"
        print_info "Then run this script again."
        exit 1
    else
        print_success "Xcode is installed"
    fi

    # Install Xcode command line tools
    if ! xcode-select -p >/dev/null 2>&1; then
        print_step "Installing Xcode command line tools..."
        xcode-select --install
        print_success "Xcode command line tools installed"
    else
        print_success "Xcode command line tools are already installed"
    fi

    # Install Homebrew if not present
    if ! command_exists brew; then
        print_step "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        print_success "Homebrew installed"
    else
        print_success "Homebrew is already installed"
    fi

    # Install React Native dependencies
    print_step "Installing React Native dependencies..."

    # Install Node.js dependencies globally
    npm install -g react-native-cli @react-native-community/cli

    # Install iOS dependencies
    brew install cocoapods
    brew install watchman

    # Install Android dependencies (optional for iOS development)
    print_info "For Android development on macOS, you can install Android Studio separately"

    print_success "React Native dependencies installed for macOS"
}

setup_react_native_linux() {
    print_step "Setting up React Native for Linux..."

    # Install system dependencies
    print_step "Installing system dependencies..."

    # Update package list
    sudo apt-get update

    # Install Java (required for Android)
    sudo apt-get install -y openjdk-11-jdk

    # Install other dependencies
    sudo apt-get install -y curl unzip

    # Install Node.js global packages
    npm install -g react-native-cli @react-native-community/cli

    # Install watchman (optional but recommended)
    if command_exists apt-get; then
        sudo apt-get install -y watchman
    fi

    print_success "React Native dependencies installed for Linux"
}

setup_react_native_windows() {
    print_step "Setting up React Native for Windows..."

    print_info "For Windows development, it's recommended to use WSL2 with Ubuntu"
    print_info "Please ensure you have:"
    print_info "1. Windows Subsystem for Linux (WSL2) installed"
    print_info "2. Ubuntu distribution installed"
    print_info "3. Android Studio installed on Windows"
    print_info "4. Node.js installed in WSL2 environment"

    # Install Node.js global packages in WSL
    npm install -g react-native-cli @react-native-community/cli

    print_success "Basic React Native setup completed for Windows/WSL2"
}

# Setup project dependencies
setup_project_dependencies() {
    print_header "Setting up Project Dependencies"

    # Check if we're in the project directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi

    print_step "Installing project dependencies..."
    npm install

    print_success "Project dependencies installed"

    # Setup git hooks
    if [ -d ".husky" ]; then
        print_step "Setting up git hooks..."
        npm run prepare
        print_success "Git hooks configured"
    fi
}

# Setup development tools
setup_dev_tools() {
    print_header "Setting up Development Tools"

    # Install global development tools
    print_step "Installing global development tools..."

    npm install -g typescript
    npm install -g eslint
    npm install -g prettier
    npm install -g jest
    npm install -g ts-jest

    print_success "Global development tools installed"

    # Setup VS Code settings (if VS Code is available)
    if command_exists code; then
        print_step "Setting up VS Code workspace settings..."

        # Create .vscode directory if it doesn't exist
        mkdir -p .vscode

        # Create settings.json
        cat > .vscode/settings.json << EOF
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "typescript.suggest.autoImports": true,
    "typescript.updateImportsOnFileMove.enabled": "always",
    "emmet.includeLanguages": {
        "typescript": "html",
        "typescriptreact": "html"
    },
    "files.associations": {
        "*.css": "tailwindcss"
    }
}
EOF

        # Create extensions.json
        cat > .vscode/extensions.json << EOF
{
    "recommendations": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json",
        "christian-kohler.path-intellisense",
        "ms-vscode-remote.remote-containers",
        "ms-vscode.vscode-docker"
    ]
}
EOF

        print_success "VS Code workspace settings configured"
    fi
}

# Create environment files
setup_environment_files() {
    print_header "Setting up Environment Files"

    # Create .env.example
    if [ ! -f ".env.example" ]; then
        print_step "Creating .env.example file..."

        cat > .env.example << EOF
# MoMo Merchant Companion App - Environment Variables
# Copy this file to .env and fill in your values

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/momo_merchant_dev"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_REFRESH_SECRET="your-refresh-token-secret-here"

# AWS Configuration
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"

# Redis
REDIS_URL="redis://localhost:6379"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Mobile App
APP_ENV="development"
API_BASE_URL="http://localhost:3000/api"

# Feature Flags
ENABLE_SMS_PARSING="true"
ENABLE_OFFLINE_MODE="true"
ENABLE_BIOMETRICS="true"
EOF

        print_success ".env.example file created"
    fi

    # Remind about .env file
    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        print_info "Copy .env.example to .env and configure your environment variables"
        print_info "cp .env.example .env"
    fi
}

# Verify setup
verify_setup() {
    print_header "Verifying Development Environment Setup"

    local issues_found=0

    # Check Node.js
    if command_exists node; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js not found"
        ((issues_found++))
    fi

    # Check npm
    if command_exists npm; then
        print_success "npm: $(npm --version)"
    else
        print_error "npm not found"
        ((issues_found++))
    fi

    # Check React Native CLI
    if command_exists react-native; then
        print_success "React Native CLI: $(react-native --version | head -1)"
    else
        print_warning "React Native CLI not found (install with: npm install -g @react-native-community/cli)"
    fi

    # Check project dependencies
    if [ -d "node_modules" ]; then
        print_success "Project dependencies installed"
    else
        print_error "Project dependencies not installed"
        ((issues_found++))
    fi

    # Check TypeScript
    if command_exists tsc; then
        print_success "TypeScript: $(tsc --version)"
    else
        print_warning "TypeScript not found globally (available via npm scripts)"
    fi

    if [ $issues_found -gt 0 ]; then
        print_error "Found $issues_found issue(s) that need to be resolved"
        return 1
    else
        print_success "Development environment setup completed successfully!"
        return 0
    fi
}

# Print next steps
print_next_steps() {
    print_header "Next Steps"

    echo -e "${CYAN}1. Configure Environment Variables${NC}"
    echo "   cp .env.example .env"
    echo "   # Edit .env with your configuration"
    echo ""

    echo -e "${CYAN}2. Start Development${NC}"
    echo "   npm run dev        # Start development servers"
    echo "   npm run build      # Build for production"
    echo "   npm run test       # Run tests"
    echo ""

    echo -e "${CYAN}3. React Native Development${NC}"
    echo "   cd apps/mobile"
    echo "   npm run ios        # iOS development"
    echo "   npm run android    # Android development"
    echo ""

    echo -e "${CYAN}4. Database Setup${NC}"
    echo "   npm run db:migrate # Run database migrations"
    echo "   npm run db:seed    # Seed database with test data"
    echo ""

    echo -e "${CYAN}5. Useful Commands${NC}"
    echo "   npm run lint       # Run ESLint"
    echo "   npm run format     # Format code with Prettier"
    echo "   npm run typecheck  # Run TypeScript type checking"
    echo ""

    print_info "For detailed documentation, see:"
    print_info "- docs/Resources/R-Development-Setup.md"
    print_info "- CONTRIBUTING.md"
    print_info "- README.md"
}

# Main execution
main() {
    print_header "MoMo Merchant Companion App - Development Environment Setup"

    print_info "This script will set up your development environment for the MoMo Merchant Companion App."
    print_info "Make sure you have administrator/sudo privileges when running this script."
    echo ""

    # Confirm before proceeding
    read -p "Do you want to continue with the setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled by user."
        exit 0
    fi

    # Run setup steps
    check_prerequisites
    setup_nodejs
    setup_react_native
    setup_project_dependencies
    setup_dev_tools
    setup_environment_files

    # Verify setup
    if verify_setup; then
        print_next_steps
        print_success "🎉 Development environment setup completed successfully!"
    else
        print_error "Setup completed with issues. Please resolve the issues above and try again."
        exit 1
    fi
}

# Run main function
main "$@"