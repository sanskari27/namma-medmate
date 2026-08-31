# Implement module

Usage: `/implement-module 01-tenancy` (or path `docs/requirements/01-tenancy.md`)

Implement **one** requirement file into `modules/{slug}`.

## Steps

1. Resolve the spec under `docs/requirements/NN-slug.md`.
2. Follow skill `implement-module` (Ponytail → TDD → Stitch → shadcn/`shared-ui` → code → `verify-gates`).
3. Delegate to agent `module-implementer` if splitting work. UI design: agent `ui-designer`.
4. Hand off `/review-module` before merge.

## Guardrails

- One module per run. Own only §6 entities.
- Failing tests before runtime code. 100% Vitest coverage.
- Stitch before React. Controls from `@namma-medmate/shared-ui` (skill `shadcn-shared-ui`). No HQ app unless asked.
- Copy `modules/auth/{ui,api}` for scaffolding.

## Done when

FRs + failure-catalogue tests pass, gates green, tracker ready to mark `done`.
