#!/bin/bash

# MoMo Merchant Companion App - Phase 0 Acceptance Testing
# This script validates all Phase 0 deliverables meet acceptance criteria

set -e

# Configuration
PROJECT_NAME="momo-merchant-app"
REQUIRED_NODE_VERSION="18.17.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

print_step() {
    echo -e "${CYAN}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

print_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Function to check if we're in the project directory
check_project_directory() {
    print_step "Checking project directory structure..."

    if [ ! -f "package.json" ]; then
        print_failure "package.json not found in root directory"
        return 1
    fi

    if [ ! -d "apps" ] || [ ! -d "services" ] || [ ! -d "packages" ]; then
        print_failure "Monorepo structure incomplete (missing apps/, services/, or packages/)"
        return 1
    fi

    if [ ! -d "docs" ] || [ ! -d "scripts" ] || [ ! -d "infra" ]; then
        print_failure "Project structure incomplete (missing docs/, scripts/, or infra/)"
        return 1
    fi

    print_success "Project directory structure is correct"
    return 0
}

# Function to test Node.js and npm setup
test_nodejs_setup() {
    print_step "Testing Node.js and npm setup..."

    # Check Node.js version
    if ! command -v node >/dev/null 2>&1; then
        print_failure "Node.js is not installed"
        return 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    if [[ "$NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]]; then
        print_warning "Node.js version is $NODE_VERSION, expected $REQUIRED_NODE_VERSION"
    else
        print_success "Node.js version is correct: $NODE_VERSION"
    fi

    # Check npm version
    if ! command -v npm >/dev/null 2>&1; then
        print_failure "npm is not installed"
        return 1
    fi

    NPM_VERSION=$(npm --version)
    print_success "npm version: $NPM_VERSION"

    # Check package.json validity
    if npm run --silent validate 2>/dev/null; then
        print_success "package.json is valid"
    else
        print_warning "package.json validation script not available (non-critical)"
    fi

    return 0
}

# Function to test monorepo configuration
test_monorepo_config() {
    print_step "Testing monorepo configuration..."

    # Check workspaces configuration
    if ! jq -e '.workspaces' package.json >/dev/null 2>&1; then
        print_failure "Workspaces not configured in package.json"
        return 1
    fi

    WORKSPACE_COUNT=$(jq -r '.workspaces | length' package.json 2>/dev/null || echo "0")
    if [ "$WORKSPACE_COUNT" -gt 0 ]; then
        print_success "Workspaces configured: $WORKSPACE_COUNT workspace patterns"
    else
        print_failure "No workspaces configured"
        return 1
    fi

    # Check for Turborepo configuration
    if [ -f "turbo.json" ]; then
        print_success "Turborepo configuration found"
    else
        print_failure "turbo.json not found"
        return 1
    fi

    return 0
}

# Function to test TypeScript configuration
test_typescript_config() {
    print_step "Testing TypeScript configuration..."

    # Check root tsconfig.json
    if [ ! -f "tsconfig.json" ]; then
        print_failure "Root tsconfig.json not found"
        return 1
    fi

    # Validate tsconfig.json
    if jq -e '.compilerOptions' tsconfig.json >/dev/null 2>&1; then
        print_success "Root TypeScript configuration is valid"
    else
        print_failure "Root TypeScript configuration is invalid"
        return 1
    fi

    # Check for strict settings
    STRICT_MODE=$(jq -r '.compilerOptions.strict' tsconfig.json 2>/dev/null || echo "false")
    if [ "$STRICT_MODE" = "true" ]; then
        print_success "TypeScript strict mode is enabled"
    else
        print_warning "TypeScript strict mode is not enabled"
    fi

    return 0
}

# Function to test linting and formatting
test_linting_formatting() {
    print_step "Testing linting and formatting setup..."

    # Check ESLint configuration
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
        print_success "ESLint configuration found"
    else
        print_failure "ESLint configuration not found"
        return 1
    fi

    # Check Prettier configuration
    if [ -f ".prettierrc" ] || [ -f ".prettierrc.js" ] || [ -f "prettier.config.js" ]; then
        print_success "Prettier configuration found"
    else
        print_failure "Prettier configuration not found"
        return 1
    fi

    # Test linting (if possible)
    if command -v npx >/dev/null 2>&1; then
        if npx eslint --version >/dev/null 2>&1; then
            print_success "ESLint is available via npx"
        else
            print_warning "ESLint not available via npx"
        fi
    fi

    return 0
}

# Function to test commit conventions
test_commit_conventions() {
    print_step "Testing commit convention setup..."

    # Check commitlint configuration
    if [ -f ".commitlintrc.js" ] || [ -f ".commitlintrc.json" ] || [ -f "commitlint.config.js" ]; then
        print_success "commitlint configuration found"
    else
        print_failure "commitlint configuration not found"
        return 1
    fi

    # Check husky setup
    if [ -d ".husky" ]; then
        print_success "Husky git hooks directory found"
    else
        print_failure ".husky directory not found"
        return 1
    fi

    # Check for pre-commit hook
    if [ -f ".husky/pre-commit" ]; then
        print_success "pre-commit hook configured"
    else
        print_warning "pre-commit hook not found"
    fi

    # Check for commit-msg hook
    if [ -f ".husky/commit-msg" ]; then
        print_success "commit-msg hook configured"
    else
        print_warning "commit-msg hook not found"
    fi

    return 0
}

# Function to test CI/CD pipeline
test_ci_cd_pipeline() {
    print_step "Testing CI/CD pipeline configuration..."

    # Check GitHub Actions workflows
    if [ -d ".github/workflows" ]; then
        WORKFLOW_COUNT=$(ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | wc -l)
        if [ "$WORKFLOW_COUNT" -gt 0 ]; then
            print_success "GitHub Actions workflows found: $WORKFLOW_COUNT"
        else
            print_failure "No GitHub Actions workflows found"
            return 1
        fi
    else
        print_failure ".github/workflows directory not found"
        return 1
    fi

    # Check for common CI files
    if [ -f ".github/dependabot.yml" ] || [ -f ".github/dependabot.yaml" ]; then
        print_success "Dependabot configuration found"
    else
        print_warning "Dependabot configuration not found"
    fi

    return 0
}

# Function to test documentation
test_documentation() {
    print_step "Testing documentation completeness..."

    # Check for essential documentation files
    DOC_FILES=("README.md" "CONTRIBUTING.md" "docs/Projects/" "docs/Areas/" "docs/Resources/" "docs/Archives/")

    for doc_file in "${DOC_FILES[@]}"; do
        if [ -e "$doc_file" ]; then
            print_success "Documentation found: $doc_file"
        else
            print_failure "Documentation missing: $doc_file"
            return 1
        fi
    done

    # Check for WAI templates
    if [ -d "docs/templates" ]; then
        TEMPLATE_COUNT=$(find docs/templates -name "*.md" | wc -l)
        if [ "$TEMPLATE_COUNT" -gt 0 ]; then
            print_success "WAI templates found: $TEMPLATE_COUNT"
        else
            print_warning "No WAI templates found in docs/templates"
        fi
    else
        print_warning "docs/templates directory not found"
    fi

    return 0
}

# Function to test package management
test_package_management() {
    print_step "Testing package management setup..."

    # Check package management scripts
    if [ -f "scripts/package-management.sh" ]; then
        print_success "Package management script found"
    else
        print_failure "Package management script not found"
        return 1
    fi

    # Check Changesets configuration
    if [ -d ".changeset" ]; then
        print_success "Changesets configuration found"
    else
        print_failure ".changeset directory not found"
        return 1
    fi

    # Check dependency management policy
    if [ -f "docs/Areas/A-Dependency-Policy.md" ]; then
        print_success "Dependency management policy documented"
    else
        print_failure "Dependency management policy not found"
        return 1
    fi

    return 0
}

# Function to test development environment setup
test_dev_environment() {
    print_step "Testing development environment setup..."

    # Check setup scripts
    if [ -f "scripts/setup-dev-environment.sh" ]; then
        print_success "Development environment setup script found"
    else
        print_failure "Development environment setup script not found"
        return 1
    fi

    # Check setup documentation
    if [ -f "docs/Resources/R-Development-Setup.md" ]; then
        print_success "Development setup documentation found"
    else
        print_failure "Development setup documentation not found"
        return 1
    fi

    # Check environment template
    if [ -f ".env.example" ]; then
        print_success "Environment template found"
    else
        print_warning ".env.example not found"
    fi

    return 0
}

# Function to test infrastructure setup
test_infrastructure() {
    print_step "Testing infrastructure setup..."

    # Check Terraform configuration
    if [ -d "infra/terraform" ]; then
        print_success "Terraform infrastructure directory found"
    else
        print_failure "Terraform infrastructure directory not found"
        return 1
    fi

    # Check remote state configuration
    if [ -f "infra/terraform/remote-state.tf" ]; then
        print_success "Terraform remote state configuration found"
    else
        print_failure "Terraform remote state configuration not found"
        return 1
    fi

    # Check bootstrap script
    if [ -f "infra/terraform/bootstrap-remote-state.sh" ]; then
        print_success "Remote state bootstrap script found"
    else
        print_failure "Remote state bootstrap script not found"
        return 1
    fi

    return 0
}

# Function to test security baseline
test_security_baseline() {
    print_step "Testing security baseline..."

    # Check for security-related files
    SECURITY_FILES=(".gitignore" "docs/Areas/A-Dependency-Policy.md")

    for sec_file in "${SECURITY_FILES[@]}"; do
        if [ -f "$sec_file" ]; then
            print_success "Security file found: $sec_file"
        else
            print_failure "Security file missing: $sec_file"
            return 1
        fi
    done

    # Check .gitignore for sensitive files
    if grep -q "node_modules" .gitignore 2>/dev/null; then
        print_success ".gitignore excludes node_modules"
    else
        print_warning ".gitignore may not exclude node_modules"
    fi

    if grep -q "\.env" .gitignore 2>/dev/null; then
        print_success ".gitignore excludes .env files"
    else
        print_warning ".gitignore may not exclude .env files"
    fi

    return 0
}

# Function to run all tests
run_all_tests() {
    print_header "Phase 0 Acceptance Testing"
    print_info "Running comprehensive validation of all Phase 0 deliverables..."
    echo ""

    # Track test execution
    ((TOTAL_TESTS = 10))  # Update this count as we add more tests

    # Run individual test suites
    check_project_directory
    test_nodejs_setup
    test_monorepo_config
    test_typescript_config
    test_linting_formatting
    test_commit_conventions
    test_ci_cd_pipeline
    test_documentation
    test_package_management
    test_dev_environment
    test_infrastructure
    test_security_baseline

    # Calculate results
    ((TOTAL_TESTS = PASSED_TESTS + FAILED_TESTS))

    echo ""
    print_header "Test Results Summary"
    echo -e "${GREEN}PASSED: $PASSED_TESTS${NC}"
    echo -e "${RED}FAILED: $FAILED_TESTS${NC}"
    echo -e "${YELLOW}WARNINGS: $WARNINGS${NC}"
    echo -e "TOTAL: $TOTAL_TESTS"

    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "SUCCESS RATE: ${SUCCESS_RATE}%"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo ""
        print_success "🎉 ALL TESTS PASSED! Phase 0 deliverables meet acceptance criteria."
        return 0
    else
        echo ""
        print_failure "❌ $FAILED_TESTS test(s) failed. Phase 0 acceptance criteria not fully met."
        print_info "Please review and fix the failed items before proceeding to Phase 1."
        return 1
    fi
}

# Function to show help
show_help() {
    cat << EOF
MoMo Merchant Companion App - Phase 0 Acceptance Testing

USAGE:
    $0 [OPTIONS]

DESCRIPTION:
    This script validates all Phase 0 bootstrap deliverables meet acceptance criteria.
    It tests infrastructure, processes, documentation, and quality gates.

TEST SUITES:
    - Project directory structure
    - Node.js and npm setup
    - Monorepo configuration
    - TypeScript configuration
    - Linting and formatting
    - Commit conventions
    - CI/CD pipeline
    - Documentation completeness
    - Package management
    - Development environment
    - Infrastructure setup
    - Security baseline

OPTIONS:
    --help, -h    Show this help message
    --verbose     Enable verbose output
    --quick       Run only critical tests

EXAMPLES:
    $0                    # Run all acceptance tests
    $0 --quick           # Run only critical tests
    $0 --help            # Show this help

EOF
}

# Main execution
main() {
    case "$1" in
        --help|-h)
            show_help
            exit 0
            ;;
        --quick)
            print_info "Running quick acceptance tests..."
            # Run only critical tests
            check_project_directory
            test_nodejs_setup
            test_monorepo_config
            ;;
        *)
            run_all_tests
            ;;
    esac
}

# Run main function
main "$@"