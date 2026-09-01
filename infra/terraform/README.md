# Terraform — prod only

1. **Bootstrap** (once): `cd infra/terraform/bootstrap && terraform init && terraform apply -var state_bucket_name=YOUR_UNIQUE_BUCKET`
2. Update `envs/prod/main.tf` backend `bucket` with the bootstrap output.
3. **Prod**: `cd infra/terraform/envs/prod && cp terraform.tfvars.example terraform.tfvars` — set `admin_ssh_cidr` to your IP.
4. `terraform init && terraform plan && terraform apply`

Outputs include EC2 instance ID (for SSM tunnel), RDS and Redis endpoints for `.env` on the host.
