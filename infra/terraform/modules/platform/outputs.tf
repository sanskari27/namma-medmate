output "ec2_public_ip" {
  value = aws_eip.app.public_ip
}

output "ec2_instance_id" {
  value = aws_instance.app.id
}

output "rds_endpoint" {
  value = aws_db_instance.this.endpoint
}

output "rds_address" {
  value = aws_db_instance.this.address
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.this.cache_nodes[0].address
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "ssm_compose_env_parameter" {
  value = aws_ssm_parameter.compose_env.name
}
