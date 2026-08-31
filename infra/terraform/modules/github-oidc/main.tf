variable "environment" { type = string }
variable "github_org" { type = string }
variable "github_repo" { type = string }
variable "github_org_id" { type = string }
variable "github_repo_id" { type = string }

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  # Repos created after 2026-07-15 emit immutable OIDC subjects
  # (repo:org@orgId/repo@repoId:...). Keep the legacy name-only prefix too.
  subject_prefixes = [
    "repo:${var.github_org}/${var.github_repo}",
    "repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}",
  ]
  # Reusable workflows may mint either environment or calling-ref subjects.
  allowed_subs = flatten([
    for prefix in local.subject_prefixes : [
      "${prefix}:environment:${var.environment}",
      "${prefix}:ref:refs/heads/main",
      "${prefix}:ref:refs/tags/*",
    ]
  ])
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
          "token.actions.githubusercontent.com:sub" = local.allowed_subs
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
        Sid    = "DeployAndManageStack"
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
          "states:*",
          "tag:*",
          "sts:GetCallerIdentity",
          "iam:PassRole",
          "iam:GetRole",
          "iam:CreateServiceLinkedRole"
        ]
        Resource = "*"
      }
    ]
  })
}

output "deploy_role_arn" { value = aws_iam_role.gha.arn }
