# AWS Setup Guide for MoMo Merchant Companion App

## Overview

This guide provides comprehensive instructions for setting up AWS infrastructure for the MoMo Merchant Companion App. It covers account creation, security configuration, IAM setup, and initial infrastructure provisioning.

## Prerequisites

### Required Tools
- AWS CLI v2 (`aws --version`)
- Terraform v1.5+ (`terraform --version`)
- Git (`git --version`)
- jq (for JSON processing)

### AWS Account Requirements
- Valid credit/debit card for billing
- Phone number for account verification
- Business email address
- Understanding of AWS Free Tier limits

## Phase 1: AWS Account Setup

### 1.1 Create AWS Account

1. **Navigate to AWS Console**
   ```bash
   # Open AWS signup page
   open https://aws.amazon.com/console/
   ```

2. **Account Creation Process**
   - Choose "Create a new AWS account"
   - Enter account information:
     - Account Type: Business
     - Company Name: Your Organization
     - Email: business-email@company.com
   - Verify email and phone number
   - Choose support plan (Business or Enterprise recommended)

3. **Root Account Security**
   ```bash
   # Enable MFA on root account immediately
   # AWS Console -> IAM -> My Security Credentials
   ```

### 1.2 Billing and Cost Management

1. **Set Up Billing Alerts**
   ```bash
   # AWS Console -> Billing and Cost Management
   # Create budget: $100/month initial limit
   # Set up billing alerts for 50%, 80%, 100% of budget
   ```

2. **Enable Cost Allocation Tags**
   ```bash
   # AWS Console -> Billing and Cost Management -> Cost Allocation Tags
   # Activate default tags:
   # - Project: momo-merchant-app
   # - Environment: dev/staging/prod
   # - Owner: team-member-name
   ```

3. **Set Up Cost Explorer**
   ```bash
   # Enable Cost Explorer for detailed analysis
   # AWS Console -> Billing and Cost Management -> Cost Explorer
   ```

## Phase 2: IAM Setup

### 2.1 Create IAM Users and Groups

1. **Create Admin Group**
   ```bash
   aws iam create-group --group-name Administrators

   aws iam attach-group-policy --group-name Administrators \
     --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
   ```

2. **Create Developer Group**
   ```bash
   aws iam create-group --group-name Developers

   # Attach developer policies
   aws iam attach-group-policy --group-name Developers \
     --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

   aws iam attach-group-policy --group-name Developers \
     --policy-arn arn:aws:iam::aws:policy/AWSCodeCommitPowerUser
   ```

3. **Create CI/CD User**
   ```bash
   aws iam create-user --user-name github-actions

   aws iam add-user-to-group --user-name github-actions --group-name Developers

   # Create access keys for CI/CD
   aws iam create-access-key --user-name github-actions
   ```

### 2.2 Enable MFA for All Users

1. **Virtual MFA Setup**
   ```bash
   # For each user:
   # AWS Console -> IAM -> Users -> [User] -> Security credentials
   # Assign MFA device -> Virtual MFA device
   # Use Google Authenticator or similar app
   ```

2. **Hardware MFA (Recommended for Production)**
   ```bash
   # Use physical MFA devices for admin accounts
   # AWS Console -> IAM -> Users -> [User] -> Security credentials
   # Assign MFA device -> Hardware MFA device
   ```

### 2.3 Password Policy

1. **Configure Strong Password Requirements**
   ```bash
   aws iam update-account-password-policy \
     --minimum-password-length 12 \
     --require-symbols \
     --require-numbers \
     --require-uppercase-characters \
     --require-lowercase-characters \
     --allow-users-to-change-password \
     --max-password-age 90 \
     --password-reuse-prevention 5
   ```

## Phase 3: Security Baseline

### 3.1 Enable CloudTrail

1. **Create CloudTrail Trail**
   ```bash
   aws cloudtrail create-trail \
     --name momo-merchant-trail \
     --s3-bucket-name momo-merchant-cloudtrail-logs \
     --is-multi-region-trail \
     --enable-log-file-validation
   ```

2. **Configure Log Encryption**
   ```bash
   # Enable SSE-KMS encryption for CloudTrail logs
   aws cloudtrail update-trail \
     --name momo-merchant-trail \
     --kms-key-id alias/momo-merchant-cloudtrail-key
   ```

### 3.2 Set Up GuardDuty

1. **Enable GuardDuty**
   ```bash
   aws guardduty create-detector --enable
   ```

2. **Configure Findings Export**
   ```bash
   # Set up automated response to security findings
   # AWS Console -> GuardDuty -> Settings
   ```

### 3.3 Configure Config Rules

1. **Enable AWS Config**
   ```bash
   aws configservice put-configuration-recorder \
     --configuration-recorder name=momo-merchant-config-recorder \
     --role-arn arn:aws:iam::ACCOUNT-ID:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig \
     --recording-group allSupported=true,includeGlobalResourceTypes=true
   ```

2. **Set Up Essential Config Rules**
   ```bash
   # Enable key security rules
   aws configservice put-config-rule \
     --config-rule file://config-rules/root-mfa-enabled.json

   aws configservice put-config-rule \
     --config-rule file://config-rules/s3-bucket-public-read-prohibited.json
   ```

## Phase 4: Initial Infrastructure Setup

### 4.1 Create S3 Buckets

1. **Terraform State Bucket**
   ```bash
   aws s3 mb s3://momo-merchant-terraform-state --region eu-west-1

   # Enable versioning
   aws s3api put-bucket-versioning \
     --bucket momo-merchant-terraform-state \
     --versioning-configuration Status=Enabled

   # Enable encryption
   aws s3api put-bucket-encryption \
     --bucket momo-merchant-terraform-state \
     --server-side-encryption-configuration '{
       "Rules": [{
         "ApplyServerSideEncryptionByDefault": {
           "SSEAlgorithm": "AES256"
         }
       }]
     }'
   ```

2. **Application Buckets**
   ```bash
   # Logs bucket
   aws s3 mb s3://momo-merchant-app-logs --region eu-west-1

   # Backups bucket
   aws s3 mb s3://momo-merchant-app-backups --region eu-west-1
   ```

### 4.2 Set Up DynamoDB for Terraform Locking

1. **Create DynamoDB Table**
   ```bash
   aws dynamodb create-table \
     --table-name momo-merchant-terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

### 4.3 Configure Route 53 (Optional)

1. **Register Domain** (if needed)
   ```bash
   # Use Route 53 or external registrar
   # Configure DNS settings for the domain
   ```

2. **Set Up Hosted Zone**
   ```bash
   aws route53 create-hosted-zone \
     --name momo-merchant-app.com \
     --caller-reference $(date +%s)
   ```

## Phase 5: Development Environment Setup

### 5.1 Create Development VPC

1. **Basic VPC Setup**
   ```bash
   # Use Terraform for VPC creation (covered in Phase 0.11)
   cd infra/terraform
   terraform init
   terraform plan -var-file=environments/dev.tfvars
   terraform apply -var-file=environments/dev.tfvars
   ```

### 5.2 Set Up Bastion Host (Optional)

1. **EC2 Instance for Development Access**
   ```bash
   aws ec2 run-instances \
     --image-id ami-0c55b159cbfafe1d0 \
     --count 1 \
     --instance-type t3.micro \
     --key-name momo-merchant-key \
     --security-group-ids sg-xxxxxxxx \
     --subnet-id subnet-xxxxxxxx \
     --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=momo-merchant-bastion},{Key=Environment,Value=dev}]'
   ```

## Phase 6: Monitoring and Alerting

### 6.1 Set Up CloudWatch

1. **Create Log Groups**
   ```bash
   aws logs create-log-group --log-group-name /aws/lambda/momo-merchant
   aws logs create-log-group --log-group-name /aws/ecs/momo-merchant
   ```

2. **Set Up Alarms**
   ```bash
   # Billing alarm
   aws cloudwatch put-metric-alarm \
     --alarm-name "MonthlyBillingAlarm" \
     --alarm-description "Monthly billing alarm" \
     --metric-name EstimatedCharges \
     --namespace AWS/Billing \
     --statistic Maximum \
     --period 21600 \
     --threshold 50 \
     --comparison-operator GreaterThanThreshold
   ```

### 6.2 Configure SNS Topics

1. **Create Notification Topics**
   ```bash
   aws sns create-topic --name momo-merchant-alerts

   # Subscribe email
   aws sns subscribe \
     --topic-arn arn:aws:sns:eu-west-1:ACCOUNT-ID:momo-merchant-alerts \
     --protocol email \
     --notification-endpoint alerts@company.com
   ```

## Phase 7: CI/CD Integration

### 7.1 Store Secrets in AWS Systems Manager

1. **Parameter Store Setup**
   ```bash
   # Store GitHub token
   aws ssm put-parameter \
     --name "/momo-merchant/github-token" \
     --value "ghp_xxxxxxxxxxxxxxxxxxxx" \
     --type SecureString

   # Store database credentials
   aws ssm put-parameter \
     --name "/momo-merchant/db-password" \
     --value "secure-password" \
     --type SecureString
   ```

### 7.2 Create IAM Role for GitHub Actions

1. **OIDC Provider Setup**
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
     --client-id-list sts.amazonaws.com
   ```

2. **Create IAM Role**
   ```bash
   aws iam create-role \
     --role-name GitHubActionsRole \
     --assume-role-policy-document file://iam/github-actions-trust-policy.json
   ```

## Phase 8: Backup and Disaster Recovery

### 8.1 Set Up Backup Vault

1. **AWS Backup Configuration**
   ```bash
   aws backup create-backup-vault \
     --backup-vault-name momo-merchant-backup-vault \
     --encryption-key-arn alias/aws/backup
   ```

2. **Create Backup Plan**
   ```bash
   aws backup create-backup-plan \
     --backup-plan file://backup/backup-plan.json
   ```

### 8.2 Cross-Region Replication

1. **S3 Cross-Region Replication**
   ```bash
   aws s3api put-bucket-replication \
     --bucket momo-merchant-terraform-state \
     --replication-configuration file://s3/replication-config.json
   ```

## Phase 9: Cost Optimization

### 9.1 Set Up Savings Plans

1. **EC2 Savings Plan**
   ```bash
   aws savingsplans create-savings-plan \
     --savings-plan-offering-id offering-id \
     --commitment "10.0" \
     --upfront-payment-amount "0" \
     --plan-type "EC2Instance"
   ```

### 9.2 Configure Auto Scaling

1. **EC2 Auto Scaling Group**
   ```bash
   aws autoscaling create-auto-scaling-group \
     --auto-scaling-group-name momo-merchant-asg \
     --launch-template LaunchTemplateId=lt-xxxxxxxx \
     --min-size 1 \
     --max-size 5 \
     --desired-capacity 2 \
     --availability-zones eu-west-1a eu-west-1b
   ```

## Phase 10: Documentation and Handover

### 10.1 Create Runbooks

1. **Infrastructure Runbook**
   - Account setup procedures
   - IAM user management
   - Security incident response
   - Backup and recovery procedures

2. **Development Environment Setup**
   - AWS CLI configuration
   - Terraform workspace setup
   - CI/CD pipeline configuration

### 10.2 Knowledge Transfer

1. **Team Training**
   - AWS console navigation
   - IAM best practices
   - Cost monitoring
   - Security procedures

2. **Documentation Review**
   - Validate all runbooks
   - Test disaster recovery procedures
   - Review security policies

## Validation Checklist

### Account Setup ✅
- [ ] AWS account created with business details
- [ ] Root account secured with MFA
- [ ] Billing alerts configured
- [ ] Cost allocation tags enabled

### IAM Configuration ✅
- [ ] Admin and developer groups created
- [ ] MFA enabled for all users
- [ ] Strong password policy enforced
- [ ] CI/CD user with appropriate permissions

### Security Baseline ✅
- [ ] CloudTrail enabled with encryption
- [ ] GuardDuty active
- [ ] AWS Config rules configured
- [ ] Security groups properly configured

### Infrastructure Ready ✅
- [ ] S3 buckets created for state and logs
- [ ] DynamoDB table for Terraform locking
- [ ] Basic VPC and subnets configured
- [ ] Route 53 hosted zone (if applicable)

### Monitoring Active ✅
- [ ] CloudWatch alarms configured
- [ ] SNS topics for notifications
- [ ] Log groups created
- [ ] Backup vault configured

### CI/CD Ready ✅
- [ ] GitHub Actions OIDC configured
- [ ] IAM roles for CI/CD created
- [ ] Secrets stored in Parameter Store
- [ ] Deployment pipelines configured

## Cost Estimation

### Monthly Costs (Development Environment)
- **EC2 Instances**: $50-100/month
- **RDS Database**: $30-60/month
- **S3 Storage**: $5-10/month
- **CloudWatch**: $10-20/month
- **Other Services**: $20-40/month
- **Total Estimate**: $115-230/month

### Free Tier Coverage
- **EC2**: 750 hours/month (t3.micro)
- **RDS**: 750 hours/month (db.t3.micro)
- **S3**: 5GB storage, 20,000 GET requests
- **Lambda**: 1M requests, 400,000 GB-seconds

## Troubleshooting

### Common Issues

1. **MFA Setup Issues**
   ```bash
   # Reset MFA device
   aws iam delete-virtual-mfa-device --serial-number arn:aws:iam::ACCOUNT:mfa/USER
   ```

2. **Access Denied Errors**
   ```bash
   # Check IAM policies
   aws iam list-attached-user-policies --user-name USERNAME
   ```

3. **Billing Alerts Not Working**
   ```bash
   # Verify SNS topic permissions
   aws sns get-topic-attributes --topic-arn TOPIC-ARN
   ```

### Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **AWS Support**: Business/Enterprise support plans
- **AWS Forums**: Community support
- **AWS Blogs**: Best practices and updates

## Next Steps

1. **Complete Terraform Setup** (Phase 0.11)
2. **Configure Remote State** (Phase 0.12)
3. **Deploy Development Environment**
4. **Set Up Monitoring Dashboards**
5. **Configure Backup Strategies**

---

*This guide provides a comprehensive AWS setup for production-ready infrastructure. Follow each phase sequentially and validate completion before proceeding.*