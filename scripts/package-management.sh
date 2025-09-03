#!/bin/bash

# MoMo Merchant Companion App - Package Management Script
# Comprehensive package management for the monorepo

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Function to check if we're in the project root
check_project_root() {
    if [ ! -f "package.json" ] || [ ! -d "apps" ] || [ ! -d "services" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_step "Installing project dependencies..."

    # Install root dependencies
    npm install

    # Install workspace dependencies
    npm run install:all

    print_success "Dependencies installed successfully"
}

# Function to run security audit
run_security_audit() {
    print_step "Running security audit..."

    # Run npm audit
    if npm audit --audit-level=moderate; then
        print_success "Security audit passed"
    else
        print_warning "Security vulnerabilities found"
        echo "Run 'npm audit fix' to attempt automatic fixes"
        echo "Review vulnerabilities manually for critical issues"
    fi

    # Run additional security checks if available
    if command -v audit-ci >/dev/null 2>&1; then
        print_step "Running audit-ci for comprehensive security check..."
        npx audit-ci --config audit-ci.json
    fi
}

# Function to update dependencies
update_dependencies() {
    local update_type="${1:-patch}"

    print_step "Updating $update_type dependencies..."

    case $update_type in
        "patch")
            npm update --workspaces
            ;;
        "minor")
            npx npm-check-updates -u --target minor
            ;;
        "major")
            npx npm-check-updates -u --target latest
            ;;
        *)
            print_error "Invalid update type. Use: patch, minor, or major"
            exit 1
            ;;
    esac

    print_success "Dependencies updated to $update_type versions"
    print_info "Run 'npm install' to install updated packages"
}

# Function to check for outdated packages
check_outdated() {
    print_step "Checking for outdated packages..."

    echo "Root packages:"
    npm outdated

    echo -e "\nWorkspace packages:"
    npm run outdated:all 2>/dev/null || echo "No outdated:all script found"

    print_info "Use './scripts/package-management.sh update [type]' to update packages"
}

# Function to clean node_modules and caches
clean_cache() {
    print_step "Cleaning caches and node_modules..."

    # Remove node_modules
    rm -rf node_modules
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

    # Clean npm cache
    npm cache clean --force

    # Clean workspaces
    npm run clean:all 2>/dev/null || echo "No clean:all script found"

    print_success "Cache and node_modules cleaned"
    print_info "Run 'npm install' to reinstall dependencies"
}

# Function to analyze bundle sizes
analyze_bundle() {
    print_step "Analyzing bundle sizes..."

    if [ -d "apps/mobile" ]; then
        print_info "Analyzing mobile app bundle..."
        cd apps/mobile
        npx react-native-bundle-analyzer 2>/dev/null || echo "Bundle analyzer not available"
        cd "$PROJECT_ROOT"
    fi

    # Check if webpack-bundle-analyzer is available
    if [ -f "package.json" ] && grep -q "webpack-bundle-analyzer" package.json; then
        print_info "Running webpack bundle analysis..."
        npm run analyze:bundle 2>/dev/null || echo "No analyze:bundle script found"
    fi

    print_success "Bundle analysis completed"
}

# Function to check license compliance
check_licenses() {
    print_step "Checking license compliance..."

    if command -v license-checker >/dev/null 2>&1; then
        npx license-checker --production --csv > license-report.csv
        print_success "License report generated: license-report.csv"
    else
        print_warning "license-checker not installed"
        print_info "Install with: npm install -g license-checker"
    fi
}

# Function to validate workspace configuration
validate_workspaces() {
    print_step "Validating workspace configuration..."

    # Check package.json workspaces
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        return 1
    fi

    if ! grep -q '"workspaces"' package.json; then
        print_error "Workspaces not configured in package.json"
        return 1
    fi

    # Check workspace directories
    local workspaces=$(node -p "require('./package.json').workspaces || []" 2>/dev/null)

    for workspace in $workspaces; do
        if [ ! -d "$workspace" ]; then
            print_warning "Workspace directory not found: $workspace"
        elif [ ! -f "$workspace/package.json" ]; then
            print_warning "Workspace package.json not found: $workspace/package.json"
        else
            print_success "Workspace valid: $workspace"
        fi
    done

    print_success "Workspace validation completed"
}

# Function to generate dependency tree
generate_dep_tree() {
    print_step "Generating dependency tree..."

    if command -v npm-tree >/dev/null 2>&1; then
        npm-tree > dependency-tree.txt
        print_success "Dependency tree generated: dependency-tree.txt"
    else
        print_info "npm-tree not available, using npm ls"
        npm ls --depth=0 > dependency-tree.txt
        print_success "Basic dependency list generated: dependency-tree.txt"
    fi
}

# Function to run workspace scripts
run_workspace_scripts() {
    local script_name="$1"

    if [ -z "$script_name" ]; then
        print_error "Script name required"
        return 1
    fi

    print_step "Running '$script_name' in all workspaces..."

    # Run script in root
    if npm run "$script_name" >/dev/null 2>&1; then
        print_success "Root: $script_name completed"
    fi

    # Run script in workspaces
    for workspace in apps/* services/* packages/*; do
        if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
            cd "$workspace"
            if npm run "$script_name" >/dev/null 2>&1; then
                print_success "$workspace: $script_name completed"
            fi
            cd "$PROJECT_ROOT"
        fi
    done
}

# Function to show usage
show_usage() {
    cat << EOF
MoMo Merchant Companion App - Package Management

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    install              Install all dependencies
    audit                Run security audit
    update [type]        Update dependencies (patch/minor/major)
    outdated             Check for outdated packages
    clean                Clean caches and node_modules
    analyze              Analyze bundle sizes
    licenses             Check license compliance
    validate             Validate workspace configuration
    deps                 Generate dependency tree
    run <script>         Run script in all workspaces

EXAMPLES:
    $0 install                    # Install all dependencies
    $0 audit                      # Run security audit
    $0 update patch              # Update patch versions
    $0 outdated                  # Check outdated packages
    $0 clean                     # Clean caches
    $0 analyze                   # Analyze bundle sizes
    $0 licenses                  # Check licenses
    $0 validate                  # Validate workspaces
    $0 deps                      # Generate dependency tree
    $0 run build                 # Run build in all workspaces

WORKSPACE SCRIPTS:
    The following scripts can be run across all workspaces:
    - build: Build all workspaces
    - test: Run tests in all workspaces
    - lint: Lint all workspaces
    - typecheck: Type check all workspaces

EOF
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    check_project_root

    case "${1:-help}" in
        "install")
            install_dependencies
            ;;
        "audit")
            run_security_audit
            ;;
        "update")
            update_dependencies "${2:-patch}"
            ;;
        "outdated")
            check_outdated
            ;;
        "clean")
            clean_cache
            ;;
        "analyze")
            analyze_bundle
            ;;
        "licenses")
            check_licenses
            ;;
        "validate")
            validate_workspaces
            ;;
        "deps")
            generate_dep_tree
            ;;
        "run")
            if [ -z "$2" ]; then
                print_error "Script name required for 'run' command"
                exit 1
            fi
            run_workspace_scripts "$2"
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"