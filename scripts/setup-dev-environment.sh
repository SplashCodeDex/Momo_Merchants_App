#!/bin/bash

# MoMo Merchant Companion App - Development Environment Setup
# This script sets up a complete development environment for the project

set -e

# Configuration
PROJECT_NAME="momo-merchant-app"
NODE_VERSION="23.6.1"
PYTHON_VERSION="3.11"
JAVA_VERSION="17"

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

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v lsb_release >/dev/null 2>&1; then
            DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
        DISTRO="windows"
    else
        OS="unknown"
        DISTRO="unknown"
    fi

    print_info "Detected OS: $OS ($DISTRO)"
}

# Function to check command availability
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        print_success "$1 is available"
        return 0
    else
        print_warning "$1 is not available"
        return 1
    fi
}

# Function to install Homebrew (macOS/Linux)
install_homebrew() {
    print_step "Installing Homebrew..."

    if [[ "$OS" == "macos" ]]; then
        if ! check_command brew; then
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            print_success "Homebrew installed"
        fi
    elif [[ "$OS" == "linux" ]]; then
        if ! check_command brew; then
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            print_success "Homebrew installed"
        fi
    fi
}

# Function to install Node.js
install_nodejs() {
    print_step "Installing Node.js $NODE_VERSION..."

    if check_command node; then
        CURRENT_VERSION=$(node --version)
        print_info "Node.js $CURRENT_VERSION is already installed"
        return
    fi

    if [[ "$OS" == "macos" ]]; then
        if check_command brew; then
            brew install node@$NODE_VERSION
            print_success "Node.js installed via Homebrew"
        else
            print_error "Homebrew not available for Node.js installation"
            exit 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        # Install via NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js installed via NodeSource"
    elif [[ "$OS" == "windows" ]]; then
        print_info "Please download Node.js from https://nodejs.org/"
        print_info "Run the installer and then re-run this script"
        exit 1
    fi
}

# Function to install React Native CLI and dependencies
install_react_native_deps() {
    print_step "Installing React Native development dependencies..."

    if [[ "$OS" == "macos" ]]; then
        # Install Xcode command line tools
        if ! xcode-select -p >/dev/null 2>&1; then
            print_info "Installing Xcode Command Line Tools..."
            xcode-select --install
            print_success "Xcode Command Line Tools installed"
        fi

        # Install Android Studio and SDK
        if ! check_command adb; then
            print_info "Please install Android Studio from https://developer.android.com/studio"
            print_info "Make sure to install Android SDK and set ANDROID_HOME"
        fi

        # Install iOS Simulator
        if ! check_command xcrun; then
            print_warning "Xcode not found. iOS development will not be available"
        fi

    elif [[ "$OS" == "linux" ]]; then
        # Install Android development tools
        sudo apt-get update
        sudo apt-get install -y android-tools-adb android-tools-fastboot

        # Install Java
        sudo apt-get install -y openjdk-$JAVA_VERSION-jdk

        print_info "For Android development, you may need to:"
        print_info "1. Install Android Studio"
        print_info "2. Set ANDROID_HOME environment variable"
        print_info "3. Add Android SDK tools to PATH"

    elif [[ "$OS" == "windows" ]]; then
        print_info "For React Native development on Windows:"
        print_info "1. Install Android Studio"
        print_info "2. Install JDK $JAVA_VERSION"
        print_info "3. Set up Android environment variables"
        print_info "4. Install Intel HAXM or use Android Emulator"
    fi
}

# Function to install development tools
install_dev_tools() {
    print_step "Installing development tools..."

    # Install Git (if not present)
    if ! check_command git; then
        if [[ "$OS" == "macos" ]]; then
            brew install git
        elif [[ "$OS" == "linux" ]]; then
            sudo apt-get install -y git
        fi
        print_success "Git installed"
    fi

    # Install Docker
    if ! check_command docker; then
        if [[ "$OS" == "macos" ]]; then
            brew install --cask docker
        elif [[ "$OS" == "linux" ]]; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
        fi
        print_success "Docker installed"
    fi

    # Install VS Code extensions
    if check_command code; then
        print_step "Installing VS Code extensions..."

        # Install essential extensions
        code --install-extension ms-vscode.vscode-typescript-next
        code --install-extension esbenp.prettier-vscode
        code --install-extension dbaeumer.vscode-eslint
        code --install-extension ms-vscode.vscode-json
        code --install-extension bradlc.vscode-tailwindcss
        code --install-extension ms-vscode-remote.remote-containers
        code --install-extension ms-vscode.vscode-docker

        print_success "VS Code extensions installed"
    fi
}

# Function to set up project
setup_project() {
    print_step "Setting up project..."

    # Check if we're in the project directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi

    # Install dependencies
    print_step "Installing project dependencies..."
    npm install
    print_success "Dependencies installed"

    # Set up Git hooks
    if [ -d ".husky" ]; then
        print_step "Setting up Git hooks..."
        npm run prepare
        print_success "Git hooks configured"
    fi

    # Create environment files
    if [ ! -f ".env.local" ]; then
        print_step "Creating environment template..."
        cat > .env.local << EOF
# Development Environment Variables
# Copy this file and customize for your local environment

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
EOF
        print_success "Environment template created (.env.local)"
        print_warning "Please customize .env.local with your local configuration"
    fi
}

# Function to set up local databases
setup_databases() {
    print_step "Setting up local databases..."

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_warning "Docker is not running. Skipping database setup."
        print_info "Start Docker and run this script again for database setup"
        return
    fi

    # Create docker-compose.yml for local development
    if [ ! -f "docker-compose.dev.yml" ]; then
        cat > docker-compose.dev.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: momo-merchant-postgres
    environment:
      POSTGRES_DB: momo_merchant_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: momo-merchant-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF
        print_success "Docker Compose file created (docker-compose.dev.yml)"
    fi

    # Start databases
    print_step "Starting local databases..."
    docker-compose -f docker-compose.dev.yml up -d
    print_success "Databases started"

    # Wait for PostgreSQL to be ready
    print_step "Waiting for PostgreSQL to be ready..."
    sleep 10

    # Test database connection
    if command -v psql >/dev/null 2>&1; then
        print_step "Testing database connection..."
        PGPASSWORD=password psql -h localhost -U postgres -d momo_merchant_dev -c "SELECT version();" >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_success "Database connection successful"
        else
            print_warning "Database connection test failed"
        fi
    fi
}

# Function to run health checks
run_health_checks() {
    print_header "Running Health Checks"

    local issues_found=0

    # Check Node.js
    if check_command node; then
        NODE_VER=$(node --version)
        print_success "Node.js: $NODE_VER"
    else
        print_error "Node.js not found"
        ((issues_found++))
    fi

    # Check npm
    if check_command npm; then
        NPM_VER=$(npm --version)
        print_success "npm: $NPM_VER"
    else
        print_error "npm not found"
        ((issues_found++))
    fi

    # Check Git
    if check_command git; then
        GIT_VER=$(git --version)
        print_success "Git: $GIT_VER"
    else
        print_error "Git not found"
        ((issues_found++))
    fi

    # Check Docker
    if check_command docker && docker info >/dev/null 2>&1; then
        DOCKER_VER=$(docker --version)
        print_success "Docker: $DOCKER_VER"
    else
        print_warning "Docker not available or not running"
    fi

    # Check project setup
    if [ -d "node_modules" ]; then
        print_success "Project dependencies installed"
    else
        print_error "Project dependencies not installed"
        ((issues_found++))
    fi

    # Check databases
    if docker ps | grep -q momo-merchant-postgres; then
        print_success "PostgreSQL container running"
    else
        print_warning "PostgreSQL container not running"
    fi

    if docker ps | grep -q momo-merchant-redis; then
        print_success "Redis container running"
    else
        print_warning "Redis container not running"
    fi

    if [ $issues_found -gt 0 ]; then
        print_warning "Found $issues_found issues. Please resolve them before proceeding."
        return 1
    else
        print_success "All health checks passed!"
        return 0
    fi
}

# Function to show usage
show_usage() {
    cat << EOF
MoMo Merchant Companion App - Development Environment Setup

USAGE:
    $0 [OPTIONS]

DESCRIPTION:
    This script sets up a complete development environment for the
    MoMo Merchant Companion App, including Node.js, React Native,
    databases, and development tools.

OPTIONS:
    --help, -h          Show this help message
    --quick             Skip optional components (databases, tools)
    --no-databases      Skip database setup
    --no-tools          Skip development tools installation
    --check-only        Only run health checks, don't install anything

EXAMPLES:
    $0                  # Complete setup
    $0 --quick         # Quick setup without databases
    $0 --check-only    # Only check current environment

COMPONENTS INSTALLED:
    - Node.js $NODE_VERSION
    - React Native development tools
    - Git and development tools
    - Docker and local databases
    - VS Code extensions
    - Project dependencies

REQUIREMENTS:
    - macOS, Linux, or Windows
    - Administrator/sudo access for installations
    - Internet connection for downloads

EOF
}

# Main execution
main() {
    # Parse arguments
    QUICK_SETUP=false
    SKIP_DATABASES=false
    SKIP_TOOLS=false
    CHECK_ONLY=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_usage
                exit 0
                ;;
            --quick)
                QUICK_SETUP=true
                shift
                ;;
            --no-databases)
                SKIP_DATABASES=true
                shift
                ;;
            --no-tools)
                SKIP_TOOLS=true
                shift
                ;;
            --check-only)
                CHECK_ONLY=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    print_header "MoMo Merchant Companion App"
    print_info "Development Environment Setup"
    print_info "Project: $PROJECT_NAME"

    detect_os

    if [ "$CHECK_ONLY" = true ]; then
        run_health_checks
        exit $?
    fi

    # Pre-flight checks
    print_header "Pre-flight Checks"

    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root is not recommended"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Install package managers
    if [[ "$OS" == "macos" ]] || [[ "$OS" == "linux" ]]; then
        install_homebrew
    fi

    # Install core components
    install_nodejs

    if [ "$QUICK_SETUP" = false ]; then
        install_react_native_deps

        if [ "$SKIP_TOOLS" = false ]; then
            install_dev_tools
        fi

        if [ "$SKIP_DATABASES" = false ]; then
            setup_databases
        fi
    fi

    # Set up project
    setup_project

    # Final health check
    if run_health_checks; then
        print_header "Setup Complete! 🎉"

        echo ""
        print_info "Next Steps:"
        echo "1. Customize .env.local with your configuration"
        echo "2. Start databases: docker-compose -f docker-compose.dev.yml up -d"
        echo "3. Run the project: npm run dev"
        echo "4. Open in browser: http://localhost:3000"
        echo ""
        print_info "For React Native development:"
        echo "- iOS: npm run ios (macOS only)"
        echo "- Android: npm run android"
        echo ""
        print_info "Documentation: docs/Resources/R-Development-Setup.md"
        echo ""
        print_success "Happy coding! 🚀"
    else
        print_error "Setup completed with issues. Please resolve them and try again."
        exit 1
    fi
}

# Run main function
main "$@"