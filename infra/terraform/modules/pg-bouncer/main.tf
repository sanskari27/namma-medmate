variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "rds_security_group_id" { type = string }
variable "database_host" { type = string }
variable "max_client_conn" {
  type    = number
  default = 100
}
variable "default_pool_size" {
  type    = number
  default = 20
}
variable "deployment_minimum_healthy_percent" {
  type    = number
  default = 100
}
variable "deployment_maximum_percent" {
  type    = number
  default = 200
}

resource "aws_security_group" "pgbouncer" {
  name   = "namma-medmate-${var.environment}-pgbouncer"
  vpc_id = var.vpc_id
}

resource "aws_ecs_cluster" "this" {
  name = "namma-medmate-${var.environment}"
}

resource "aws_iam_role" "execution" {
  name = "namma-medmate-${var.environment}-pgbouncer-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_task_definition" "pgbouncer" {
  family                   = "namma-medmate-${var.environment}-pgbouncer"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn
  container_definitions = jsonencode([
    {
      name         = "pgbouncer"
      image        = "edoburu/pgbouncer:v1.23.1-p1"
      essential    = true
      portMappings = [{ containerPort = 6432, protocol = "tcp" }]
      environment = [
        { name = "DB_HOST", value = var.database_host },
        { name = "POOL_MODE", value = "transaction" },
        { name = "MAX_CLIENT_CONN", value = tostring(var.max_client_conn) },
        { name = "DEFAULT_POOL_SIZE", value = tostring(var.default_pool_size) }
      ]
    }
  ])
}

resource "aws_ecs_service" "pgbouncer" {
  name                               = "pgbouncer"
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.pgbouncer.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  deployment_maximum_percent         = var.deployment_maximum_percent
  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [aws_security_group.pgbouncer.id]
  }
}

output "security_group_id" { value = aws_security_group.pgbouncer.id }
output "cluster_name" { value = aws_ecs_cluster.this.name }
