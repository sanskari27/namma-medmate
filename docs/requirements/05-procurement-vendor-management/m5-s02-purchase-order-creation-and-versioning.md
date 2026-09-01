---
id: M5-S02
epic: M5
title: Purchase order creation and versioning
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Inventory]
depends_on: [M5-S01, M4-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5-S02 — Purchase order creation and versioning

## User story

As **OWNER or Inventory**, I want to **create a branch purchase order for one supplier and retain edit history** so that **procure branch stock through controlled supplier, po, receipt, qc, return, and payable flows.**

## Scope

### In

- One PO references exactly one supplier.
- OWNER and Inventory roles may create.
- Every edit produces a retained version and recalculated totals.
- Lifecycle transitions prevent editing closed/cancelled quantities.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M5-S02-AC01 — One PO references exactly one supplier

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create a branch purchase order for one supplier and retain edit history | One PO references exactly one supplier. |

### M5-S02-AC02 — OWNER and Inventory roles may create

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create a branch purchase order for one supplier and retain edit history | OWNER and Inventory roles may create. |

### M5-S02-AC03 — Every edit produces a retained version and recalculated totals

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create a branch purchase order for one supplier and retain edit history | Every edit produces a retained version and recalculated totals. |

### M5-S02-AC04 — Lifecycle transitions prevent editing closed/cancelled quantities

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create a branch purchase order for one supplier and retain edit history | Lifecycle transitions prevent editing closed/cancelled quantities. |

### M5-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The create a branch purchase order for one supplier and retain edit history operation is attempted | Mixed suppliers, inactive supplier/product, stale version, invalid quantity, or cross-branch access fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- PO CRUD, versions, and transitions use /api/v1/purchase-orders.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides creation, line validation, version comparison, and lifecycle status.
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
