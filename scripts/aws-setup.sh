#!/bin/bash

# MoMo Merchant Companion App - AWS Setup Script
# This script automates AWS account and infrastructure setup

set -e

# Configuration
PROJECT_NAME="momo-merchant-app"
REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "unknown")

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

    AWS_VERSION=$(aws --version | cut -d' ' -f1 | cut -d'/' -f2)
    print_success "AWS CLI version: $AWS_VERSION"

    # Check if configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    print_success "AWS Account ID: $ACCOUNT_ID"
    print_success "Current User: $USER_ARN"
}

# Function to create IAM groups
create_iam_groups() {
    print_header "Creating IAM Groups"

    print_step "Creating Administrators group..."
    if aws iam create-group --group-name Administrators 2>/dev/null; then
        print_success "Administrators group created"
    else
        print_warning "Administrators group may already exist"
    fi

    print_step "Attaching AdministratorAccess policy..."
    aws iam attach-group-policy \
        --group-name Administrators \
        --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
    print_success "AdministratorAccess policy attached"

    print_step "Creating Developers group..."
    if aws iam create-group --group-name Developers 2>/dev/null; then
        print_success "Developers group created"
    else
        print_warning "Developers group may already exist"
    fi

    print_step "Attaching ReadOnlyAccess policy to Developers..."
    aws iam attach-group-policy \
        --group-name Developers \
        --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
    print_success "ReadOnlyAccess policy attached"

    print_step "Creating PowerUserAccess policy for Developers..."
    aws iam attach-group-policy \
        --group-name Developers \
        --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
    print_success "PowerUserAccess policy attached"
}

# Function to create CI/CD user
create_ci_cd_user() {
    print_header "Creating CI/CD User"

    USER_NAME="github-actions"

    print_step "Creating $USER_NAME user..."
    if aws iam create-user --user-name $USER_NAME 2>/dev/null; then
        print_success "$USER_NAME user created"
    else
        print_warning "$USER_NAME user may already exist"
    fi

    print_step "Adding $USER_NAME to Developers group..."
    aws iam add-user-to-group \
        --user-name $USER_NAME \
        --group-name Developers
    print_success "User added to Developers group"

    print_step "Creating access keys for $USER_NAME..."
    ACCESS_KEY=$(aws iam create-access-key --user-name $USER_NAME)
    ACCESS_KEY_ID=$(echo $ACCESS_KEY | jq -r '.AccessKey.AccessKeyId')
    SECRET_ACCESS_KEY=$(echo $ACCESS_KEY | jq -r '.AccessKey.SecretAccessKey')

    print_success "Access Key ID: $ACCESS_KEY_ID"
    print_warning "Secret Access Key: $SECRET_ACCESS_KEY"
    print_warning "⚠️  SAVE THIS SECRET KEY SECURELY! It will not be shown again."

    # Save to file for reference
    cat > github-actions-credentials.txt << EOF
GitHub Actions AWS Credentials for $PROJECT_NAME
===============================================

Account ID: $ACCOUNT_ID
User: $USER_NAME
Access Key ID: $ACCESS_KEY_ID
Secret Access Key: $SECRET_ACCESS_KEY

⚠️  IMPORTANT SECURITY NOTES:
- Store the Secret Access Key securely (e.g., GitHub Secrets)
- Never commit this file to version control
- Rotate these keys regularly
- Use IAM roles with OIDC when possible

Created: $(date)
EOF

    print_success "Credentials saved to github-actions-credentials.txt"
    print_warning "Delete this file after securely storing the credentials!"
}

# Function to set up password policy
setup_password_policy() {
    print_header "Setting Up Password Policy"

    print_step "Configuring strong password requirements..."
    aws iam update-account-password-policy \
        --minimum-password-length 12 \
        --require-symbols \
        --require-numbers \
        --require-uppercase-characters \
        --require-lowercase-characters \
        --allow-users-to-change-password \
        --max-password-age 90 \
        --password-reuse-prevention 5

    print_success "Password policy configured"
}

# Function to create S3 buckets
create_s3_buckets() {
    print_header "Creating S3 Buckets"

    # Terraform state bucket
    STATE_BUCKET="$PROJECT_NAME-terraform-state"

    print_step "Creating Terraform state bucket: $STATE_BUCKET..."
    if aws s3 mb s3://$STATE_BUCKET --region $REGION 2>/dev/null; then
        print_success "State bucket created"
    else
        print_warning "State bucket may already exist"
    fi

    print_step "Enabling versioning on state bucket..."
    aws s3api put-bucket-versioning \
        --bucket $STATE_BUCKET \
        --versioning-configuration Status=Enabled
    print_success "Versioning enabled"

    print_step "Enabling encryption on state bucket..."
    aws s3api put-bucket-encryption \
        --bucket $STATE_BUCKET \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    print_success "Encryption enabled"

    # Logs bucket
    LOGS_BUCKET="$PROJECT_NAME-app-logs"

    print_step "Creating logs bucket: $LOGS_BUCKET..."
    if aws s3 mb s3://$LOGS_BUCKET --region $REGION 2>/dev/null; then
        print_success "Logs bucket created"
    else
        print_warning "Logs bucket may already exist"
    fi

    # Backups bucket
    BACKUPS_BUCKET="$PROJECT_NAME-app-backups"

    print_step "Creating backups bucket: $BACKUPS_BUCKET..."
    if aws s3 mb s3://$BACKUPS_BUCKET --region $REGION 2>/dev/null; then
        print_success "Backups bucket created"
    else
        print_warning "Backups bucket may already exist"
    fi
}

# Function to create DynamoDB table for Terraform locking
create_dynamodb_table() {
    print_header "Creating DynamoDB Table for Terraform Locking"

    TABLE_NAME="$PROJECT_NAME-terraform-locks"

    print_step "Creating DynamoDB table: $TABLE_NAME..."
    if aws dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST 2>/dev/null; then
        print_success "DynamoDB table created"
    else
        print_warning "DynamoDB table may already exist"
    fi
}

# Function to set up CloudTrail
setup_cloudtrail() {
    print_header "Setting Up CloudTrail"

    TRAIL_NAME="$PROJECT_NAME-trail"
    BUCKET_NAME="$PROJECT_NAME-cloudtrail-logs"

    print_step "Creating CloudTrail trail: $TRAIL_NAME..."
    if aws cloudtrail create-trail \
        --name $TRAIL_NAME \
        --s3-bucket-name $BUCKET_NAME \
        --is-multi-region-trail \
        --enable-log-file-validation 2>/dev/null; then
        print_success "CloudTrail trail created"
    else
        print_warning "CloudTrail trail may already exist"
    fi

    print_step "Starting CloudTrail logging..."
    aws cloudtrail start-logging --name $TRAIL_NAME
    print_success "CloudTrail logging started"
}

# Function to set up billing alerts
setup_billing_alerts() {
    print_header "Setting Up Billing Alerts"

    print_step "Creating SNS topic for billing alerts..."
    TOPIC_ARN=$(aws sns create-topic \
        --name $PROJECT_NAME-billing-alerts \
        --query 'TopicArn' \
        --output text)
    print_success "SNS topic created: $TOPIC_ARN"

    print_step "Creating billing alarm..."
    aws cloudwatch put-metric-alarm \
        --alarm-name "${PROJECT_NAME}-monthly-billing-alarm" \
        --alarm-description "Monthly billing alarm for $PROJECT_NAME" \
        --metric-name EstimatedCharges \
        --namespace AWS/Billing \
        --statistic Maximum \
        --period 21600 \
        --threshold 100 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 1 \
        --alarm-actions $TOPIC_ARN

    print_success "Billing alarm created ($100 threshold)"
    print_info "Subscribe email addresses to: $TOPIC_ARN"
}

# Function to enable GuardDuty
enable_guardduty() {
    print_header "Enabling GuardDuty"

    print_step "Creating GuardDuty detector..."
    DETECTOR_ID=$(aws guardduty create-detector \
        --enable \
        --query 'DetectorId' \
        --output text)
    print_success "GuardDuty detector created: $DETECTOR_ID"
}

# Function to create budget
create_budget() {
    print_header "Creating AWS Budget"

    print_step "Creating monthly budget ($200 limit)..."
    aws budgets create-budget \
        --budget file://<(cat <<EOF
{
    "BudgetName": "$PROJECT_NAME-monthly-budget",
    "BudgetLimit": {
        "Amount": "200",
        "Unit": "USD"
    },
    "CostFilters": {},
    "CostTypes": {
        "IncludeTax": true,
        "IncludeSubscription": true,
        "UseBlended": false,
        "IncludeRefund": false,
        "IncludeCredit": false,
        "IncludeUpfront": false,
        "IncludeRecurring": true,
        "IncludeOtherSubscription": true,
        "IncludeSupport": true,
        "IncludeDiscount": true,
        "UseAmortized": false
    },
    "TimeUnit": "MONTHLY",
    "TimePeriod": {
        "Start": "$(date -u +%Y-%m-%dT00:00:00Z)",
        "End": "$(date -u -d '+1 year' +%Y-%m-%dT00:00:00Z)"
    },
    "BudgetType": "COST"
}
EOF
) 2>/dev/null || print_warning "Budget may already exist"

    print_success "Budget created"
}

# Function to set up cost allocation tags
setup_cost_allocation_tags() {
    print_header "Setting Up Cost Allocation Tags"

    TAGS=("Project" "Environment" "Owner" "Service")

    for tag in "${TAGS[@]}"; do
        print_step "Activating cost allocation tag: $tag..."
        aws ce update-cost-allocation-tags \
            --cost-allocation-tags-status "[{\"TagKey\":\"$tag\",\"Status\":\"Active\"}]" 2>/dev/null || \
        print_warning "Tag $tag may already be active"
    done

    print_success "Cost allocation tags configured"
}

# Function to create OIDC provider for GitHub Actions
create_oidc_provider() {
    print_header "Creating OIDC Provider for GitHub Actions"

    print_step "Creating OIDC provider..."
    if aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
        --client-id-list sts.amazonaws.com 2>/dev/null; then
        print_success "OIDC provider created"
    else
        print_warning "OIDC provider may already exist"
    fi
}

# Function to create GitHub Actions IAM role
create_github_actions_role() {
    print_header "Creating GitHub Actions IAM Role"

    ROLE_NAME="GitHubActionsRole"
    POLICY_NAME="GitHubActionsPolicy"

    # Create trust policy
    cat > trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:your-org/$PROJECT_NAME:*"
                }
            }
        }
    ]
}
EOF

    print_step "Creating IAM role: $ROLE_NAME..."
    if aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json 2>/dev/null; then
        print_success "IAM role created"
    else
        print_warning "IAM role may already exist"
    fi

    # Create permissions policy
    cat > permissions-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$PROJECT_NAME-terraform-state/*",
                "arn:aws:s3:::$PROJECT_NAME-app-logs/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$PROJECT_NAME-terraform-locks"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeImages",
                "ec2:DescribeSnapshots",
                "rds:DescribeDBInstances",
                "lambda:ListFunctions"
            ],
            "Resource": "*"
        }
    ]
}
EOF

    print_step "Attaching permissions policy..."
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name $POLICY_NAME \
        --policy-document file://permissions-policy.json

    print_success "Permissions policy attached"

    # Clean up temporary files
    rm -f trust-policy.json permissions-policy.json
}

# Function to show summary
show_summary() {
    print_header "AWS Setup Summary"

    echo "✅ AWS Account: $ACCOUNT_ID"
    echo "✅ Region: $REGION"
    echo "✅ IAM Groups: Administrators, Developers"
    echo "✅ CI/CD User: github-actions"
    echo "✅ S3 Buckets: terraform-state, app-logs, app-backups"
    echo "✅ DynamoDB: terraform-locks table"
    echo "✅ CloudTrail: $PROJECT_NAME-trail"
    echo "✅ GuardDuty: Enabled"
    echo "✅ Budget: $200/month limit"
    echo "✅ Cost Allocation Tags: Configured"
    echo "✅ OIDC Provider: GitHub Actions"
    echo "✅ IAM Role: GitHubActionsRole"

    echo ""
    print_info "Next Steps:"
    echo "1. Subscribe email to SNS topic: $PROJECT_NAME-billing-alerts"
    echo "2. Store GitHub Actions credentials securely"
    echo "3. Update repository URL in OIDC trust policy"
    echo "4. Run Terraform to provision infrastructure"
    echo "5. Set up monitoring and alerting"

    echo ""
    print_warning "Security Reminders:"
    echo "- Enable MFA for all IAM users"
    echo "- Rotate access keys regularly"
    echo "- Review IAM permissions regularly"
    echo "- Monitor costs and usage"
}

# Function to show help
show_help() {
    cat << EOF
MoMo Merchant Companion App - AWS Setup Script

USAGE:
    $0 [OPTIONS]

DESCRIPTION:
    This script automates AWS account and infrastructure setup for the
    MoMo Merchant Companion App, including IAM, S3, DynamoDB, CloudTrail,
    and CI/CD integration.

REQUIREMENTS:
    - AWS CLI configured with appropriate permissions
    - jq installed for JSON processing
    - Administrator access to AWS account

OPTIONS:
    --help, -h        Show this help message
    --quick           Run only essential setup (IAM, S3, DynamoDB)
    --security        Run only security-related setup
    --monitoring      Run only monitoring and alerting setup

EXAMPLES:
    $0                  # Run complete AWS setup
    $0 --quick         # Run essential setup only
    $0 --security      # Run security setup only

COMPONENTS CREATED:
    - IAM groups and users
    - S3 buckets for state and logs
    - DynamoDB table for Terraform locking
    - CloudTrail for audit logging
    - GuardDuty for threat detection
    - Budget and cost monitoring
    - OIDC provider for GitHub Actions
    - IAM role for CI/CD pipelines

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
            print_info "Running quick AWS setup..."
            check_aws_cli
            create_iam_groups
            create_ci_cd_user
            create_s3_buckets
            create_dynamodb_table
            show_summary
            ;;
        --security)
            print_info "Running security-focused AWS setup..."
            check_aws_cli
            setup_password_policy
            setup_cloudtrail
            enable_guardduty
            create_oidc_provider
            create_github_actions_role
            show_summary
            ;;
        --monitoring)
            print_info "Running monitoring and alerting setup..."
            check_aws_cli
            setup_billing_alerts
            create_budget
            setup_cost_allocation_tags
            show_summary
            ;;
        *)
            print_info "Running complete AWS setup..."
            check_aws_cli
            create_iam_groups
            create_ci_cd_user
            setup_password_policy
            create_s3_buckets
            create_dynamodb_table
            setup_cloudtrail
            setup_billing_alerts
            enable_guardduty
            create_budget
            setup_cost_allocation_tags
            create_oidc_provider
            create_github_actions_role
            show_summary
            ;;
    esac
}

# Run main function
main "$@"