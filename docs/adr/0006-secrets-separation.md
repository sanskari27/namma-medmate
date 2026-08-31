# ADR 0006: Secrets separation

- Status: Accepted
- Date: 2026-08-31

## Decision

Terraform never reads or writes secret values. GitHub Environment secrets are synced to SSM at `/namma-medmate/{env}/{service}/{name}`. RDS admin credentials are the sole AWS-managed Secrets Manager exception.
