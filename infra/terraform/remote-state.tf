# Remote State Configuration for MoMo Merchant Companion App
# This file configures Terraform remote state with S3 backend and DynamoDB locking

terraform {
  backend "s3" {
    # These values will be populated by environment-specific configurations
    # bucket         = "momo-merchant-terraform-state-${var.environment}"
    # key            = "terraform.tfstate"
    # region         = var.aws_region
    # encrypt        = true
    # dynamodb_table = "momo-merchant-terraform-locks-${var.environment}"
  }
}

# S3 Bucket for Terraform State
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state-${var.environment}"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-state-${var.environment}"
      Purpose = "Terraform Remote State Storage"
    }
  )
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB Table for State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project_name}-terraform-locks-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-locks-${var.environment}"
      Purpose = "Terraform State Locking"
    }
  )
}

# IAM Policy for Terraform State Access
resource "aws_iam_policy" "terraform_state_access" {
  name        = "${var.project_name}-terraform-state-access-${var.environment}"
  path        = "/"
  description = "Policy for accessing Terraform remote state"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.terraform_state.arn,
          "${aws_s3_bucket.terraform_state.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-state-access-${var.environment}"
    }
  )
}

# Attach policy to admin and developer groups
resource "aws_iam_group_policy_attachment" "admin_terraform_state" {
  group      = "${var.project_name}-${var.environment}-admin"
  policy_arn = aws_iam_policy.terraform_state_access.arn
}

resource "aws_iam_group_policy_attachment" "developer_terraform_state" {
  group      = "${var.project_name}-${var.environment}-developer"
  policy_arn = aws_iam_policy.terraform_state_access.arn
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "terraform_state_lifecycle"
    status = "Enabled"

    # Delete incomplete multipart uploads after 7 days
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    # Transition older versions to Standard-IA after 30 days
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    # Transition older versions to Glacier after 90 days
    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    # Delete old versions after 1 year
    noncurrent_version_expiration {
      noncurrent_days = 365
    }

    # Clean up delete markers
    expiration {
      expired_object_delete_marker = true
    }
  }
}

# CloudWatch Alarms for S3 Bucket
resource "aws_cloudwatch_metric_alarm" "s3_bucket_size" {
  alarm_name          = "${var.project_name}-terraform-state-size-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BucketSizeBytes"
  namespace           = "AWS/S3"
  period              = "86400" # 1 day
  statistic           = "Maximum"
  threshold           = "1073741824" # 1 GB
  alarm_description   = "Terraform state bucket size exceeds 1GB"
  alarm_actions       = [] # Add SNS topic ARN for notifications

  dimensions = {
    BucketName = aws_s3_bucket.terraform_state.bucket
    StorageType = "StandardStorage"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-state-size-alarm-${var.environment}"
    }
  )
}

# Backup Configuration (using AWS Backup)
resource "aws_backup_vault" "terraform_state" {
  name = "${var.project_name}-terraform-state-backup-${var.environment}"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-state-backup-${var.environment}"
    }
  )
}

resource "aws_backup_plan" "terraform_state" {
  name = "${var.project_name}-terraform-state-backup-plan-${var.environment}"

  rule {
    rule_name         = "terraform_state_daily_backup"
    target_vault_name = aws_backup_vault.terraform_state.name
    schedule          = "cron(0 5 ? * * *)" # Daily at 5 AM UTC

    lifecycle {
      delete_after = 30 # Keep backups for 30 days
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-state-backup-plan-${var.environment}"
    }
  )
}

resource "aws_backup_selection" "terraform_state" {
  name         = "${var.project_name}-terraform-state-backup-selection-${var.environment}"
  plan_id      = aws_backup_plan.terraform_state.id
  iam_role_arn = aws_iam_role.terraform_backup.arn

  resources = [
    aws_s3_bucket.terraform_state.arn,
    aws_dynamodb_table.terraform_locks.arn
  ]
}

# IAM Role for AWS Backup
resource "aws_iam_role" "terraform_backup" {
  name = "${var.project_name}-terraform-backup-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-terraform-backup-role-${var.environment}"
    }
  )
}

resource "aws_iam_role_policy_attachment" "terraform_backup" {
  role       = aws_iam_role.terraform_backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}