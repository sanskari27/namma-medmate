output "ec2_public_ip" {
  value = module.platform.ec2_public_ip
}

output "ec2_instance_id" {
  value = module.platform.ec2_instance_id
}

output "ssm_compose_env_parameter" {
  value = module.platform.ssm_compose_env_parameter
}

output "pharmacy_nameservers" {
  description = "Set these at GoDaddy for medmatepharmacy.com"
  value       = module.platform.pharmacy_nameservers
}
