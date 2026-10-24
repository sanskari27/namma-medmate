terraform {
  required_version = ">= 1.6.0"
  backend "s3" {
    bucket         = "namma-medmate-tfstate-105927215604"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "namma-medmate-tflock"
    encrypt        = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "platform" {
  source = "../../modules/platform"

  project_name      = "namma-medmate-prod"
  aws_region        = var.aws_region
  admin_ssh_cidr    = var.admin_ssh_cidr
  ec2_instance_type = var.ec2_instance_type
}
