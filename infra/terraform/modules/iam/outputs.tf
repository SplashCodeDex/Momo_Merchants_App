# IAM Module Outputs

output "admin_group_name" {
  description = "Name of the admin IAM group"
  value       = aws_iam_group.admin.name
}

output "developer_group_name" {
  description = "Name of the developer IAM group"
  value       = aws_iam_group.developer.name
}

output "readonly_group_name" {
  description = "Name of the readonly IAM group"
  value       = aws_iam_group.readonly.name
}

output "admin_policy_arn" {
  description = "ARN of the admin IAM policy"
  value       = aws_iam_policy.admin_policy.arn
}

output "developer_policy_arn" {
  description = "ARN of the developer IAM policy"
  value       = aws_iam_policy.developer_policy.arn
}

output "readonly_policy_arn" {
  description = "ARN of the readonly IAM policy"
  value       = aws_iam_policy.readonly_policy.arn
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_execution.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions role"
  value       = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "password_policy_id" {
  description = "ID of the IAM password policy"
  value       = aws_iam_account_password_policy.strict.id
}