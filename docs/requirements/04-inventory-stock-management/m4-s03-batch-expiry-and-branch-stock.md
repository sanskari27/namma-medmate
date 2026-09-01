---
id: M4-S03
epic: M4
title: Batch, expiry, and branch stock
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Inventory, Pharmacist]
depends_on: [M4-S01, M4-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S03 — Batch, expiry, and branch stock

## User story

As **Inventory or Pharmacist**, I want to **track stock by tenant, branch, product, and batch** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- Batch number, manufacture date, expiry date, and batch purchase price are retained.
- Batch tracking is mandatory for medicines requiring it.
- Inventory is strictly branch-scoped.
- All stock mutations create immutable movement facts and cannot make stock negative.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S03-AC01 — Batch number, manufacture date, expiry date, and batch purchase price are retained

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track stock by tenant, branch, product, and batch | Batch number, manufacture date, expiry date, and batch purchase price are retained. |

### M4-S03-AC02 — Batch tracking is mandatory for medicines requiring it

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track stock by tenant, branch, product, and batch | Batch tracking is mandatory for medicines requiring it. |

### M4-S03-AC03 — Inventory is strictly branch-scoped

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track stock by tenant, branch, product, and batch | Inventory is strictly branch-scoped. |

### M4-S03-AC04 — All stock mutations create immutable movement facts and cannot make stock negative

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track stock by tenant, branch, product, and batch | All stock mutations create immutable movement facts and cannot make stock negative. |

### M4-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The track stock by tenant, branch, product, and batch operation is attempted | Invalid dates, duplicate batch identity, cross-branch mutation, or negative balance fails atomically. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Batches, balances, and movements use /api/v1/inventory.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides branch stock, batch detail, and movement history.
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
