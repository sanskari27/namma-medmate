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

Terraform looks up the existing public hosted zone `nammamedmate.com` and maintains the `pharmacy` A record to the EC2 Elastic IP. The zone must already exist in the same AWS account. Terraform also owns the `medmatepharmacy.com` zone used by the public site.

Apply infrastructure from `infra/terraform/envs/prod`. The deployment workflow does not apply Terraform.

## Runtime configuration

`scripts/pull-prod-env.sh` writes the SSM parameter `/namma-medmate-prod/compose.env` to `.env` before Compose starts. The website image reads `WEBSITE_SITE_URL` and `NEXT_PUBLIC_API_BASE_URL`. The pharmacy image currently reads neither.

`.env.prod.example` lists only those consumed values. Future database or provider credentials belong in SSM when a backend slice needs them; they are not placeholders in Compose today.

## Health and rollback

Deploy waits until both Compose health checks pass, then requests `http://127.0.0.1:10082/` and `http://127.0.0.1:10083/`. A failed pharmacy start leaves the workflow red and prints the service logs.

The previous successful Git tag remains available. Restoring it means running a reviewed deployment of that commit after the same checks. Containers are replaced one service build at a time, and Nginx keeps the public names pointed at the loopback ports.

The pharmacy MVP has no server database, so a dashboard deploy does not migrate stored customer data. Browser `localStorage` remains on each user's device until the backend slices replace it.
