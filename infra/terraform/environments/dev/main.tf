# Development Environment Configuration
# Minimal infrastructure for development and testing

terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket         = "momo-merchant-dev-terraform-state"
    key            = "terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "momo-merchant-dev-terraform-locks"
    encrypt        = true
  }
}

# Local variables for dev environment
locals {
  environment = "dev"
  name_prefix = "momo-merchant-dev"
  common_tags = {
    Project     = "momo-merchant"
    Environment = local.environment
    ManagedBy   = "Terraform"
    Owner       = "DevOps Team"
    Repository  = "https://github.com/your-org/momo-merchant-app"
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC Module
module "vpc" {
  source = "../../modules/vpc"

  name_prefix     = local.name_prefix
  aws_region      = data.aws_region.current.name
  vpc_cidr        = "10.0.0.0/16"
  az_count        = 2  # Use fewer AZs for dev to reduce costs
  environment     = local.environment
  common_tags     = local.common_tags

  # Public subnets for load balancers and bastion
  public_subnets = {
    for i in range(2) : "public-${i + 1}" => {
      cidr_block = cidrsubnet("10.0.0.0/16", 8, i)
      az         = data.aws_availability_zones.available.names[i]
    }
  }

  # Private subnets for applications
  private_subnets = {
    for i in range(2) : "private-${i + 1}" => {
      cidr_block = cidrsubnet("10.0.0.0/16", 8, i + 2)
      az         = data.aws_availability_zones.available.names[i]
    }
  }

  # Database subnets
  database_subnets = {
    for i in range(2) : "database-${i + 1}" => {
      cidr_block = cidrsubnet("10.0.0.0/16", 8, i + 4)
      az         = data.aws_availability_zones.available.names[i]
    }
  }

  # Dev-specific settings
  create_nat_gateway      = true
  enable_s3_endpoint      = true
  enable_dynamodb_endpoint = true
  enable_flow_logs        = false  # Disable for cost savings
  enable_network_acls     = true
  enable_dhcp_options     = true
}

# Security Groups Module
module "security" {
  source = "../../modules/security-groups"

  name_prefix     = local.name_prefix
  vpc_id          = module.vpc.vpc_id
  environment     = local.environment
  common_tags     = local.common_tags

  # ALB Security Group
  alb_security_group = {
    name        = "${local.name_prefix}-alb"
    description = "Security group for Application Load Balancer"

    ingress_rules = [
      {
        from_port   = 80
        to_port     = 80
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTP access from anywhere"
      },
      {
        from_port   = 443
        to_port     = 443
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "HTTPS access from anywhere"
      }
    ]

    egress_rules = [
      {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
        description = "Allow all outbound traffic"
      }
    ]
  }

  # ECS Security Group
  ecs_security_group = {
    name        = "${local.name_prefix}-ecs"
    description = "Security group for ECS tasks"

    ingress_rules = [
      {
        from_port                = 3000
        to_port                  = 3000
        protocol                 = "tcp"
        source_security_group_id = module.security.alb_security_group_id
        description              = "App port access from ALB"
      }
    ]

    egress_rules = [
      {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
        description = "Allow all outbound traffic"
      }
    ]
  }

  # RDS Security Group
  rds_security_group = {
    name        = "${local.name_prefix}-rds"
    description = "Security group for RDS database"

    ingress_rules = [
      {
        from_port                = 5432
        to_port                  = 5432
        protocol                 = "tcp"
        source_security_group_id = module.security.ecs_security_group_id
        description              = "PostgreSQL access from ECS"
      }
    ]

    egress_rules = [
      {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
        description = "Allow all outbound traffic"
      }
    ]
  }
}

# IAM Module
module "iam" {
  source = "../../modules/iam"

  name_prefix     = local.name_prefix
  environment     = local.environment
  common_tags     = local.common_tags
  account_id      = data.aws_caller_identity.current.account_id

  # ECS Execution Role
  create_ecs_execution_role = true
  ecs_execution_role_name   = "${local.name_prefix}-ecs-execution"

  # ECS Task Role
  create_ecs_task_role = true
  ecs_task_role_name   = "${local.name_prefix}-ecs-task"

  # Additional policies for dev
  additional_policies = {
    developer_access = {
      name = "${local.name_prefix}-developer-policy"
      policy = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "ec2:Describe*",
              "rds:Describe*",
              "ecs:Describe*",
              "ecs:List*",
              "logs:Describe*",
              "logs:Get*",
              "logs:List*",
              "logs:StartQuery",
              "logs:StopQuery",
              "logs:TestMetricFilter",
              "logs:FilterLogEvents"
            ]
            Resource = "*"
          }
        ]
      })
    }
  }
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = module.security.alb_security_group_id
}

output "ecs_security_group_id" {
  description = "ECS security group ID"
  value       = module.security.ecs_security_group_id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = module.security.rds_security_group_id
}

output "ecs_execution_role_arn" {
  description = "ECS execution role ARN"
  value       = module.iam.ecs_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = module.iam.ecs_task_role_arn
}