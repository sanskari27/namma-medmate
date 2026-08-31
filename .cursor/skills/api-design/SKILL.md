---
name: api-design
description: Flat resource-oriented Express routes under /slug via lambda-bootstrap. Use when adding controllers or swagger paths. No enterprise factories.
---

# API design

- Flat routes `/<slug>/...` via `@namma-medmate/lambda-bootstrap`.
- One controller file per operation (`get-session.controller.ts`).
- No nested enterprise factories, no pass-through service layers, no `app → module-api` imports.
- Pagination: `@namma-medmate/pagination-utils`. Envelopes: `response-envelope`.
- `/health` is bootstrap-owned.
