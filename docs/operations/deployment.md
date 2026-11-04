# Deployment

## What deploys

A push to `main` runs `.github/workflows/release.yml`.

1. `.github/workflows/ci-tests.yml` must pass on that commit. It typechecks and builds `namma-pharmacy`, builds `medmate-website`, and validates both Compose files.
2. The workflow tags the checked commit `vN`.
3. `.github/workflows/build-deploy.yml` checks out that tag on the self-hosted `deploy-prod` runner and recreates both production containers.

Manual dispatch of the main workflow follows the same checks. It cannot deploy a tag without running them. The build-and-deploy workflow has no direct dispatch.

The feature-branch tag workflow does not deploy production.

## Host

Both containers run on the existing EC2 instance in `ap-south-1`.

| Service | Container port | Host loopback | Public name |
|---------|----------------|---------------|-------------|
| `website` | 3000 | 127.0.0.1:10082 | medmatepharmacy.com |
| `pharmacy` | 3000 | 127.0.0.1:10083 | pharmacy.nammamedmate.com |

Host Nginx proxies the public names. The pharmacy certificate is separate from the website certificate and is installed by `scripts/setup-prod-tls.sh`.

Before that script runs, deploy upserts the `pharmacy.nammamedmate.com` A record to this host's public IP in the existing public `nammamedmate.com` zone. The zone must already exist in the same AWS account. The EC2 role policy `namma-medmate-prod-pharmacy-dns` allows that upsert. Apply it once from `infra/terraform/envs/prod` if the role does not have it yet. Terraform also defines the same A record and owns the `medmatepharmacy.com` zone. The deployment workflow does not apply Terraform.

## Runtime configuration

`scripts/pull-prod-env.sh` writes the SSM parameter `/namma-medmate-prod/compose.env` to `.env` before Compose starts. The website image reads `WEBSITE_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, and `NEXT_PUBLIC_PHARMACY_URL` (where the public consultation form posts). The pharmacy image reads `DATABASE_URL`, `AWS_REGION`, `S3_BUCKET`, `AUTH_JWT_SECRET`, and optional `MASTER_PHONES` (comma-separated master login numbers, seeded into the allowlist on startup). Optional OTP and token settings are `OTP_LENGTH`, `OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_MAX_SENDS`, `OTP_SEND_WINDOW_SECONDS`, `AUTH_ACCESS_TTL_SECONDS`, and `AUTH_REFRESH_TTL_SECONDS`.

Terraform can create RDS and the file bucket. Apply it by hand from `infra/terraform/envs/prod`. Put the RDS URL and `AUTH_JWT_SECRET` into the SSM parameter after apply. Terraform does not overwrite the existing parameter value. The release workflow does not apply Terraform. The next apply removes the Cognito user pool, its app client, and the SMS role if they are still in state. Production SMS is not sent until `sendOtp` in `namma-pharmacy/src/server/sms.ts` is implemented for the DLT provider. Sign-in refuses to start when `AUTH_JWT_SECRET` is empty.

## Health and rollback

Deploy waits until both Compose health checks pass, then requests `http://127.0.0.1:10082/` and `http://127.0.0.1:10083/`. It then requires `https://pharmacy.nammamedmate.com/` to return the pharmacist dashboard. A failed pharmacy start, missing certificate, or wrong page leaves the workflow red. Pharmacy certificate issuance failure stops the TLS script. The website certificate can still warn and continue.

The previous successful Git tag remains available. Restoring it means running a reviewed deployment of that commit after the same checks. Containers are replaced one service build at a time, and Nginx keeps the public names pointed at the loopback ports.

The pharmacy document lives in Postgres. A dashboard deploy replaces the app containers. It does not copy browser storage from a pharmacist's device.
