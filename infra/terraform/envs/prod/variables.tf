variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "admin_ssh_cidr" {
  type        = list(string)
  description = "Your IP for SSH, e.g. [\"203.0.113.10/32\"]"
}

variable "ec2_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.small"
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
