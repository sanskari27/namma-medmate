---
name: security-review-medmate
description: Security checklist for tenant isolation, Rx/PII, secrets, RBAC, and uploads. Use after auth, payment, Rx, webhook, or /security-review.
---

# Security review (MedMate)

Produce BLOCK/WARN. Do not silently “fix forward” the spec.

- **Secrets**: none in repo or logs; SSM / `env-config`; never print values (`env-doctor`).
- **Tenancy**: `tenant_id` + `location_id` server-side; no client-trusted role (`tenant-scope-api`, `auth-patterns`).
- **PII / Rx**: no phone, name, address, Rx text, or Rx URLs in logs — ids only.
- **Uploads**: `@namma-medmate/storage-client` presign; no large multipart through Lambda.
- **SQL**: Drizzle only; no string concat.
- **WhatsApp/webhooks**: HMAC/raw body when the spec requires; idempotent provider event ids.

```
## Security review: <slug>
Verdict: PASS | FAIL
- [BLOCK] …
- [WARN] …
```

Done when no BLOCK remains (or an explicit PR waiver).
