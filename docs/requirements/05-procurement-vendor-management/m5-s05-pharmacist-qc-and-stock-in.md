---
id: M5-S05
epic: M5
title: Pharmacist QC and stock-in
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Pharmacist, Inventory]
depends_on: [M5-S04, M4-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5-S05 — Pharmacist QC and stock-in

## User story

As **Pharmacist or Inventory**, I want to **accept or reject received batches and stock only accepted quantities** so that **procure branch stock through controlled supplier, po, receipt, qc, return, and payable flows.**

## Scope

### In

- Only Pharmacist role performs QC.
- QC uses visual inspection and checklist.
- Partial acceptance is supported.
- Accepted quantities create batches and stock movements once.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M5-S05-AC01 — Only Pharmacist role performs QC

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They accept or reject received batches and stock only accepted quantities | Only Pharmacist role performs QC. |

### M5-S05-AC02 — QC uses visual inspection and checklist

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They accept or reject received batches and stock only accepted quantities | QC uses visual inspection and checklist. |

### M5-S05-AC03 — Partial acceptance is supported

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They accept or reject received batches and stock only accepted quantities | Partial acceptance is supported. |

### M5-S05-AC04 — Accepted quantities create batches and stock movements once

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They accept or reject received batches and stock only accepted quantities | Accepted quantities create batches and stock movements once. |

### M5-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The accept or reject received batches and stock only accepted quantities operation is attempted | Non-pharmacist action, quantity mismatch, repeated decision, invalid expiry, or stock-in replay fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- QC and stock-in commands use /api/v1/goods-receipts/{id}/quality-check.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides checklist, batch details, partial quantities, and immutable outcome.
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
