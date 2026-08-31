terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.100"
    }
  }
}

locals {
  fqdn     = var.environment == "prod" ? "${var.app_slug}.${var.base_domain}" : "${var.app_slug}.${var.environment}.${var.base_domain}"
  api_fqdn = var.environment == "prod" ? "api.${var.base_domain}" : "api.${var.environment}.${var.base_domain}"
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "vpc" {
  source      = "../../modules/vpc"
  cidr_block  = var.vpc_cidr
  environment = var.environment
}

module "rds" {
  source      = "../../modules/rds-postgres"
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  db_name     = "medmate"
  username    = "medmate"
}

module "pgbouncer" {
  source                             = "../../modules/pg-bouncer"
  environment                        = var.environment
  vpc_id                             = module.vpc.vpc_id
  subnet_ids                         = module.vpc.private_subnet_ids
  rds_security_group_id              = module.rds.security_group_id
  database_host                      = module.rds.endpoint
  max_client_conn                    = var.pgbouncer_max_client_conn
  default_pool_size                  = var.pgbouncer_default_pool_size
  deployment_minimum_healthy_percent = var.pgbouncer_deployment_minimum_healthy_percent
  deployment_maximum_percent         = var.pgbouncer_deployment_maximum_percent
}

module "ssm_auth" {
  source      = "../../modules/ssm-parameters-ref"
  environment = var.environment
  service     = "auth-api"
  names       = ["oidc-issuer", "oidc-audience", "oidc-jwks-uri"]
}

module "auth_lambda" {
  source                         = "../../modules/lambda"
  environment                    = var.environment
  function_name                  = "namma-medmate-${var.environment}-auth-api"
  artifact_bucket                = var.artifact_bucket
  artifact_key                   = var.auth_artifact_key
  handler                        = "handler.handler"
  subnet_ids                     = module.vpc.private_subnet_ids
  security_group_ids             = [module.pgbouncer.security_group_id]
  ssm_parameter_arns             = module.ssm_auth.parameter_arns
  reserved_concurrent_executions = var.lambda_reserved_concurrency
  environment_variables = {
    NODE_ENV      = "production"
    LOG_LEVEL     = "info"
    OIDC_ISSUER   = var.oidc_issuer
    OIDC_AUDIENCE = var.oidc_audience
    OIDC_JWKS_URI = var.oidc_jwks_uri
  }
}

module "api_domain" {
  source  = "../../modules/api-gateway-domain"
  fqdn    = local.api_fqdn
  zone_id = var.hosted_zone_id
}

module "api" {
  source               = "../../modules/api-gateway"
  environment          = var.environment
  api_name             = "namma-medmate-${var.environment}-http"
  lambda_invoke_arn    = module.auth_lambda.invoke_arn
  lambda_function_name = module.auth_lambda.function_name
  custom_domain_name   = module.api_domain.domain_name
  base_path            = "auth-api"
}

module "cert" {
  source = "../../modules/route53-acm"
  providers = {
    aws.us_east_1 = aws.us_east_1
  }
  zone_id = var.hosted_zone_id
  fqdn    = local.fqdn
}

module "web" {
  source              = "../../modules/cloudfront-s3-web"
  environment         = var.environment
  app_slug            = var.app_slug
  fqdn                = local.fqdn
  acm_certificate_arn = module.cert.certificate_arn
}

resource "aws_route53_record" "app" {
  zone_id = var.hosted_zone_id
  name    = local.fqdn
  type    = "A"
  alias {
    name                   = module.web.domain_name
    zone_id                = "Z2FDTNDATAQYW2"
    evaluate_target_health = false
  }
}

module "github_oidc" {
  source         = "../../modules/github-oidc"
  environment    = var.environment
  github_org     = var.github_org
  github_org_id  = var.github_org_id
  github_repo    = var.github_repo
  github_repo_id = var.github_repo_id
}

module "appconfig" {
  source           = "../../modules/appconfig"
  environment      = var.environment
  application_name = "namma-medmate-prod"
}

module "monitoring" {
  source               = "../../modules/monitoring"
  environment          = var.environment
  lambda_function_name = module.auth_lambda.function_name
  api_name             = "namma-medmate-${var.environment}-http"
}
