terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.100"
    }
  }
}

variable "hosted_zone_name" { type = string }

data "aws_route53_zone" "this" {
  name         = var.hosted_zone_name
  private_zone = false
}

output "zone_id" { value = data.aws_route53_zone.this.zone_id }
output "name" { value = data.aws_route53_zone.this.name }
