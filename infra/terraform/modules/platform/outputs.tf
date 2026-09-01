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

output "compose_env_snippet" {
  value     = <<-EOT
    DATABASE_URL=jdbc:postgresql://${aws_db_instance.this.address}:5432/${var.db_name}
    DATABASE_USERNAME=${var.db_username}
    DATABASE_PASSWORD=<from Secrets Manager ${aws_secretsmanager_secret.db.name}>
    REDIS_HOST=${aws_elasticache_cluster.this.cache_nodes[0].address}
    REDIS_PORT=6379
  EOT
  sensitive = true
}
