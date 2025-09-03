# VPC Module Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "az_count" {
  description = "Number of availability zones"
  type        = number
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "public_subnets" {
  description = "Map of public subnets with their configurations"
  type = map(object({
    cidr_block = string
    az         = string
  }))
  default = {}
}

variable "private_subnets" {
  description = "Map of private subnets with their configurations"
  type = map(object({
    cidr_block = string
    az         = string
  }))
  default = {}
}

variable "database_subnets" {
  description = "Map of database subnets with their configurations"
  type = map(object({
    cidr_block = string
    az         = string
  }))
  default = {}
}

# Feature flags
variable "create_nat_gateway" {
  description = "Whether to create NAT Gateway"
  type        = bool
  default     = true
}

variable "enable_s3_endpoint" {
  description = "Whether to create S3 VPC endpoint"
  type        = bool
  default     = true
}

variable "enable_dynamodb_endpoint" {
  description = "Whether to create DynamoDB VPC endpoint"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Whether to enable VPC flow logs"
  type        = bool
  default     = true
}

variable "enable_network_acls" {
  description = "Whether to create network ACLs"
  type        = bool
  default     = true
}

variable "enable_dhcp_options" {
  description = "Whether to create DHCP options"
  type        = bool
  default     = true
}

# Configuration
variable "flow_log_retention_days" {
  description = "Retention period for VPC flow logs"
  type        = number
  default     = 30
  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.flow_log_retention_days)
    error_message = "Flow log retention days must be one of the allowed values"
  }
}