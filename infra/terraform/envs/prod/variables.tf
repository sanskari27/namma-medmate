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
  default = "t3.small"
}
