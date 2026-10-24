output "ec2_public_ip" {
  value = aws_eip.app.public_ip
}

output "ec2_instance_id" {
  value = aws_instance.app.id
}

output "ssm_compose_env_parameter" {
  value = aws_ssm_parameter.compose_env.name
}

output "pharmacy_zone_id" {
  value = aws_route53_zone.pharmacy_site.zone_id
}

output "pharmacy_nameservers" {
  value = aws_route53_zone.pharmacy_site.name_servers
}
