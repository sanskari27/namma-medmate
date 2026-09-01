---
id: M5-S03
epic: M5
title: Growth reorder-to-draft PO
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Inventory]
depends_on: [M5-S02, M4-S04, M2-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5-S03 — Growth reorder-to-draft PO

## User story

As **OWNER or Inventory**, I want to **convert a reorder list into supplier-split draft purchase orders for Growth and Pro** so that **procure branch stock through controlled supplier, po, receipt, qc, return, and payable flows.**

## Scope

### In

- The operation creates drafts only.
- Lines are split into one PO per supplier.
- Unmapped products are reported without corrupting valid drafts.
- Free and Starter remain manual PO only.
- Pro additionally permits bulk PO operations and PO/spend analytics.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M5-S03-AC01 — The operation creates drafts only

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They convert a reorder list into supplier-split draft purchase orders for Growth and Pro | The operation creates drafts only. |

### M5-S03-AC02 — Lines are split into one PO per supplier

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They convert a reorder list into supplier-split draft purchase orders for Growth and Pro | Lines are split into one PO per supplier. |

### M5-S03-AC03 — Unmapped products are reported without corrupting valid drafts

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They convert a reorder list into supplier-split draft purchase orders for Growth and Pro | Unmapped products are reported without corrupting valid drafts. |

### M5-S03-AC04 — Free and Starter remain manual PO only

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They convert a reorder list into supplier-split draft purchase orders for Growth and Pro | Free and Starter remain manual PO only. |

### M5-S03-AC05 — Pro additionally permits bulk PO operations and PO/spend analytics

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They convert a reorder list into supplier-split draft purchase orders for Growth and Pro | Pro additionally permits bulk PO operations and PO/spend analytics. |

### M5-S03-AC06 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The convert a reorder list into supplier-split draft purchase orders for Growth and Pro operation is attempted | Replay, supplier ambiguity, stale reorder data, or insufficient entitlement cannot duplicate drafts. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Draft generation uses /api/v1/purchase-orders/from-reorder with idempotency.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary previews supplier grouping, unmapped lines, plan gate, and resulting drafts.
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
