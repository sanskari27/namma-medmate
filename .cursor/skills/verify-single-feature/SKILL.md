---
name: verify-single-feature
description: >-
  Verifies and completes one server feature against its docs/requirements
  spec: gap analysis, missing implementation, and .implementation.md update.
  Use when working on a single feature folder under docs/requirements/ or when
  asked to check if a specific feature is complete.
---

# Verify Single Feature

Use when the scope is **one feature**, not the full pipeline.

## Steps

1. Identify spec file(s) in `docs/requirements/<feature>/`
2. Ensure paired `*.implementation.md` exists (copy from `_implementation-template.md` if not)
3. Act as **feature-verifier** — read `.cursor/agents/feature-verifier.md` and `context-data/feature-subagent.md`
4. Write gap report to `docs/requirements/reports/<feature>-gap-analysis.md`
5. Implement non-blocked gaps in `server/`
6. Update implementation doc
7. Compile: `cd server && ./mvnw -DskipTests compile`

## Rule ID convention

Specs use `{DOMAIN}-R{nn}` (e.g. `AUTH-R01`, `CONV-R12`). Map each rule to:
- Status in gap analysis
- Checkbox in implementation doc
- Code anchor (class.method)

## Do not

- Invent requirements not in the spec
- Modify existing Flyway migrations
- Write tests (unless user explicitly enables Phase 2)
- Touch frontend unless requested

## Example invocation

> "Verify auth against docs/requirements/auth/auth.md and fill any gaps"

Expected outputs:
- `docs/requirements/auth/auth.implementation.md` (updated)
- `docs/requirements/reports/auth-gap-analysis.md`
- Code changes in `server/src/main/java/...`
