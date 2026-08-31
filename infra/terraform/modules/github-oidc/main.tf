variable "environment" { type = string }
variable "github_org" { type = string }
variable "github_repo" { type = string }

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "gha" {
  name = "namma-medmate-${var.environment}-gha"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:environment:${var.environment}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "gha_deploy" {
  name = "namma-medmate-${var.environment}-gha-deploy"
  role = aws_iam_role.gha.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:*",
          "s3:*",
          "cloudfront:*",
          "apigateway:*",
          "execute-api:*",
          "logs:*",
          "cloudwatch:*",
          "iam:*",
          "ec2:*",
          "rds:*",
          "ecs:*",
          "ecr:*",
          "elasticloadbalancing:*",
          "route53:*",
          "acm:*",
          "ssm:*",
          "secretsmanager:*",
          "dynamodb:*",
          "appconfig:*",
          "sns:*",
          "kms:*",
          "events:*",
          "application-autoscaling:*",
          "states:*"
        ]
        Resource = "*"
      }
    ]
  })
}

output "deploy_role_arn" { value = aws_iam_role.gha.arn }
