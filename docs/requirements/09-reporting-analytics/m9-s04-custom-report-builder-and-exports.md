---
id: M9-S04
epic: M9
title: Custom report builder and exports
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, authorized role]
depends_on: [M9-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-9-reporting--analytics--dashboards
  - docs/product/m9-reports.md
---

# M9-S04 — Custom report builder and exports

## User story

As **OWNER or authorized role**, I want to **build an ad-hoc report from allowed fields, filters, dates, and branches** so that **give each role actionable dashboards, comparisons, exports, and plan-appropriate analytics.**

## Scope

### In

- Only allowlisted fields and operators are available.
- Every report supports on-demand PDF and Excel/CSV as applicable.
- No scheduled delivery is added.
- Queries are tenant-scoped and resource-bounded.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M9-S04-AC01 — Only allowlisted fields and operators are available

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They build an ad-hoc report from allowed fields, filters, dates, and branches | Only allowlisted fields and operators are available. |

### M9-S04-AC02 — Every report supports on-demand PDF and Excel/CSV as applicable

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They build an ad-hoc report from allowed fields, filters, dates, and branches | Every report supports on-demand PDF and Excel/CSV as applicable. |

### M9-S04-AC03 — No scheduled delivery is added

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They build an ad-hoc report from allowed fields, filters, dates, and branches | No scheduled delivery is added. |

### M9-S04-AC04 — Queries are tenant-scoped and resource-bounded

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They build an ad-hoc report from allowed fields, filters, dates, and branches | Queries are tenant-scoped and resource-bounded. |

### M9-S04-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The build an ad-hoc report from allowed fields, filters, dates, and branches operation is attempted | Unknown field, unsafe operator, excessive result, unauthorized branch, or formula injection is rejected/escaped. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Definitions, preview, and export use /api/v1/reports/custom.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides field/filter/date/branch selection, preview, validation, and download.
- Handle loading, empty, validation, denied, conflict, failure, and success states with labels, keyboard access, visible focus, and focus restoration.
- UI guards improve UX only; the server remains the authorization boundary.

## Data and state

- Use UUID identifiers, UTC persistence, IST display, and INR minor units where money applies.
- Add schema only through a new Flyway migration; never edit an existing migration.
- Preserve historical transaction snapshots when referenced master data later changes.

## Required tests

- Unit tests for each business branch and validator.
- Spring integration tests for persistence, authorization, transaction rollback, tenant isolation, and branch isolation where applicable.
- Component/integration tests in every targeted React app.
- End-to-end happy path and at least one failure path for the complete cross-app workflow.
- Regression tests for every bug found while implementing this story.

## Definition of done

- [ ] Every acceptance criterion has automated evidence.
- [ ] Every dependency is `done` and linked decisions are closed.
- [ ] Tests were observed failing before runtime implementation and now pass.
- [ ] Target-specific format, lint, test, build, and compose gates pass.
- [ ] The independent story verifier returns `PASS`.
- [ ] The implementation tracker contains evidence and is the only changed status source.
