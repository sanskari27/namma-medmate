variable "environment" { type = string }
variable "function_name" { type = string }
variable "artifact_bucket" { type = string }
variable "artifact_key" { type = string }
variable "handler" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "ssm_parameter_arns" { type = list(string) }
variable "reserved_concurrent_executions" {
  type    = number
  default = -1
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}

resource "aws_iam_role" "lambda" {
  name = "${var.function_name}-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ssm" {
  name = "ssm-read"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = var.ssm_parameter_arns
    }]
  })
}

resource "aws_iam_role_policy" "runtime" {
  name = "runtime-read"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:DescribeKey"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "appconfig:StartConfigurationSession",
          "appconfig:GetLatestConfiguration",
          "appconfig:GetConfiguration"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  handler       = var.handler
  # Local/CI uses Node 24; AWS Lambda's newest published Node.js runtime in this provider is 22.
  runtime                        = "nodejs22.x"
  s3_bucket                      = var.artifact_bucket
  s3_key                         = var.artifact_key
  timeout                        = 10
  reserved_concurrent_executions = var.reserved_concurrent_executions
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [var.environment_variables] : []
    content {
      variables = environment.value
    }
  }
  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }
}

output "function_name" { value = aws_lambda_function.this.function_name }
output "invoke_arn" { value = aws_lambda_function.this.invoke_arn }
output "arn" { value = aws_lambda_function.this.arn }
