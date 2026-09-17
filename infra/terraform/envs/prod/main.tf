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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

module "platform" {
  source = "../../modules/platform"

  project_name          = "namma-medmate-prod"
  aws_region            = var.aws_region
  admin_ssh_cidr        = var.admin_ssh_cidr
  ec2_instance_type     = var.ec2_instance_type
  db_instance_class     = var.db_instance_class
  skip_final_snapshot   = var.skip_final_snapshot
  resend_api_key        = var.resend_api_key
  resend_webhook_secret = var.resend_webhook_secret
  resend_from           = var.resend_from
  cashfree_client_id    = var.cashfree_client_id
  cashfree_client_secret = var.cashfree_client_secret
  cashfree_webhook_secret = var.cashfree_webhook_secret
  cashfree_env          = var.cashfree_env
  cashfree_return_url   = var.cashfree_return_url
  password_reset_dispensary_url = var.password_reset_dispensary_url
  password_reset_admin_url = var.password_reset_admin_url
  email_verification_dispensary_url = var.email_verification_dispensary_url
  meta_whatsapp_token               = var.meta_whatsapp_token
  meta_whatsapp_phone_number_id     = var.meta_whatsapp_phone_number_id
  meta_whatsapp_waba_id             = var.meta_whatsapp_waba_id
  meta_whatsapp_display_number      = var.meta_whatsapp_display_number
}
