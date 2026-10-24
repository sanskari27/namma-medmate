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
  default = "t3.small"
}

variable "pharmacy_dns_zone_name" {
  type        = string
  description = "Public hosted zone for the marketing site. Nameservers are delegated from the registrar."
  default     = "medmatepharmacy.com"
}
