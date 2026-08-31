---
name: owasp-security
description: Default Express hardening — Zod inputs, no string SQL, no secrets in logs, presigned uploads. Use when writing APIs or /security-review.
---

# OWASP security

- Zod-parse all inputs.
- Drizzle only — no string-concat SQL.
- No secrets, PII, or Rx text in logs.
- Tenant checks server-side (`tenant-scope-api`).
- Uploads via `@namma-medmate/storage-client` presign, not Lambda body.
- CORS only as configured in lambda-bootstrap.

Pair with `security-review-medmate` and `auth-patterns`.
