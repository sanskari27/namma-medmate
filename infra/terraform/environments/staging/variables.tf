variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type = string
}

variable "base_domain" {
  type = string
}

variable "app_slug" {
  type = string
}

variable "hosted_zone_id" {
  type = string
}

variable "github_org" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "artifact_bucket" {
  type = string
}

variable "auth_artifact_key" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "lambda_reserved_concurrency" {
  type    = number
  default = -1
}

variable "pgbouncer_max_client_conn" {
  type    = number
  default = 100
}

variable "pgbouncer_default_pool_size" {
  type    = number
  default = 20
}

variable "pgbouncer_deployment_minimum_healthy_percent" {
  type    = number
  default = 100
}

variable "pgbouncer_deployment_maximum_percent" {
  type    = number
  default = 200
}

variable "oidc_issuer" {
  type = string
}

variable "oidc_audience" {
  type = string
}

variable "oidc_jwks_uri" {
  type = string
}
