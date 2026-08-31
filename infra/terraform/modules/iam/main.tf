variable "environment" { type = string }

resource "aws_iam_role" "placeholder" {
  name = "namma-medmate-${var.environment}-app"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

output "app_role_name" { value = aws_iam_role.placeholder.name }
