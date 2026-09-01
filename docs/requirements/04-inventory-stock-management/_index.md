---
id: M4
product_module: 4
title: ERP — Inventory & Stock Management
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4 — ERP — Inventory & Stock Management

## Outcome

Control tenant product data and accurate branch, batch, expiry, and regulated stock.

## Actors

- OWNER
- Inventory
- Pharmacist
- Cashier

## Product capabilities covered

- Product master
- Batch and expiry
- Stock levels and reorder
- Adjustments and stock take
- Controlled substances

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M4-S01 — Tenant product master](m4-s01-tenant-product-master.md) | server + dispensary | M1-S05 | — |
| 2 | [M4-S02 — Multi-unit conversion](m4-s02-multi-unit-conversion.md) | server + dispensary | M4-S01 | — |
| 3 | [M4-S03 — Batch, expiry, and branch stock](m4-s03-batch-expiry-and-branch-stock.md) | server + dispensary | M4-S01, M4-S02 | — |
| 4 | [M4-S04 — FEFO, expiry, and low-stock guidance](m4-s04-fefo-expiry-and-low-stock-guidance.md) | server + dispensary | M4-S03 | — |
| 5 | [M4-S05 — Stock adjustments and approvals](m4-s05-stock-adjustments-and-approvals.md) | server + dispensary | M4-S03, M1-S07 | — |
| 6 | [M4-S06 — Owner-initiated stock take](m4-s06-owner-initiated-stock-take.md) | server + dispensary | M4-S05 | — |
| 7 | [M4-S07 — Controlled-substance inventory controls](m4-s07-controlled-substance-inventory-controls.md) | server + dispensary | M4-S03, M1-S05 | — |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
