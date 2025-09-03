# MoMo Merchant Companion App - Terraform Variables
# This file defines all input variables for the infrastructure

# AWS Configuration
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-west-1" # Ireland - good for African connectivity

  validation {
    condition = contains([
      "eu-west-1", # Ireland
      "eu-central-1", # Frankfurt
      "us-east-1", # N. Virginia
      "af-south-1" # Cape Town (when available)
    ], var.aws_region)
    error_message = "AWS region must be one of: eu-west-1, eu-central-1, us-east-1, af-south-1"
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition = contains([
      "dev",
      "staging",
      "prod"
    ], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# VPC Configuration
variable "vpc_cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default = [
    "10.0.1.0/24",
    "10.0.2.0/24",
    "10.0.3.0/24"
  ]
}

variable "private_subnets" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
  default = [
    "10.0.10.0/24",
    "10.0.11.0/24",
    "10.0.12.0/24"
  ]
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL"
  type        = string
  default     = "db.t3.micro"

  validation {
    condition = contains([
      "db.t3.micro",   # Free tier eligible
      "db.t3.small",
      "db.t3.medium",
      "db.t4g.micro",  # Graviton - cost effective
      "db.t4g.small"
    ], var.db_instance_class)
    error_message = "Database instance class must be a valid RDS instance type"
  }
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instance (GB)"
  type        = number
  default     = 20

  validation {
    condition     = var.db_allocated_storage >= 20 && var.db_allocated_storage <= 100
    error_message = "Database allocated storage must be between 20 and 100 GB"
  }
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"

  validation {
    condition = contains([
      "cache.t3.micro",
      "cache.t3.small",
      "cache.t4g.micro"
    ], var.redis_node_type)
    error_message = "Redis node type must be a valid ElastiCache instance type"
  }
}

# Lambda Configuration
variable "lambda_memory_size" {
  description = "Memory size for Lambda functions (MB)"
  type        = number
  default     = 256

  validation {
    condition     = var.lambda_memory_size >= 128 && var.lambda_memory_size <= 3008
    error_message = "Lambda memory size must be between 128 and 3008 MB"
  }
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions (seconds)"
  type        = number
  default     = 30

  validation {
    condition     = var.lambda_timeout >= 1 && var.lambda_timeout <= 900
    error_message = "Lambda timeout must be between 1 and 900 seconds"
  }
}

# Cost Management
variable "monthly_budget_limit" {
  description = "Monthly AWS budget limit in USD"
  type        = number
  default     = 500

  validation {
    condition     = var.monthly_budget_limit > 0
    error_message = "Monthly budget limit must be greater than 0"
  }
}

# Tagging
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "enable_cloudtrail" {
  description = "Enable AWS CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_security_hub" {
  description = "Enable AWS Security Hub for security posture"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable Amazon GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable AWS Backup for automated backups"
  type        = bool
  default     = true
}

# GitHub Integration
variable "github_repository" {
  description = "GitHub repository for OIDC integration"
  type        = string
  default     = "your-org/momo-merchants-app"
}

variable "github_branches" {
  description = "GitHub branches allowed for OIDC"
  type        = list(string)
  default     = ["main", "develop"]
}