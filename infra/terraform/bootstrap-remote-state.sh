#!/bin/bash

# Bootstrap Remote State for MoMo Merchant Companion App
# This script creates the S3 bucket and DynamoDB table needed for Terraform remote state

set -e

# Configuration
PROJECT_NAME="momo-merchant"
ENVIRONMENT="${1:-dev}"
AWS_REGION="${2:-eu-west-1}"
AWS_PROFILE="${3:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    print_error "AWS credentials are not configured for profile '$AWS_PROFILE'."
    print_info "Please run 'aws configure --profile $AWS_PROFILE' to set up your credentials."
    exit 1
fi

print_info "Starting remote state bootstrap for environment: $ENVIRONMENT"
print_info "AWS Region: $AWS_REGION"
print_info "AWS Profile: $AWS_PROFILE"

# Set AWS CLI profile
export AWS_PROFILE="$AWS_PROFILE"
export AWS_DEFAULT_REGION="$AWS_REGION"

# Bucket and table names
BUCKET_NAME="${PROJECT_NAME}-terraform-state-${ENVIRONMENT}"
TABLE_NAME="${PROJECT_NAME}-terraform-locks-${ENVIRONMENT}"

# Check if bucket already exists
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    print_info "Creating S3 bucket: $BUCKET_NAME"

    # Create bucket (region-specific for eu-west-1)
    if [ "$AWS_REGION" = "eu-west-1" ]; then
        aws s3 mb "s3://$BUCKET_NAME"
    else
        aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"
    fi

    print_success "S3 bucket created: $BUCKET_NAME"
else
    print_warning "S3 bucket already exists: $BUCKET_NAME"
fi

# Enable versioning on the bucket
print_info "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

print_success "Versioning enabled on S3 bucket"

# Enable server-side encryption
print_info "Enabling server-side encryption on S3 bucket..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                },
                "BucketKeyEnabled": true
            }
        ]
    }'

print_success "Server-side encryption enabled on S3 bucket"

# Block public access
print_info "Blocking public access on S3 bucket..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration '{
        "BlockPublicAcls": true,
        "IgnorePublicAcls": true,
        "BlockPublicPolicy": true,
        "RestrictPublicBuckets": true
    }'

print_success "Public access blocked on S3 bucket"

# Check if DynamoDB table already exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" 2>&1 | grep -q 'ResourceNotFoundException'; then
    print_info "Creating DynamoDB table: $TABLE_NAME"

    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions '[
            {
                "AttributeName": "LockID",
                "AttributeType": "S"
            }
        ]' \
        --key-schema '[
            {
                "AttributeName": "LockID",
                "KeyType": "HASH"
            }
        ]' \
        --billing-mode PAY_PER_REQUEST \
        --tags "Key=Name,Value=$TABLE_NAME" \
              "Key=Purpose,Value=Terraform State Locking" \
              "Key=Project,Value=$PROJECT_NAME" \
              "Key=Environment,Value=$ENVIRONMENT"

    print_success "DynamoDB table created: $TABLE_NAME"
else
    print_warning "DynamoDB table already exists: $TABLE_NAME"
fi

# Wait for table to be active
print_info "Waiting for DynamoDB table to be active..."
aws dynamodb wait table-exists --table-name "$TABLE_NAME"
print_success "DynamoDB table is active"

# Create terraform.tfvars file for the environment
print_info "Creating terraform.tfvars file..."
cat > "environments/${ENVIRONMENT}/terraform.tfvars" << EOF
# Environment-specific variables for $ENVIRONMENT
environment = "$ENVIRONMENT"
aws_region = "$AWS_REGION"

# VPC Configuration
vpc_cidr_block = "10.0.0.0/16"
public_subnets = [
  "10.0.1.0/24",
  "10.0.2.0/24",
  "10.0.3.0/24"
]
private_subnets = [
  "10.0.10.0/24",
  "10.0.11.0/24",
  "10.0.12.0/24"
]

# Database Configuration
db_instance_class = "db.t3.micro"
db_allocated_storage = 20

# Redis Configuration
redis_node_type = "cache.t3.micro"

# Lambda Configuration
lambda_memory_size = 256
lambda_timeout = 30

# Cost Management
monthly_budget_limit = 500

# Feature Flags
enable_cloudtrail = true
enable_config = true
enable_security_hub = true
enable_guardduty = true
enable_backup = true

# GitHub Integration (update with your repository)
github_repository = "your-org/momo-merchants-app"
EOF

print_success "Created terraform.tfvars file for $ENVIRONMENT environment"

# Create .gitignore for sensitive files
print_info "Creating .gitignore for sensitive files..."
cat > ".gitignore" << EOF
# Terraform
.terraform/
terraform.tfstate*
*.tfvars

# AWS Credentials
.aws/

# Environment files
.env
.env.local
.env.*.local

# Logs
*.log
logs/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo
EOF

print_success "Created .gitignore file"

print_success "Remote state bootstrap completed successfully!"
print_info ""
print_info "Next steps:"
print_info "1. Review and update the terraform.tfvars file in environments/$ENVIRONMENT/"
print_info "2. Initialize Terraform: terraform init -backend-config=environments/$ENVIRONMENT/backend.tfvars"
print_info "3. Plan the infrastructure: terraform plan -var-file=environments/$ENVIRONMENT/terraform.tfvars"
print_info "4. Apply the infrastructure: terraform apply -var-file=environments/$ENVIRONMENT/terraform.tfvars"
print_info ""
print_info "Remote state resources created:"
print_info "- S3 Bucket: $BUCKET_NAME"
print_info "- DynamoDB Table: $TABLE_NAME"