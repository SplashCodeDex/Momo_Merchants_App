# IAM Module Variables

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "allowed_regions" {
  description = "List of allowed AWS regions"
  type        = list(string)
  default     = ["eu-west-1", "eu-central-1", "us-east-1"]
}

variable "github_repository" {
  description = "GitHub repository for OIDC integration"
  type        = string
  default     = "your-org/momo-merchants-app"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}