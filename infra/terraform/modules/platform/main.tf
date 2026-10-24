terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx git jq unzip
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker nginx
usermod -aG docker ubuntu
mkdir -p /opt/namma-medmate /opt/actions-runner /var/www/certbot
chown ubuntu:ubuntu /opt/namma-medmate /opt/actions-runner
rm -f /etc/nginx/sites-enabled/default
cat >/etc/nginx/sites-available/namma-medmate.conf <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name api.nammamedmate.com pharmacy.nammamedmate.com admin.nammamedmate.com _;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / {
        return 200 'namma-medmate host ready\n';
        add_header Content-Type text/plain;
    }
}
NGINX
ln -sfn /etc/nginx/sites-available/namma-medmate.conf /etc/nginx/sites-enabled/namma-medmate.conf
nginx -t && systemctl reload nginx
EOF
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.ec2_instance_type
  lifecycle {
    # most_recent AMI drifts whenever Ubuntu publishes an image. Replacing
    # this instance would take production down.
    ignore_changes = [ami]
  }
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }
  user_data = local.user_data
  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }
  tags = { Name = "${local.name}-app" }
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "${local.name}-eip" }
}

resource "aws_route53_zone" "pharmacy_site" {
  name    = var.pharmacy_dns_zone_name
  comment = "Public site medmate-website"
  tags    = { Name = var.pharmacy_dns_zone_name }
}

resource "aws_route53_record" "pharmacy_site_apex" {
  zone_id = aws_route53_zone.pharmacy_site.zone_id
  name    = var.pharmacy_dns_zone_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

resource "aws_route53_record" "pharmacy_site_www" {
  zone_id = aws_route53_zone.pharmacy_site.zone_id
  name    = "www.${var.pharmacy_dns_zone_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

data "aws_route53_zone" "namma" {
  name         = "nammamedmate.com."
  private_zone = false
}

resource "aws_route53_record" "pharmacy_app" {
  zone_id = data.aws_route53_zone.namma.zone_id
  name    = "pharmacy.nammamedmate.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

resource "aws_ssm_parameter" "compose_env" {
  name        = "/${local.name}/compose.env"
  description = "Production compose .env for Namma MedMate"
  type        = "SecureString"
  # Live value is kept. ignore_changes stops a later apply from wiping the site env.
  value = "WEBSITE_SITE_URL=https://medmatepharmacy.com"

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "Postgres from the app host only"
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

resource "aws_db_subnet_group" "pharmacy" {
  name       = "${local.name}-pharmacy"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-pharmacy-db" }
}

resource "aws_db_instance" "pharmacy" {
  identifier                 = "${local.name}-pharmacy"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = "db.t4g.micro"
  allocated_storage          = 20
  db_name                    = "pharmacy"
  username                   = "pharmacy"
  manage_master_user_password = true
  db_subnet_group_name       = aws_db_subnet_group.pharmacy.name
  vpc_security_group_ids     = [aws_security_group.rds.id]
  publicly_accessible        = false
  storage_encrypted          = true
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name}-pharmacy-final"
  tags                       = { Name = "${local.name}-pharmacy" }
}

resource "aws_s3_bucket" "files" {
  bucket = "${local.name}-pharmacy-files"
  tags   = { Name = "${local.name}-pharmacy-files" }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "cognito_sms" {
  name = "${local.name}-cognito-sms"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cognito-idp.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "sts:ExternalId" = "${local.name}-cognito-sms" } }
    }]
  })
}

resource "aws_iam_role_policy" "cognito_sms" {
  name = "${local.name}-cognito-sms"
  role = aws_iam_role.cognito_sms.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = "*"
    }]
  })
}

resource "aws_cognito_user_pool" "pharmacy" {
  name = "${local.name}-pharmacy"
  username_attributes      = ["phone_number"]
  auto_verified_attributes = ["phone_number"]
  sms_configuration {
    external_id    = "${local.name}-cognito-sms"
    sns_caller_arn = aws_iam_role.cognito_sms.arn
  }
  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD", "SMS_OTP"]
  }
  tags = { Name = "${local.name}-pharmacy" }
}

resource "aws_cognito_user_pool_client" "pharmacy" {
  name            = "${local.name}-pharmacy"
  user_pool_id    = aws_cognito_user_pool.pharmacy.id
  generate_secret = true
  explicit_auth_flows = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

resource "aws_iam_role_policy" "pharmacy_runtime" {
  name = "${local.name}-pharmacy-runtime"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.files.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:InitiateAuth",
          "cognito-idp:RespondToAuthChallenge",
        ]
        Resource = aws_cognito_user_pool.pharmacy.arn
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_db_instance.pharmacy.master_user_secret[0].secret_arn
      }
    ]
  })
}
