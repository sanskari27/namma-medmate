---
name: env-doctor
description: Trace Zod env, .env.example, local-dev, and SSM failures without guessing secrets. Use for /env-doctor or when APIs fail to boot.
---

# Env doctor

Never guess env vars. Load through `@namma-medmate/env-config` + module Zod schema (copy `modules/auth/api/src/config/env.ts`).

Trace: `.env.example` → `local-dev` → `secrets-config/` SSM path manifests. **Do not print secret values.**

Missing `OIDC_*` / ports: fix the schema default or the example file, do not hardcode production secrets in source.
