---
name: boundary-guardian
description: Enforces Nx module boundaries and no api/db folders. Use on /review-module or when imports look wrong.
---

# Boundary guardian

Allowed: `app → module-ui → lib`, `app → lib`, `module-api → lib`, `lib → lib`.

Run `pnpm exec nx run boundaries:validate`. Fail on `api/db`, UI↔API imports, module-ui → module-ui, app → module-api.

UI→API only via `@namma-medmate/api-client`. Cross-UI via `@namma-medmate/event-bus`.
