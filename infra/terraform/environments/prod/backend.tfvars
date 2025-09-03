# Production Environment - Remote State Configuration
# This file contains environment-specific backend configuration

bucket         = "momo-merchant-terraform-state-prod"
key            = "terraform.tfstate"
region         = "eu-west-1"
encrypt        = true
dynamodb_table = "momo-merchant-terraform-locks-prod"