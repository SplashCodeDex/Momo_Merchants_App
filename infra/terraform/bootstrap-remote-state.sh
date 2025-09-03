#!/bin/bash

# Bootstrap Terraform Remote State
# This script creates the S3 bucket and DynamoDB table for Terraform remote state

set -e

# Configuration
PROJECT_NAME="momo-merchant"
ENVIRONMENT=${1:-"dev"}
REGION="eu-west-1"

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

# Function to check AWS CLI configuration
check_aws_cli() {
    print_step "Checking AWS CLI configuration..."

    if ! command -v aws >/dev/null 2>&1; then
        print_error "AWS CLI is not installed. Please install it first."
        print_info "Installation: https://aws.amazon.com/cli/"
        exit 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS CLI configured for account: $ACCOUNT_ID"
}

# Function to create S3 bucket for Terraform state
create_s3_bucket() {
    local bucket_name="$PROJECT_NAME-$ENVIRONMENT-terraform-state"

    print_step "Creating S3 bucket for Terraform state: $bucket_name"

    # Check if bucket already exists
    if aws s3 ls "s3://$bucket_name" 2>/dev/null; then
        print_warning "S3 bucket $bucket_name already exists"
        return 0
    fi

    # Create bucket
    if aws s3 mb "s3://$bucket_name" --region $REGION; then
        print_success "S3 bucket created: $bucket_name"
    else
        print_error "Failed to create S3 bucket"
        return 1
    fi

    # Enable versioning
    print_step "Enabling versioning on S3 bucket..."
    aws s3api put-bucket-versioning \
        --bucket $bucket_name \
        --versioning-configuration Status=Enabled
    print_success "Versioning enabled"

    # Enable encryption
    print_step "Enabling server-side encryption..."
    aws s3api put-bucket-encryption \
        --bucket $bucket_name \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    print_success "Encryption enabled"

    # Block public access
    print_step "Blocking public access..."
    aws s3api put-public-access-block \
        --bucket $bucket_name \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }'
    print_success "Public access blocked"

    # Add lifecycle configuration for cost optimization
    print_step "Configuring lifecycle policy..."
    aws s3api put-bucket-lifecycle-configuration \
        --bucket $bucket_name \
        --lifecycle-configuration '{
            "Rules": [{
                "ID": "Delete old versions",
                "Status": "Enabled",
                "NoncurrentVersionExpiration": {
                    "NoncurrentDays": 30
                },
                "AbortIncompleteMultipartUpload": {
                    "DaysAfterInitiation": 7
                }
            }]
        }'
    print_success "Lifecycle policy configured"
}

# Function to create DynamoDB table for state locking
create_dynamodb_table() {
    local table_name="$PROJECT_NAME-$ENVIRONMENT-terraform-locks"

    print_step "Creating DynamoDB table for state locking: $table_name"

    # Check if table already exists
    if aws dynamodb describe-table --table-name $table_name >/dev/null 2>&1; then
        print_warning "DynamoDB table $table_name already exists"
        return 0
    fi

    # Create table
    if aws dynamodb create-table \
        --table-name $table_name \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --tags "Key=Name,Value=$table_name" \
               "Key=Environment,Value=$ENVIRONMENT" \
               "Key=Project,Value=$PROJECT_NAME" \
               "Key=ManagedBy,Value=Terraform"; then
        print_success "DynamoDB table created: $table_name"
    else
        print_error "Failed to create DynamoDB table"
        return 1
    fi

    # Wait for table to be active
    print_step "Waiting for table to become active..."
    aws dynamodb wait table-exists --table-name $table_name
    print_success "Table is now active"
}

# Function to create backend configuration file
create_backend_config() {
    local config_file="environments/$ENVIRONMENT/backend.tfvars"

    print_step "Creating backend configuration file: $config_file"

    cat > $config_file << EOF
# Terraform Backend Configuration for $ENVIRONMENT Environment
# This file is generated by bootstrap-remote-state.sh

bucket         = "$PROJECT_NAME-$ENVIRONMENT-terraform-state"
key            = "terraform.tfstate"
region         = "$REGION"
dynamodb_table = "$PROJECT_NAME-$ENVIRONMENT-terraform-locks"
encrypt        = true

# Additional configuration
profile        = ""
role_arn       = ""
external_id    = ""
session_name   = "terraform-$ENVIRONMENT"
EOF

    print_success "Backend configuration created: $config_file"
}

# Function to test backend configuration
test_backend_config() {
    print_step "Testing backend configuration..."

    local config_file="environments/$ENVIRONMENT/backend.tfvars"

    if [ ! -f "$config_file" ]; then
        print_error "Backend configuration file not found: $config_file"
        return 1
    fi

    # Test S3 bucket access
    if aws s3 ls "s3://$PROJECT_NAME-$ENVIRONMENT-terraform-state" >/dev/null 2>&1; then
        print_success "S3 bucket access confirmed"
    else
        print_error "Cannot access S3 bucket"
        return 1
    fi

    # Test DynamoDB table access
    if aws dynamodb describe-table --table-name "$PROJECT_NAME-$ENVIRONMENT-terraform-locks" >/dev/null 2>&1; then
        print_success "DynamoDB table access confirmed"
    else
        print_error "Cannot access DynamoDB table"
        return 1
    fi

    print_success "Backend configuration test passed"
}

# Function to create Terraform workspace
create_terraform_workspace() {
    print_step "Setting up Terraform workspace..."

    # Initialize Terraform (if not already done)
    if [ ! -d ".terraform" ]; then
        terraform init -backend=false
    fi

    # Create workspace if it doesn't exist
    if ! terraform workspace list | grep -q "^[* ] $ENVIRONMENT$"; then
        terraform workspace new $ENVIRONMENT
        print_success "Terraform workspace created: $ENVIRONMENT"
    else
        terraform workspace select $ENVIRONMENT
        print_success "Terraform workspace selected: $ENVIRONMENT"
    fi
}

# Function to show usage information
show_usage() {
    cat << EOF
Bootstrap Terraform Remote State

USAGE:
    $0 [ENVIRONMENT]

DESCRIPTION:
    This script creates the necessary AWS resources for Terraform remote state
    management, including S3 bucket for state storage and DynamoDB table for
    state locking.

ARGUMENTS:
    ENVIRONMENT    Environment name (dev, staging, prod) [default: dev]

EXAMPLES:
    $0                    # Bootstrap dev environment
    $0 staging           # Bootstrap staging environment
    $0 prod              # Bootstrap production environment

RESOURCES CREATED:
    - S3 Bucket: momo-merchant-{env}-terraform-state
    - DynamoDB Table: momo-merchant-{env}-terraform-locks
    - Backend Config: environments/{env}/backend.tfvars

REQUIREMENTS:
    - AWS CLI configured with appropriate permissions
    - S3FullAccess and DynamoDBFullAccess policies
    - jq installed for JSON processing

EOF
}

# Function to show summary
show_summary() {
    print_header "Bootstrap Complete!"

    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo ""
    echo "Resources Created:"
    echo "  S3 Bucket: $PROJECT_NAME-$ENVIRONMENT-terraform-state"
    echo "  DynamoDB Table: $PROJECT_NAME-$ENVIRONMENT-terraform-locks"
    echo "  Backend Config: environments/$ENVIRONMENT/backend.tfvars"
    echo ""
    echo "Next Steps:"
    echo "1. Review the generated backend.tfvars file"
    echo "2. Initialize Terraform with remote backend:"
    echo "   cd environments/$ENVIRONMENT"
    echo "   terraform init -backend-config=backend.tfvars"
    echo "3. Plan and apply your infrastructure:"
    echo "   terraform plan"
    echo "   terraform apply"
    echo ""
    print_info "Terraform remote state is now ready for use!"
}

# Main execution
main() {
    # Parse arguments
    case "$1" in
        --help|-h)
            show_usage
            exit 0
            ;;
        dev|staging|prod)
            ENVIRONMENT="$1"
            ;;
        "")
            ENVIRONMENT="dev"
            ;;
        *)
            print_error "Invalid environment: $1"
            print_info "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac

    print_header "Bootstrap Terraform Remote State"
    print_info "Environment: $ENVIRONMENT"
    print_info "Region: $REGION"

    # Validate environment directory exists
    if [ ! -d "environments/$ENVIRONMENT" ]; then
        print_error "Environment directory not found: environments/$ENVIRONMENT"
        print_info "Please create the directory first or choose a different environment"
        exit 1
    fi

    # Run bootstrap steps
    check_aws_cli
    create_s3_bucket
    create_dynamodb_table
    create_backend_config
    test_backend_config
    create_terraform_workspace
    show_summary
}

# Run main function
main "$@"