---
name: terraform-change
description: Safe Terraform edits against S3 remote state for namma-medmate. Use when changing infra/terraform or running /tf-plan. Never commit state or locks.
---

# Terraform change

- Backend: S3 `namma-medmate-tfstate-105927215604`, DynamoDB `namma-medmate-tf-locks`.
- Prefer `infra/terraform` modules; keep env stacks thin.
- Never commit `terraform.tfstate`, env `.terraform.lock.hcl`, or `.terraform/`.
- Stop unless the requirement needs infra.

PR note:

```markdown
### Terraform blast radius

- Env: staging | prod | both
- Modules touched: …
- Resources created/changed/destroyed: …
- Rollback: revert PR
```

Plan with short-lived AWS creds. Do not apply prod from an agent session unless the user asks.
