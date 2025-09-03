# Security Groups Module Outputs

output "alb_sg_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_sg_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "rds_sg_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "redis_sg_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}

output "lambda_sg_id" {
  description = "ID of the Lambda security group"
  value       = aws_security_group.lambda.id
}

output "cloudfront_sg_id" {
  description = "ID of the CloudFront security group"
  value       = aws_security_group.cloudfront.id
}

output "bastion_sg_id" {
  description = "ID of the bastion security group"
  value       = var.enable_bastion ? aws_security_group.bastion[0].id : null
}

output "security_group_ids" {
  description = "Map of all security group IDs"
  value = {
    alb        = aws_security_group.alb.id
    ecs        = aws_security_group.ecs.id
    rds        = aws_security_group.rds.id
    redis      = aws_security_group.redis.id
    lambda     = aws_security_group.lambda.id
    cloudfront = aws_security_group.cloudfront.id
    bastion    = var.enable_bastion ? aws_security_group.bastion[0].id : null
  }
}