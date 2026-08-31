---
name: typescript-strict
description: Complete TypeScript shapes with no any or unsafe casts. Use when writing TS/TSX or API contracts.
---

# TypeScript strict

- No `any`, no `as unknown as`, no empty interfaces.
- Named types for public props and payloads.
- Generated OpenAPI types from `@namma-medmate/shared-types` / `api-client` win over hand-rolled duplicates.
- Matches `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`).
