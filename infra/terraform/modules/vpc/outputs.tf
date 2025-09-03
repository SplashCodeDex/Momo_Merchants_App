# VPC Module Outputs

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = aws_vpc.main.arn
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_id" {
  description = "ID of the NAT Gateway"
  value       = var.create_nat_gateway ? aws_nat_gateway.main[0].id : null
}

output "nat_gateway_eip" {
  description = "Elastic IP of the NAT Gateway"
  value       = var.create_nat_gateway ? aws_eip.nat[0].public_ip : null
}

# Public Subnets
output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [for subnet in aws_subnet.public : subnet.id]
}

output "public_subnet_cidrs" {
  description = "CIDR blocks of the public subnets"
  value       = [for subnet in aws_subnet.public : subnet.cidr_block]
}

output "public_subnet_arns" {
  description = "ARNs of the public subnets"
  value       = [for subnet in aws_subnet.public : subnet.arn]
}

# Private Subnets
output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [for subnet in aws_subnet.private : subnet.id]
}

output "private_subnet_cidrs" {
  description = "CIDR blocks of the private subnets"
  value       = [for subnet in aws_subnet.private : subnet.cidr_block]
}

output "private_subnet_arns" {
  description = "ARNs of the private subnets"
  value       = [for subnet in aws_subnet.private : subnet.arn]
}

# Database Subnets
output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = [for subnet in aws_subnet.database : subnet.id]
}

output "database_subnet_cidrs" {
  description = "CIDR blocks of the database subnets"
  value       = [for subnet in aws_subnet.database : subnet.cidr_block]
}

output "database_subnet_arns" {
  description = "ARNs of the database subnets"
  value       = [for subnet in aws_subnet.database : subnet.arn]
}

output "database_subnet_group_name" {
  description = "Name of the database subnet group"
  value       = length(var.database_subnets) > 0 ? aws_db_subnet_group.database[0].name : null
}

output "database_subnet_group_id" {
  description = "ID of the database subnet group"
  value       = length(var.database_subnets) > 0 ? aws_db_subnet_group.database[0].id : null
}

# Route Tables
output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table"
  value       = var.create_nat_gateway ? aws_route_table.private[0].id : null
}

# VPC Endpoints
output "s3_vpc_endpoint_id" {
  description = "ID of the S3 VPC endpoint"
  value       = var.enable_s3_endpoint ? aws_vpc_endpoint.s3[0].id : null
}

output "dynamodb_vpc_endpoint_id" {
  description = "ID of the DynamoDB VPC endpoint"
  value       = var.enable_dynamodb_endpoint ? aws_vpc_endpoint.dynamodb[0].id : null
}

# Network ACLs
output "public_network_acl_id" {
  description = "ID of the public network ACL"
  value       = var.enable_network_acls ? aws_network_acl.public[0].id : null
}

output "private_network_acl_id" {
  description = "ID of the private network ACL"
  value       = var.enable_network_acls ? aws_network_acl.private[0].id : null
}

# DHCP Options
output "dhcp_options_id" {
  description = "ID of the DHCP options set"
  value       = var.enable_dhcp_options ? aws_vpc_dhcp_options.main.id : null
}

# Flow Logs
output "vpc_flow_log_id" {
  description = "ID of the VPC flow log"
  value       = var.enable_flow_logs ? aws_flow_log.main[0].id : null
}

output "vpc_flow_log_group_name" {
  description = "Name of the VPC flow log CloudWatch log group"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.vpc_flow_log[0].name : null
}

# Availability Zones
output "availability_zones" {
  description = "List of availability zones used"
  value       = data.aws_availability_zones.available.names
}

# Tags
output "vpc_tags" {
  description = "Tags applied to the VPC"
  value       = aws_vpc.main.tags
}

# Network Information
output "vpc_network_info" {
  description = "Network information for the VPC"
  value = {
    vpc_id              = aws_vpc.main.id
    vpc_cidr            = aws_vpc.main.cidr_block
    availability_zones  = data.aws_availability_zones.available.names
    public_subnets      = length(aws_subnet.public)
    private_subnets     = length(aws_subnet.private)
    database_subnets    = length(aws_subnet.database)
    has_nat_gateway     = var.create_nat_gateway
    has_internet_gateway = true
    has_flow_logs       = var.enable_flow_logs
    has_network_acls    = var.enable_network_acls
  }
}