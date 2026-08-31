output "app_fqdn" {
  value = local.fqdn
}

output "api_endpoint" {
  value = module.api.api_endpoint
}

output "api_fqdn" {
  value = local.api_fqdn
}

output "api_base_url" {
  value = "https://${local.api_fqdn}/auth-api"
}

output "web_bucket" {
  value = module.web.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.web.distribution_id
}

output "github_deploy_role_arn" {
  value = module.github_oidc.deploy_role_arn
}
