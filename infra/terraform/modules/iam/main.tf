# IAM Module for MoMo Merchant Companion App
# Creates IAM roles, policies, and groups with least-privilege access

# IAM Groups
resource "aws_iam_group" "admin" {
  name = "${var.project_name}-${var.environment}-admin"
  path = "/"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-admin-group"
    }
  )
}

resource "aws_iam_group" "developer" {
  name = "${var.project_name}-${var.environment}-developer"
  path = "/"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-developer-group"
    }
  )
}

resource "aws_iam_group" "readonly" {
  name = "${var.project_name}-${var.environment}-readonly"
  path = "/"

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-readonly-group"
    }
  )
}

# IAM Policies
resource "aws_iam_policy" "admin_policy" {
  name        = "${var.project_name}-${var.environment}-admin-policy"
  path        = "/"
  description = "Administrator access for MoMo Merchant App"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-admin-policy"
    }
  )
}

resource "aws_iam_policy" "developer_policy" {
  name        = "${var.project_name}-${var.environment}-developer-policy"
  path        = "/"
  description = "Developer access for MoMo Merchant App"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "lambda:*",
          "s3:*",
          "cloudformation:*",
          "cloudwatch:*",
          "logs:*",
          "iam:Get*",
          "iam:List*",
          "iam:CreateRole",
          "iam:PassRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      },
      {
        Effect = "Deny"
        Action = [
          "iam:*User*",
          "iam:*Group*",
          "iam:*Policy*",
          "iam:DeleteRole",
          "iam:UpdateRole",
          "organizations:*",
          "billing:*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-developer-policy"
    }
  )
}

resource "aws_iam_policy" "readonly_policy" {
  name        = "${var.project_name}-${var.environment}-readonly-policy"
  path        = "/"
  description = "Read-only access for MoMo Merchant App"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "rds:Describe*",
          "lambda:Get*",
          "lambda:List*",
          "s3:Get*",
          "s3:List*",
          "cloudformation:Describe*",
          "cloudformation:List*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "logs:Describe*",
          "logs:Get*",
          "logs:List*",
          "iam:Get*",
          "iam:List*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-readonly-policy"
    }
  )
}

# Attach policies to groups
resource "aws_iam_group_policy_attachment" "admin_policy_attachment" {
  group      = aws_iam_group.admin.name
  policy_arn = aws_iam_policy.admin_policy.arn
}

resource "aws_iam_group_policy_attachment" "developer_policy_attachment" {
  group      = aws_iam_group.developer.name
  policy_arn = aws_iam_policy.developer_policy.arn
}

resource "aws_iam_group_policy_attachment" "readonly_policy_attachment" {
  group      = aws_iam_group.readonly.name
  policy_arn = aws_iam_policy.readonly_policy.arn
}

# IAM Roles for Services

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-${var.environment}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-ecs-task-execution-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Lambda Execution Role
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-${var.environment}-lambda-execution"

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

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-lambda-execution-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "lambda_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# GitHub Actions OIDC Role
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-github-actions-role"
    }
  )
}

# GitHub OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-github-oidc"
    }
  )
}

# GitHub Actions Policy
resource "aws_iam_policy" "github_actions_policy" {
  name        = "${var.project_name}-${var.environment}-github-actions-policy"
  path        = "/"
  description = "Policy for GitHub Actions CI/CD"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "rds:*",
          "lambda:*",
          "s3:*",
          "cloudformation:*",
          "ecs:*",
          "logs:*",
          "iam:PassRole"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-github-actions-policy"
    }
  )
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.github_actions_policy.arn
}

# Password Policy
resource "aws_iam_account_password_policy" "strict" {
  minimum_password_length        = 12
  require_uppercase_characters   = true
  require_lowercase_characters   = true
  require_numbers                = true
  require_symbols                = true
  allow_users_to_change_password = true
  password_reuse_prevention      = 5
  max_password_age               = 90
}