---
name: lambda-bootstrap-module
description: Wire a module API with handler.ts, local.ts, app.ts, and lambda-bootstrap attachRoute. Use when creating or changing modules/*/api Express Lambdas.
---

# Lambda bootstrap module

Copy `modules/auth/api`.

- `createExpressApp` from `@namma-medmate/lambda-bootstrap` — `/health` is automatic.
- `attachRoute(endpoint, ...middleware, controller)` — one controller file per operation.
- `src/config/env.ts` — Zod schema + `loadEnv` from `@namma-medmate/env-config`.
- `handler.ts` Lambda export; `local.ts` `tsx` listen.

Do not reimplement `/health`. Do not add a custom Express factory. Routes are `/<slug>/...`.
