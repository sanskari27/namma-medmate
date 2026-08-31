---
name: contract-first-api
description: Author OpenAPI swagger first, run codegen, never edit generated client or shared-types. Use when adding or changing HTTP endpoints.
---

# Contract-first API

1. Write `modules/{slug}/api/contract/swagger.yaml` to match requirement §7 (paths, error codes, envelopes).
2. Keep `contract/implemented-routes.json` in sync with `attachRoute` endpoints.
3. `pnpm codegen` then `pnpm exec nx run contracts:check`.
4. Never hand-edit `libs/api-client/src/generated` or `libs/shared-types/src/generated`.

Envelope: `{ data }` success; `{ error: { code, message, i18n_key } }` failure. Skill `api-contract-tester` before merge.
