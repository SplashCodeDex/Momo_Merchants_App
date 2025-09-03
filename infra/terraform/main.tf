# MoMo Merchant Companion App - AWS Infrastructure
# This file defines the main infrastructure configuration

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state configuration will be added in Phase 0.12
  # backend "s3" {
  #   bucket         = "momo-merchant-terraform-state"
  #   key            = "terraform.tfstate"
  #   region         = var.aws_region
  #   encrypt        = true
  #   dynamodb_table = "momo-merchant-terraform-locks"
  # }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  # Tags applied to all resources
  default_tags {
    tags = {
      Project     = "MoMo Merchant Companion App"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps Team"
    }
  }
}

# Data sources for current AWS account and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values for resource naming
locals {
  project_name = "momo-merchant"
  common_tags = {
    Project     = "MoMo Merchant Companion App"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = "DevOps Team"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  project_name = local.project_name
  environment  = var.environment
  aws_region   = var.aws_region

  vpc_cidr_block = var.vpc_cidr_block
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets

  tags = local.common_tags
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security-groups"

  project_name = local.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id

  tags = local.common_tags
}

# IAM Module
module "iam" {
  source = "./modules/iam"

  project_name = local.project_name
  environment  = var.environment

  tags = local.common_tags
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "security_group_ids" {
  description = "IDs of the security groups"
  value = {
    alb     = module.security_groups.alb_sg_id
    ecs     = module.security_groups.ecs_sg_id
    rds     = module.security_groups.rds_sg_id
    lambda  = module.security_groups.lambda_sg_id
  }
}

output "iam_role_arns" {
  description = "ARNs of the IAM roles"
  value = {
    ecs_task_execution = module.iam.ecs_task_execution_role_arn
    lambda_execution   = module.iam.lambda_execution_role_arn
    github_actions     = module.iam.github_actions_role_arn
  }
}