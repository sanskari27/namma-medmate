# Terraform — prod only

Hosts:
- `api.nammamedmate.com` → Spring API (`127.0.0.1:18080`)
- `pharmacy.nammamedmate.com` → dispensary SPA (`127.0.0.1:10080`)
- `admin.nammamedmate.com` → admin SPA (`127.0.0.1:10081`)

1. **Bootstrap** (once): `cd infra/terraform/bootstrap && terraform init && terraform apply -var state_bucket_name=YOUR_UNIQUE_BUCKET`
2. Update `envs/prod/main.tf` backend `bucket` with the bootstrap output.
3. **Prod**: `cd infra/terraform/envs/prod && cp terraform.tfvars.example terraform.tfvars` — set `admin_ssh_cidr` to your `/32`. Do not open SSH to the world. Prefer SSM Session Manager.
4. `terraform init && terraform plan && terraform apply`
5. On the EC2 host (SSM): install the GitHub runner with `scripts/install-github-runner.sh`, then push to `main` (workflow **Main deploy**) or run it manually.
6. First deploy runs `scripts/setup-prod-tls.sh` for Let's Encrypt on the three hostnames.

Outputs include EC2 instance ID (SSM tunnel) and `ssm_compose_env_parameter`.
The first apply seeds `/namma-medmate-prod/compose.env` (including HTTPS
password-reset and verify-email URLs, and Meta WhatsApp keys when the tfvars
are set); later applies leave that value alone (`ignore_changes`). After that,
add/update/remove keys with the **Prod env (SSM)** workflow or
`./scripts/update-prod-env.sh`. Existing blobs that predate those email URL or
`META_WHATSAPP_*` keys need a one-time `set`. Deploy pulls the blob with
`./scripts/pull-prod-env.sh`.
