# Terraform — prod only

1. **Bootstrap** (once): `cd infra/terraform/bootstrap && terraform init && terraform apply -var state_bucket_name=YOUR_UNIQUE_BUCKET`
2. Update `envs/prod/main.tf` backend `bucket` with the bootstrap output.
3. **Prod**: `cd infra/terraform/envs/prod && cp terraform.tfvars.example terraform.tfvars` — set `admin_ssh_cidr` to your IP.
4. `terraform init && terraform plan && terraform apply`

Outputs include EC2 instance ID (SSM tunnel) and `ssm_compose_env_parameter`.
The first apply seeds `/namma-medmate-prod/compose.env`; later applies leave
that value alone (`ignore_changes`). After that, add/update/remove keys with
the **Prod env (SSM)** workflow or `./scripts/update-prod-env.sh`. Deploy pulls
the blob with `./scripts/pull-prod-env.sh`.
