---
name: implement-module
description: Implement one Namma MedMate requirement file into modules/{slug} end-to-end. Use when coding a numbered docs/requirements spec or running /implement-module or /next-module.
---

# Implement module

Implement **one** `docs/requirements/NN-slug.md`. Do not batch modules.

## Steps

1. Read `docs/requirements/00-glossary.md`, `docs/requirements/00-decomposition-plan.md`, then **one** spec.
2. Climb skill `ponytail` + `reuse-platform-libs`.
3. Confirm Depends-on rows are `done` in `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md` (or stub §3/§7 contracts). Claim the row `in_progress`.
4. If `modules/{slug}` is missing → skill `scaffold-module`.
5. Skill `tdd-enforcer`: failing unit + e2e specs from each AC **before** runtime code.
6. **API:** `api-design` + `contract-first-api` → `pnpm codegen` → controllers (`owasp-security`, `auth-patterns`, `tenant-scope-api`, `error-envelope`) → `drizzle-schema` if tables. Env via `env-doctor`.
7. **UI after design:** `stitch-ui-design`, then `shadcn-shared-ui` + `react-patterns` + `tailwind-utility`, `rtk-query-api-client`, `add-i18n-keys`, `add-event-bus-event`, `wire-ui-into-app`.
8. Own only §6 entities. `emit-audit-event` / `whatsapp-send-only` when §3 says so.
9. Skill `verify-gates` to green (`debug-quality-gate` if red). Then `clean-code` / `code-reviewer` + `/review-module`.
10. Mark tracker `done` only when gates are green.

## Done when

- FRs + failure-catalogue rows have tests
- Stitch screens exist for owned UI (§7.5)
- UI uses shadcn from `@namma-medmate/shared-ui` (no per-module primitives)
- Generated client used; no `api/db`; boundaries green
- Format, lint, typecheck, 100% coverage, Playwright green
- Tracker updated

## Guardrails

- One module per run. Copy `modules/auth/{ui,api}`, not `_template` internals.
- Do not create a HQ app unless asked. Next real module is `01-tenancy`.
- Current auth OIDC widget is not chemist login (`06-auth.md`).
