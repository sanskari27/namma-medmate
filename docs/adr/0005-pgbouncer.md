# ADR 0005: PgBouncer on ECS Fargate

- Status: Accepted
- Date: 2026-08-31

## Decision

PostgreSQL is reached through a Terraform-managed ECS/Fargate PgBouncer service. Lambdas do not use conventional sidecars. Pool mode is transaction.
