variable "environment" { type = string }
variable "application_name" { type = string }

resource "aws_appconfig_application" "this" {
  name = var.application_name
}

resource "aws_appconfig_environment" "this" {
  application_id = aws_appconfig_application.this.id
  name           = var.environment
}

output "application_id" { value = aws_appconfig_application.this.id }
output "environment_id" { value = aws_appconfig_environment.this.environment_id }
