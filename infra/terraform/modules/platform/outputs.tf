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

output "pharmacy_app_fqdn" {
  value = aws_route53_record.pharmacy_app.fqdn
}

output "rds_endpoint" {
  value = aws_db_instance.pharmacy.address
}

output "rds_secret_arn" {
  value = aws_db_instance.pharmacy.master_user_secret[0].secret_arn
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pharmacy.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.pharmacy.id
}

output "files_bucket" {
  value = aws_s3_bucket.files.bucket
}
