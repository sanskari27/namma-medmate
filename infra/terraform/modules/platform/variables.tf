variable "project_name" {
  type    = string
  default = "namma-medmate-prod"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "admin_ssh_cidr" {
  type        = list(string)
  description = "CIDR blocks allowed to SSH to EC2"
}

variable "ec2_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "db_name" {
  type    = string
  default = "nammamedmate"
}

variable "db_username" {
  type    = string
  default = "nammamedmate"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}

variable "resend_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "resend_webhook_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "resend_from" {
  type    = string
  default = "Namma MedMate <noreply@nammamedmate.com>"
}
