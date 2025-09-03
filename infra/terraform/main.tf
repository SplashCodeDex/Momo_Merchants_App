# MoMo Merchant Companion App - Terraform Root Configuration
# This is the main entry point for all infrastructure deployments

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "momo-merchant-terraform-state"
    key            = "terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "momo-merchant-terraform-locks"
    encrypt        = true
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.owner
      Repository  = var.repository
    }
  }
}

# Data sources for current AWS account and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values for common configurations
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner
    Repository  = var.repository
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix     = local.name_prefix
  aws_region      = var.aws_region
  vpc_cidr        = var.vpc_cidr
  az_count        = var.az_count
  environment     = var.environment
  common_tags     = local.common_tags

  # Public subnets for load balancers and bastion hosts
  public_subnets = {
    for i in range(var.az_count) : "public-${i + 1}" => {
      cidr_block = cidrsubnet(var.vpc_cidr, 8, i)
      az         = data.aws_availability_zones.available.names[i]
    }
  }

  # Private subnets for application and database instances
  private_subnets = {
    for i in range(var.az_count) : "private-${i + 1}" => {
      cidr_block = cidrsubnet(var.vpc_cidr, 8, i + var.az_count)
      az         = data.aws_availability_zones.available.names[i]
    }
  }

  # Database subnets for RDS instances
  database_subnets = {
    for i in range(var.az_count) : "database-${i + 1}" => {
      cidr_block = cidrsubnet(var.vpc_cidr, 8, i + (var.az_count * 2))
      az         = data.aws_availability_zones.available.names[i]
    }
  }
}

# Security Module
module "security" {
  source = "./modules/security"

  name_prefix     = local.name_prefix
  vpc_id          = module.vpc.vpc_id
  environment     = var.environment
  common_tags     = local.common_tags

  # Security group rules
  alb_security_group_rules = [
    {
      type        = "ingress"
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP access from anywhere"
    },
    {
      type        = "ingress"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS access from anywhere"
    }
  ]

  ecs_security_group_rules = [
    {
      type                     = "ingress"
      from_port                = var.app_port
      to_port                  = var.app_port
      protocol                 = "tcp"
      source_security_group_id = module.security.alb_security_group_id
      description              = "App port access from ALB"
    }
  ]

  rds_security_group_rules = [
    {
      type                     = "ingress"
      from_port                = 5432
      to_port                  = 5432
      protocol                 = "tcp"
      source_security_group_id = module.security.ecs_security_group_id
      description              = "PostgreSQL access from ECS"
    }
  ]
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  name_prefix     = local.name_prefix
  environment     = var.environment
  common_tags     = local.common_tags
  account_id      = data.aws_caller_identity.current.account_id

  # ECS task execution role
  create_ecs_execution_role = true
  ecs_execution_role_name   = "${local.name_prefix}-ecs-execution"

  # ECS task role
  create_ecs_task_role = true
  ecs_task_role_name   = "${local.name_prefix}-ecs-task"

  # Additional IAM roles as needed
  additional_roles = {
    lambda = {
      name = "${local.name_prefix}-lambda"
      assume_role_policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Action = "sts:AssumeRole"
            Effect = "Allow"
            Principal = {
              Service = "lambda.amazonaws.com"
            }
          }
        ]
      })
      managed_policies = [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      ]
    }
  }
}

# Database Module (RDS PostgreSQL)
module "database" {
  source = "./modules/database"

  name_prefix         = local.name_prefix
  environment         = var.environment
  common_tags         = local.common_tags

  # Database configuration
  db_name             = var.db_name
  db_username         = var.db_username
  db_password         = var.db_password
  db_instance_class   = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage

  # Network configuration
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  security_group_ids  = [module.security.rds_security_group_id]

  # Backup configuration
  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = module.iam.rds_monitoring_role_arn

  # Multi-AZ for production
  multi_az = var.environment == "prod"
}

# ECS Cluster and Services
module "ecs" {
  source = "./modules/ecs"

  name_prefix     = local.name_prefix
  environment     = var.environment
  common_tags     = local.common_tags

  # ECS Cluster
  cluster_name    = "${local.name_prefix}-cluster"

  # ECS Task Definition
  task_family     = "${local.name_prefix}-app"
  task_cpu        = var.task_cpu
  task_memory     = var.task_memory

  # Container configuration
  container_name  = "${local.name_prefix}-app"
  container_image = var.container_image
  container_port  = var.app_port

  # Execution and Task roles
  execution_role_arn = module.iam.ecs_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn

  # Network configuration
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.security.ecs_security_group_id]

  # Load balancer
  alb_target_group_arn = module.alb.target_group_arn

  # Auto scaling
  desired_count = var.desired_count
  min_capacity  = var.min_capacity
  max_capacity  = var.max_capacity
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  name_prefix     = local.name_prefix
  environment     = var.environment
  common_tags     = local.common_tags

  # ALB configuration
  alb_name        = "${local.name_prefix}-alb"
  internal        = false

  # Network configuration
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  security_group_ids = [module.security.alb_security_group_id]

  # Target group
  target_group_name     = "${local.name_prefix}-tg"
  target_group_port     = var.app_port
  target_group_protocol = "HTTP"

  # Health check
  health_check_path     = "/health"
  health_check_interval = 30
  health_check_timeout  = 5
  healthy_threshold     = 2
  unhealthy_threshold   = 2

  # SSL Configuration (for production)
  enable_ssl = var.environment == "prod"
  ssl_certificate_arn = var.ssl_certificate_arn
}

# CloudFront CDN (for production)
module "cloudfront" {
  count = var.environment == "prod" ? 1 : 0

  source = "./modules/cloudfront"

  name_prefix     = local.name_prefix
  environment     = var.environment
  common_tags     = local.common_tags

  # CloudFront configuration
  alb_domain_name = module.alb.alb_dns_name
  ssl_certificate_arn = var.ssl_certificate_arn

  # WAF integration
  enable_waf = true
  waf_acl_arn = module.waf[0].waf_acl_arn
}

# WAF (Web Application Firewall)
module "waf" {
  count = var.environment == "prod" ? 1 : 0

  source = "./modules/waf"

  name_prefix     = local.name_prefix
  environment     = var.environment
  common_tags     = local.common_tags

  # WAF configuration
  waf_name = "${local.name_prefix}-waf"

  # Common WAF rules
  enable_common_rules = true
  enable_rate_limiting = true
  rate_limit = 2000  # requests per 5 minutes
}

# Monitoring and Alerting
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix     = local.name_prefix
  environment     = var.environment
  common_tags     = local.common_tags

  # SNS topic for alerts
  alert_email     = var.alert_email

  # CloudWatch alarms
  ecs_cluster_name = module.ecs.cluster_name
  rds_instance_id  = module.database.db_instance_id
  alb_arn_suffix   = module.alb.alb_arn_suffix

  # Log groups
  create_log_groups = true
  log_retention_days = var.environment == "prod" ? 30 : 7
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name"
  value       = var.environment == "prod" ? module.cloudfront[0].cloudfront_domain_name : null
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = module.database.db_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}