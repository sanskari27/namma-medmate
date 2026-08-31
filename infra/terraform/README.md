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
