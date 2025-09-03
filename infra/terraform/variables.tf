# MoMo Merchant Companion App - Terraform Variables
# Global variables for all environments

# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "momo-merchant"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "DevOps Team"
}

variable "repository" {
  description = "Git repository URL"
  type        = string
  default     = "https://github.com/your-org/momo-merchant-app"
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 3
  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "AZ count must be between 2 and 3"
  }
}

# Application Configuration
variable "app_port" {
  description = "Port for the application"
  type        = number
  default     = 3000
}

variable "container_image" {
  description = "Docker image for the application"
  type        = string
  default     = "nginx:latest"
}

# Database Configuration
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "momo_merchant"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "momo_user"
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 12
    error_message = "Database password must be at least 12 characters long"
  }
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS (GB)"
  type        = number
  default     = 20
  validation {
    condition     = var.db_allocated_storage >= 20
    error_message = "Allocated storage must be at least 20 GB"
  }
}

# ECS Configuration
variable "task_cpu" {
  description = "CPU units for ECS task"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "Memory for ECS task (MB)"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 10
}

# SSL Configuration
variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# Monitoring Configuration
variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = "alerts@company.com"
}

# Environment-specific overrides
variable "dev_overrides" {
  description = "Development environment overrides"
  type = object({
    db_instance_class     = optional(string, "db.t3.micro")
    db_allocated_storage  = optional(number, 20)
    task_cpu             = optional(string, "256")
    task_memory          = optional(string, "512")
    desired_count        = optional(number, 1)
    min_capacity         = optional(number, 1)
    max_capacity         = optional(number, 3)
  })
  default = {}
}

variable "staging_overrides" {
  description = "Staging environment overrides"
  type = object({
    db_instance_class     = optional(string, "db.t3.small")
    db_allocated_storage  = optional(number, 50)
    task_cpu             = optional(string, "512")
    task_memory          = optional(string, "1024")
    desired_count        = optional(number, 2)
    min_capacity         = optional(number, 2)
    max_capacity         = optional(number, 5)
  })
  default = {}
}

variable "prod_overrides" {
  description = "Production environment overrides"
  type = object({
    db_instance_class     = optional(string, "db.t3.medium")
    db_allocated_storage  = optional(number, 100)
    task_cpu             = optional(string, "1024")
    task_memory          = optional(string, "2048")
    desired_count        = optional(number, 3)
    min_capacity         = optional(number, 3)
    max_capacity         = optional(number, 20)
  })
  default = {}
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Enable WAF protection"
  type        = bool
  default     = false
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_cost_allocation_tags" {
  description = "Enable cost allocation tags"
  type        = bool
  default     = true
}

variable "budget_limit" {
  description = "Monthly budget limit in USD"
  type        = number
  default     = 200
}

# Security
variable "enable_deletion_protection" {
  description = "Enable deletion protection for critical resources"
  type        = bool
  default     = true
}

variable "enable_encryption" {
  description = "Enable encryption for data at rest"
  type        = bool
  default     = true
}

variable "allowed_ip_ranges" {
  description = "Allowed IP ranges for SSH and RDP access"
  type        = list(string)
  default     = []
}

# Networking
variable "create_nat_gateway" {
  description = "Create NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "create_vpn_gateway" {
  description = "Create VPN Gateway for hybrid connectivity"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC flow logs"
  type        = bool
  default     = true
}

# DNS
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "create_route53_zone" {
  description = "Create Route53 hosted zone"
  type        = bool
  default     = false
}

# Backup
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_schedule" {
  description = "Cron expression for backup schedule"
  type        = string
  default     = "cron(0 2 * * ? *)"  # Daily at 2 AM UTC
}

# Logging
variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Log retention days must be one of the allowed values"
  }
}

# Performance
variable "enable_performance_insights" {
  description = "Enable RDS Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention" {
  description = "Performance Insights retention period"
  type        = number
  default     = 7
}

# Maintenance
variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:03:00-sun:04:00"
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "02:00-03:00"
}