---
name: auth-patterns
description: Pharmacy session vs HQ principal, bearer via auth-utils, never trust client tenant or role. Use when implementing authz on endpoints or chemist login.
---

# Auth patterns

- Pharmacy User session vs HQ principal — from the requirement, not guessed.
- Bearer via `@namma-medmate/auth-utils`. Do not trust client-sent `tenant_id` or role.
- Current `modules/auth` OIDC widget is **not** chemist login. Spec `06-auth.md` supersedes it and depends on `tenancy`, `whatsapp`, `audit`.
- Owner role cannot be reduced on issued claims (when implementing chemist login).
