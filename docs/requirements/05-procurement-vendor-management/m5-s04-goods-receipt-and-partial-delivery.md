---
id: M5-S04
epic: M5
title: Goods receipt and partial delivery
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Inventory]
depends_on: [M5-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5-S04 — Goods receipt and partial delivery

## User story

As **Inventory**, I want to **record one or more receipts against an approved PO** so that **procure branch stock through controlled supplier, po, receipt, qc, return, and payable flows.**

## Scope

### In

- GRN cross-checks quantity and price against the original PO.
- Partial delivery keeps remaining quantities pending.
- Receipt does not increase sellable stock before QC.
- Received quantities cannot exceed outstanding quantities without explicit correction.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M5-S04-AC01 — GRN cross-checks quantity and price against the original PO

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record one or more receipts against an approved PO | GRN cross-checks quantity and price against the original PO. |

### M5-S04-AC02 — Partial delivery keeps remaining quantities pending

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record one or more receipts against an approved PO | Partial delivery keeps remaining quantities pending. |

### M5-S04-AC03 — Receipt does not increase sellable stock before QC

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record one or more receipts against an approved PO | Receipt does not increase sellable stock before QC. |

### M5-S04-AC04 — Received quantities cannot exceed outstanding quantities without explicit correction

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record one or more receipts against an approved PO | Received quantities cannot exceed outstanding quantities without explicit correction. |

### M5-S04-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The record one or more receipts against an approved PO operation is attempted | Duplicate receipt reference, over-receipt, wrong branch/supplier, or closed PO fails atomically. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- GRNs use /api/v1/purchase-orders/{id}/receipts.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary shows ordered, previously received, current, remaining, and mismatch states.
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
