#!/bin/bash

# MoMo Merchant Companion App - Package Management Scripts
# This script provides utilities for managing packages in the monorepo

set -e

# Configuration
PROJECT_NAME="momo-merchant-app"

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

# Function to check if we're in the project directory
check_project_directory() {
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root directory."
        exit 1
    fi

    if [ ! -d "apps" ] || [ ! -d "services" ] || [ ! -d "packages" ]; then
        print_error "Monorepo structure not found. Expected apps/, services/, packages/ directories."
        exit 1
    fi
}

# Function to get workspace information
get_workspace_info() {
    print_header "Workspace Information"

    echo "Root package.json workspaces:"
    if [ -f "package.json" ]; then
        jq -r '.workspaces[]' package.json 2>/dev/null || echo "  Unable to parse workspaces"
    fi

    echo ""
    echo "Available workspaces:"

    # List apps
    if [ -d "apps" ]; then
        echo "Apps:"
        for app in apps/*; do
            if [ -d "$app" ] && [ -f "$app/package.json" ]; then
                name=$(jq -r '.name' "$app/package.json" 2>/dev/null || basename "$app")
                version=$(jq -r '.version' "$app/package.json" 2>/dev/null || "unknown")
                echo "  - $name ($version) - $app"
            fi
        done
    fi

    # List services
    if [ -d "services" ]; then
        echo "Services:"
        for service in services/*; do
            if [ -d "$service" ] && [ -f "$service/package.json" ]; then
                name=$(jq -r '.name' "$service/package.json" 2>/dev/null || basename "$service")
                version=$(jq -r '.version' "$service/package.json" 2>/dev/null || "unknown")
                echo "  - $name ($version) - $service"
            fi
        done
    fi

    # List packages
    if [ -d "packages" ]; then
        echo "Packages:"
        for pkg in packages/*; do
            if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
                name=$(jq -r '.name' "$pkg/package.json" 2>/dev/null || basename "$pkg")
                version=$(jq -r '.version' "$pkg/package.json" 2>/dev/null || "unknown")
                echo "  - $name ($version) - $pkg"
            fi
        done
    fi
}

# Function to check for dependency issues
check_dependencies() {
    print_header "Dependency Analysis"

    print_step "Checking for duplicate dependencies..."
    if command -v npx >/dev/null 2>&1; then
        npx @microsoft/dependency-cruiser --validate --config .dependency-cruiser.js 2>/dev/null || print_warning "Dependency cruiser config not found or failed"
    else
        print_warning "npx not available for dependency analysis"
    fi

    print_step "Checking for outdated packages..."
    if [ -f "package.json" ]; then
        npm outdated 2>/dev/null || print_info "No outdated packages or npm outdated failed"
    fi

    print_step "Checking for security vulnerabilities..."
    if command -v npm >/dev/null 2>&1; then
        npm audit --audit-level moderate 2>/dev/null || print_warning "npm audit failed or found issues"
    fi
}

# Function to clean workspaces
clean_workspaces() {
    print_header "Cleaning Workspaces"

    print_step "Removing node_modules from all workspaces..."

    # Clean root node_modules
    if [ -d "node_modules" ]; then
        print_info "Removing root node_modules..."
        rm -rf node_modules
    fi

    # Clean workspace node_modules
    for workspace in apps/* services/* packages/*; do
        if [ -d "$workspace" ]; then
            if [ -d "$workspace/node_modules" ]; then
                print_info "Removing $workspace/node_modules..."
                rm -rf "$workspace/node_modules"
            fi
        fi
    done

    print_step "Clearing npm cache..."
    if command -v npm >/dev/null 2>&1; then
        npm cache clean --force >/dev/null 2>&1 || print_warning "npm cache clean failed"
    fi

    print_step "Clearing yarn cache..."
    if command -v yarn >/dev/null 2>&1; then
        yarn cache clean >/dev/null 2>&1 || print_warning "yarn cache clean failed"
    fi

    print_success "Workspace cleanup completed"
}

# Function to install dependencies
install_dependencies() {
    print_header "Installing Dependencies"

    print_step "Installing root dependencies..."
    if [ -f "package.json" ]; then
        npm install
        print_success "Root dependencies installed"
    else
        print_error "package.json not found in root directory"
        exit 1
    fi

    print_step "Installing workspace dependencies..."
    if command -v npx >/dev/null 2>&1; then
        npx turbo run install --parallel
        print_success "Workspace dependencies installed"
    else
        print_warning "npx not available, installing workspaces manually..."
        for workspace in apps/* services/* packages/*; do
            if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
                print_info "Installing dependencies for $workspace..."
                (cd "$workspace" && npm install)
            fi
        done
    fi
}

# Function to build workspaces
build_workspaces() {
    print_header "Building Workspaces"

    print_step "Building all workspaces with Turborepo..."
    if command -v npx >/dev/null 2>&1; then
        npx turbo run build
        print_success "All workspaces built successfully"
    else
        print_warning "npx not available, building workspaces manually..."
        for workspace in packages/* services/* apps/*; do
            if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
                if jq -e '.scripts.build' "$workspace/package.json" >/dev/null 2>&1; then
                    print_info "Building $workspace..."
                    (cd "$workspace" && npm run build)
                fi
            fi
        done
    fi
}

# Function to run tests
run_tests() {
    print_header "Running Tests"

    print_step "Running tests across all workspaces..."
    if command -v npx >/dev/null 2>&1; then
        npx turbo run test
        print_success "All tests completed"
    else
        print_warning "npx not available, running tests manually..."
        for workspace in packages/* services/* apps/*; do
            if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
                if jq -e '.scripts.test' "$workspace/package.json" >/dev/null 2>&1; then
                    print_info "Running tests for $workspace..."
                    (cd "$workspace" && npm test)
                fi
            fi
        done
    fi
}

# Function to lint code
lint_code() {
    print_header "Linting Code"

    print_step "Running ESLint across all workspaces..."
    if command -v npx >/dev/null 2>&1; then
        npx turbo run lint
        print_success "Linting completed"
    else
        print_warning "npx not available, linting manually..."
        for workspace in packages/* services/* apps/*; do
            if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
                if jq -e '.scripts.lint' "$workspace/package.json" >/dev/null 2>&1; then
                    print_info "Linting $workspace..."
                    (cd "$workspace" && npm run lint)
                fi
            fi
        done
    fi
}

# Function to check package versions
check_versions() {
    print_header "Package Version Analysis"

    print_step "Checking for version mismatches..."

    # Create a temporary file to store package info
    temp_file=$(mktemp)

    # Collect all package names and versions
    for workspace in packages/* services/* apps/*; do
        if [ -d "$workspace" ] && [ -f "$workspace/package.json" ]; then
            name=$(jq -r '.name' "$workspace/package.json" 2>/dev/null)
            version=$(jq -r '.version' "$workspace/package.json" 2>/dev/null)
            if [ "$name" != "null" ] && [ "$version" != "null" ]; then
                echo "$name:$version:$workspace" >> "$temp_file"
            fi
        fi
    done

    # Check for duplicates
    duplicates=$(cut -d: -f1 "$temp_file" | sort | uniq -d)
    if [ -n "$duplicates" ]; then
        print_warning "Duplicate package names found:"
        echo "$duplicates"
    else
        print_success "No duplicate package names found"
    fi

    # Clean up
    rm -f "$temp_file"
}

# Function to update dependencies
update_dependencies() {
    print_header "Updating Dependencies"

    print_step "Checking for outdated dependencies..."
    if [ -f "package.json" ]; then
        npm outdated
    fi

    print_step "Updating dependencies interactively..."
    if command -v npx >/dev/null 2>&1; then
        npx npm-check-updates -u
        print_info "Dependencies updated. Run 'npm install' to install new versions."
    else
        print_warning "npx not available for dependency updates"
    fi
}

# Function to show help
show_help() {
    cat << EOF
MoMo Merchant Companion App - Package Management Script

USAGE:
    $0 [COMMAND]

COMMANDS:
    info          Show workspace information
    check         Check for dependency issues
    clean         Clean all node_modules and caches
    install       Install all dependencies
    build         Build all workspaces
    test          Run tests across all workspaces
    lint          Lint code across all workspaces
    versions      Check package versions
    update        Update dependencies interactively
    all           Run clean, install, build, test, lint

EXAMPLES:
    $0 info                    # Show workspace info
    $0 clean && $0 install     # Clean and reinstall
    $0 all                     # Full pipeline

EOF
}

# Main execution
main() {
    local command="$1"

    check_project_directory

    case "$command" in
        "info")
            get_workspace_info
            ;;
        "check")
            check_dependencies
            ;;
        "clean")
            clean_workspaces
            ;;
        "install")
            install_dependencies
            ;;
        "build")
            build_workspaces
            ;;
        "test")
            run_tests
            ;;
        "lint")
            lint_code
            ;;
        "versions")
            check_versions
            ;;
        "update")
            update_dependencies
            ;;
        "all")
            clean_workspaces
            install_dependencies
            build_workspaces
            run_tests
            lint_code
            ;;
        *)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"