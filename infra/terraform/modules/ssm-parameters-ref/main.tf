variable "environment" { type = string }
variable "service" { type = string }
variable "names" { type = list(string) }

locals {
  paths = [for name in var.names : "/namma-medmate/${var.environment}/${var.service}/${name}"]
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

output "parameter_names" { value = local.paths }
output "parameter_arns" {
  value = [
    for path in local.paths :
    "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter${path}"
  ]
}
