# Terraform

State files and provider lock files are **not** stored in git. They live in a versioned S3 bucket.

## S3 layout

Bucket: `namma-medmate-tfstate-105927215604` (`ap-south-1`)

```text
namma-medmate/
  terraform/
    state/
      staging/terraform.tfstate
      prod/terraform.tfstate
    locks/
      staging/.terraform.lock.hcl
      prod/.terraform.lock.hcl
  artifacts/
    staging/auth-api/handler.zip
    prod/auth-api/handler.zip
```

State locking uses DynamoDB table `namma-medmate-tf-locks` (this is the Terraform operation lock, not a file).

## Bootstrap (once per account)

```sh
cd infra/terraform/global/shared-state-backend
terraform init
terraform apply \
  -var aws_region=ap-south-1 \
  -var bucket_name=namma-medmate-tfstate-105927215604 \
  -var lock_table_name=namma-medmate-tf-locks
```

If the GitHub OIDC provider already exists in the account, pass `-var create_github_oidc_provider=false`.

## Environment apply

```sh
cd infra/terraform/environments/staging
terraform init -backend-config=backend.hcl
aws s3 cp .terraform.lock.hcl \
  s3://namma-medmate-tfstate-105927215604/namma-medmate/terraform/locks/staging/.terraform.lock.hcl
terraform apply
```

`backend.hcl` and `terraform.tfvars` are committed (bucket names and hostnames, not secrets). `.terraform.lock.hcl` is gitignored and restored from S3 in CI.

## API custom domain

Each environment has one HTTP API custom domain. Lambda short names are API mapping keys, so the mapping prefix is stripped before the request reaches the function.

| Environment | Host                           | Auth health                                            |
| ----------- | ------------------------------ | ------------------------------------------------------ |
| staging     | `api.staging.nammamedmate.com` | `https://api.staging.nammamedmate.com/auth-api/health` |
| prod        | `api.nammamedmate.com`         | `https://api.nammamedmate.com/auth-api/health`         |

Add another Lambda by instantiating `modules/api-gateway` again with the same `custom_domain_name` and a new `base_path` (the Nx project name).

The default `execute-api` URL stays enabled. After GitHub environment variables point at the custom host, `disable_execute_api_endpoint` can be set in a follow-up.

### GitHub environment variables

Set these so the web app and any remaining smoke checks use the custom domain (include the `/auth-api` base path):

- staging `API_BASE_URL` / `STAGING_API_BASE_URL` → `https://api.staging.nammamedmate.com/auth-api`
- prod `API_BASE_URL` → `https://api.nammamedmate.com/auth-api`

Prod Terraform is not auto-applied by CI. After staging is verified, apply `infra/terraform/environments/prod` separately.
