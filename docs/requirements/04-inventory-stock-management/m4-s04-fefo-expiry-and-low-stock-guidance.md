---
id: M4-S04
epic: M4
title: FEFO, expiry, and low-stock guidance
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Inventory, Pharmacist, Cashier]
depends_on: [M4-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S04 — FEFO, expiry, and low-stock guidance

## User story

As **Inventory or Pharmacist or Cashier**, I want to **suggest safe batches and actionable reorder information** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- FEFO is suggested but billing staff may manually select another valid batch.
- Near-expiry stock warns but remains sellable.
- Expiry threshold is configurable.
- Reorder/minimum levels are per product and branch and produce a CSV; ordering remains manual except Growth auto-draft PO.
- No maximum-stock ceiling or automated purchase placement is introduced.
- Stock valuation uses batch purchase price rather than FIFO or weighted-average costing.
- A low-stock alert identifies stock available at another branch and can start the transfer flow.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S04-AC01 — FEFO is suggested but billing staff may manually select another valid batch

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | FEFO is suggested but billing staff may manually select another valid batch. |

### M4-S04-AC02 — Near-expiry stock warns but remains sellable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | Near-expiry stock warns but remains sellable. |

### M4-S04-AC03 — Expiry threshold is configurable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | Expiry threshold is configurable. |

### M4-S04-AC04 — Reorder/minimum levels are per product and branch and produce a CSV

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | Reorder/minimum levels are per product and branch and produce a CSV; ordering remains manual except Growth auto-draft PO. |

### M4-S04-AC05 — No maximum-stock ceiling or automated purchase placement is introduced

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | No maximum-stock ceiling or automated purchase placement is introduced. |

### M4-S04-AC06 — Stock valuation uses batch purchase price rather than FIFO or weighted-average costing

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | Stock valuation uses batch purchase price rather than FIFO or weighted-average costing. |

### M4-S04-AC07 — A low-stock alert identifies stock available at another branch and can start the transfe

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They suggest safe batches and actionable reorder information | A low-stock alert identifies stock available at another branch and can start the transfer flow. |

### M4-S04-AC08 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The suggest safe batches and actionable reorder information operation is attempted | Expired, depleted, inaccessible, or stale batch choices cannot complete a sale. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Availability, FEFO suggestions, alerts, and reorder export use /api/v1/inventory.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Inventory and POS show warnings, alternatives, and explicit batch override.
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
