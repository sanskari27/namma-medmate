variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "db_name" { type = string }
variable "username" { type = string }

resource "aws_db_subnet_group" "this" {
  name       = "namma-medmate-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "rds" {
  name   = "namma-medmate-${var.environment}-rds"
  vpc_id = var.vpc_id
}

resource "aws_db_instance" "this" {
  identifier                  = "namma-medmate-${var.environment}"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  db_name                     = var.db_name
  username                    = var.username
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.this.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  skip_final_snapshot         = var.environment != "prod"
  publicly_accessible         = false
  storage_encrypted           = true
}

output "endpoint" { value = aws_db_instance.this.address }
output "port" { value = aws_db_instance.this.port }
output "security_group_id" { value = aws_security_group.rds.id }
output "master_user_secret_arn" { value = aws_db_instance.this.master_user_secret[0].secret_arn }
