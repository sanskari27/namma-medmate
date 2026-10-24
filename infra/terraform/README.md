# Terraform — prod only

The public site is `medmatepharmacy.com` and `www.medmatepharmacy.com` (`127.0.0.1:10082`), on the existing EC2 host.

The pharmacy dashboard is `pharmacy.nammamedmate.com` (`127.0.0.1:10083`). Terraform looks up the existing public `nammamedmate.com` hosted zone and maintains that `pharmacy` A record. It does not create the zone.

The database, file storage, and `api` / `admin` DNS records are not in this module.

`medmatepharmacy.com` is its own Route 53 public hosted zone. After apply, set the zone's name servers on the domain at GoDaddy (`terraform output pharmacy_nameservers`). TLS for that domain is a separate Let's Encrypt certificate, issued by `scripts/setup-prod-tls.sh` once the nameservers answer.

1. **Bootstrap** (once): `cd infra/terraform/bootstrap && terraform init && terraform apply -var state_bucket_name=YOUR_UNIQUE_BUCKET`
2. Update `envs/prod/main.tf` backend `bucket` with the bootstrap output.
3. **Prod**: `cd infra/terraform/envs/prod && cp terraform.tfvars.example terraform.tfvars` — set `admin_ssh_cidr` to your `/32`. Do not open SSH to the world. Prefer SSM Session Manager.
4. `terraform init && terraform plan && terraform apply`
5. On the EC2 host (SSM): install the GitHub runner with `scripts/install-github-runner.sh`, then push to `main` (workflow **Main deploy**) or run it manually.
6. Deploy runs `scripts/setup-prod-tls.sh` for Let's Encrypt on `medmatepharmacy.com` and `pharmacy.nammamedmate.com` once those names resolve to the host.

Outputs include EC2 instance ID (SSM tunnel) and `ssm_compose_env_parameter`.
`/namma-medmate-prod/compose.env` is left as-is on later applies (`ignore_changes`).
Change it with the **Prod env (SSM)** workflow or `./scripts/update-prod-env.sh`.
Deploy pulls it with `./scripts/pull-prod-env.sh`.
