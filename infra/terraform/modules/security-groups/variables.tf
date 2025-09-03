# Security Groups Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "app_port" {
  description = "Port for the application"
  type        = number
  default     = 3000
}

variable "cloudfront_cidrs" {
  description = "CloudFront CIDR blocks for origin access"
  type        = list(string)
  default = [
    "130.176.0.0/16",
    "54.182.0.0/16",
    "54.192.0.0/16",
    "54.230.0.0/16",
    "54.239.0.0/16",
    "54.240.0.0/16",
    "54.241.0.0/16",
    "54.242.0.0/16",
    "54.243.0.0/16",
    "54.244.0.0/16",
    "54.245.0.0/16",
    "54.246.0.0/16",
    "54.247.0.0/16",
    "54.248.0.0/16",
    "54.249.0.0/16",
    "54.250.0.0/16",
    "54.251.0.0/16",
    "54.252.0.0/16"
  ]
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed for SSH access to bastion"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Should be restricted in production
}

variable "enable_bastion" {
  description = "Enable bastion host security group"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}