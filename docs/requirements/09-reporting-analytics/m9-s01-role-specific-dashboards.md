---
id: M9-S01
epic: M9
title: Role-specific dashboards
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Cashier, Inventory, Accountant, OWNER]
depends_on: [M1-S05, M2-S06, M4-S04, M5-S05, M6-S05, M8-S01, M8-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-9-reporting--analytics--dashboards
  - docs/product/m9-reports.md
---

# M9-S01 — Role-specific dashboards

## User story

As **Cashier or Inventory or Accountant or OWNER**, I want to **open a default dashboard tailored to the signed-in role** so that **give each role actionable dashboards, comparisons, exports, and plan-appropriate analytics.**

## Scope

### In

- Cashier sees today sales and pending holds.
- Inventory sees low stock and pending transfers/GRN.
- Accountant sees AR/AP and expenses.
- OWNER sees a consolidated business view.
- Multiple-role users can access permitted dashboard modules.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M9-S01-AC01 — Cashier sees today sales and pending holds

| Given | When | Then |
|---|---|---|
| A Cashier signs in with an assigned active branch | They open the dashboard | They see today’s branch sales and their permitted pending holds, not finance or inventory administration |

### M9-S01-AC02 — Inventory sees low stock and pending transfers/GRN

| Given | When | Then |
|---|---|---|
| An Inventory-role user signs in with an assigned active branch | They open the dashboard | They see branch low stock, pending transfers, and pending GRN/QC work with source links |

### M9-S01-AC03 — Accountant sees AR/AP and expenses

| Given | When | Then |
|---|---|---|
| An Accountant signs in with one or more assigned branches | They open the dashboard | They see permitted AR/AP aging and expense totals and do not receive cashier or compliance actions |

### M9-S01-AC04 — OWNER sees a consolidated business view

| Given | When | Then |
|---|---|---|
| OWNER signs in to an active tenant | They open the dashboard | They see a tenant consolidation with an explicit branch filter and drill-down |

### M9-S01-AC05 — Multiple-role users can access permitted dashboard modules

| Given | When | Then |
|---|---|---|
| A user has multiple roles and branch assignments | They open or switch dashboard modules | They see the union of plan-allowed module permissions filtered to assigned branches, without duplicate widgets |

### M9-S01-AC06 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The open a default dashboard tailored to the signed-in role operation is attempted | Unpermitted widgets, foreign branches, or unsupported role requests disclose no data. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Dashboard projections use /api/v1/dashboards/{role} with server authorization.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary handles loading, empty, partial error, refresh, branch, and role states.
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
