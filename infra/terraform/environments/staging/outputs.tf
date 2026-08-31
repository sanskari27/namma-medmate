output "app_fqdn" {
  value = local.fqdn
}

output "api_endpoint" {
  value = module.api.api_endpoint
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
