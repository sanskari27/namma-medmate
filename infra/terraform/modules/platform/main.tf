terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = var.project_name
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${local.name}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, 0)
  availability_zone       = local.azs[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${local.name}-public" }
}

resource "aws_subnet" "private" {
  count             = length(local.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-private-${count.index}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = { Name = "${local.name}-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${local.name}-private-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(local.azs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "ec2" {
  name        = "${local.name}-ec2"
  description = "EC2 app host"
  vpc_id      = aws_vpc.this.id
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_ssh_cidr
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name}-ec2-sg" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "RDS Postgres"
  vpc_id      = aws_vpc.this.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name}-rds-sg" }
}

resource "aws_security_group" "redis" {
  name        = "${local.name}-redis"
  description = "ElastiCache Redis"
  vpc_id      = aws_vpc.this.id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name}-redis-sg" }
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-db-subnet" }
}

resource "aws_db_instance" "this" {
  identifier              = "${local.name}-postgres"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  db_name                 = var.db_name
  username                = var.db_username
  password                = random_password.db.result
  db_subnet_group_name    = aws_db_subnet_group.this.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  storage_encrypted       = true
  skip_final_snapshot     = var.skip_final_snapshot
  backup_retention_period = 7
  tags                    = { Name = "${local.name}-rds" }
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${local.name}-redis"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "this" {
  cluster_id           = "${local.name}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [aws_security_group.redis.id]
  tags                 = { Name = "${local.name}-redis" }
}

resource "aws_iam_role" "ec2" {
  name = "${local.name}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "compose_env" {
  name = "${local.name}-compose-env"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:PutParameter",
      ]
      Resource = aws_ssm_parameter.compose_env.arn
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu
    mkdir -p /opt/namma-medmate
  EOF
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  user_data              = local.user_data
  tags                   = { Name = "${local.name}-app" }
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "${local.name}-eip" }
}

resource "aws_secretsmanager_secret" "db" {
  name = "${local.name}/db-password"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = random_password.db.result
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "compose_env" {
  name        = "/${local.name}/compose.env"
  description = "Production compose .env for Namma MedMate"
  type        = "SecureString"
  value = join("\n", [
    "DATABASE_URL=jdbc:postgresql://${aws_db_instance.this.address}:5432/${var.db_name}",
    "DATABASE_USERNAME=${var.db_username}",
    "DATABASE_PASSWORD=${random_password.db.result}",
    "REDIS_HOST=${aws_elasticache_cluster.this.cache_nodes[0].address}",
    "REDIS_PORT=6379",
    "JWT_SECRET=${random_password.jwt.result}",
    "SPRING_PROFILES_ACTIVE=prod",
    "PUBLIC_BASE_URL=https://api.nammamedmate.com",
    "CORS_ALLOWED_ORIGINS=https://dispensary.nammamedmate.com,https://admin.nammamedmate.com",
    "STORAGE_ROOT=/app/files",
    "VITE_API_BASE_URL=https://api.nammamedmate.com",
    "RESEND_API_KEY=${var.resend_api_key}",
    "RESEND_WEBHOOK_SECRET=${var.resend_webhook_secret}",
    "RESEND_FROM=${var.resend_from}",
    "CASHFREE_CLIENT_ID=${var.cashfree_client_id}",
    "CASHFREE_CLIENT_SECRET=${var.cashfree_client_secret}",
    "CASHFREE_WEBHOOK_SECRET=${var.cashfree_webhook_secret}",
    "CASHFREE_ENV=${var.cashfree_env}",
    "CASHFREE_RETURN_URL=${var.cashfree_return_url}",
  ])

  lifecycle {
    ignore_changes = [value]
  }
}
