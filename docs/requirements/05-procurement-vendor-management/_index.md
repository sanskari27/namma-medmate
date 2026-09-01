---
id: M5
product_module: 5
title: ERP — Procurement & Vendor Management
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5 — ERP — Procurement & Vendor Management

## Outcome

Procure branch stock through controlled supplier, PO, receipt, QC, return, and payable flows.

## Actors

- OWNER
- Inventory
- Pharmacist
- Accountant

## Product capabilities covered

- Supplier master
- Purchase orders
- Goods receipt and QC
- Returns and debit notes
- Supplier payables

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M5-S01 — Supplier master](m5-s01-supplier-master.md) | server + dispensary | M1-S05 | — |
| 2 | [M5-S02 — Purchase order creation and versioning](m5-s02-purchase-order-creation-and-versioning.md) | server + dispensary | M5-S01, M4-S01 | — |
| 3 | [M5-S03 — Growth reorder-to-draft PO](m5-s03-growth-reorder-to-draft-po.md) | server + dispensary | M5-S02, M4-S04, M2-S05 | — |
| 4 | [M5-S04 — Goods receipt and partial delivery](m5-s04-goods-receipt-and-partial-delivery.md) | server + dispensary | M5-S02 | — |
| 5 | [M5-S05 — Pharmacist QC and stock-in](m5-s05-pharmacist-qc-and-stock-in.md) | server + dispensary | M5-S04, M4-S03 | — |
| 6 | [M5-S06 — Purchase return, debit note, and supplier ledger](m5-s06-purchase-return-debit-note-and-supplier-ledger.md) | server + dispensary | M5-S05 | — |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
