output "ec2_public_ip" {
  value = module.platform.ec2_public_ip
}

output "ec2_instance_id" {
  value = module.platform.ec2_instance_id
}

output "rds_endpoint" {
  value = module.platform.rds_endpoint
}

output "redis_endpoint" {
  value = module.platform.redis_endpoint
}

output "ssm_compose_env_parameter" {
  value = module.platform.ssm_compose_env_parameter
}
