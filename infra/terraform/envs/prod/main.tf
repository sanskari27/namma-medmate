terraform {
  required_version = ">= 1.6.0"
  backend "s3" {
    bucket         = "REPLACE_AFTER_BOOTSTRAP"
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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

module "platform" {
  source = "../../modules/platform"

  project_name        = "namma-medmate-prod"
  aws_region          = var.aws_region
  admin_ssh_cidr      = var.admin_ssh_cidr
  ec2_instance_type   = var.ec2_instance_type
  db_instance_class   = var.db_instance_class
  skip_final_snapshot = var.skip_final_snapshot
}
