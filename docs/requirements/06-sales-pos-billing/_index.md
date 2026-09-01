---
id: M6
product_module: 6
title: ERP — Sales, POS & Billing
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6 — ERP — Sales, POS & Billing

## Outcome

Complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.

## Actors

- Cashier
- Pharmacist
- OWNER
- approver

## Product capabilities covered

- Invoice lifecycle
- Pricing and GST
- Payment and credit
- Prescription sale
- Returns and refunds
- Invoice output
- Connectivity

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M6-S01 — Invoice draft and numbering](m6-s01-invoice-draft-and-numbering.md) | server + dispensary | M4-S03, M1-S06 | — |
| 2 | [M6-S02 — GST and discount calculation](m6-s02-gst-and-discount-calculation.md) | server + dispensary | M6-S01, M1-S07 | — |
| 3 | [M6-S03 — Mixed payment and khata sale](m6-s03-mixed-payment-and-khata-sale.md) | server + dispensary | M6-S02, M3-S05 | — |
| 4 | [M6-S04 — Prescription-linked and controlled sale](m6-s04-prescription-linked-and-controlled-sale.md) | server + dispensary | M6-S01, M4-S07, M3-S04 | — |
| 5 | [M6-S05 — Hold, resume, and atomic completion](m6-s05-hold-resume-and-atomic-completion.md) | server + dispensary | M6-S01, M6-S02, M6-S03, M6-S04, M3-S04, M3-S08, M1-S07 | — |
| 6 | [M6-S06 — Schemes and offers](m6-s06-schemes-and-offers.md) | server + dispensary | M6-S02 | D-010 |
| 7 | [M6-S07 — Sales return and refund](m6-s07-sales-return-and-refund.md) | server + dispensary | M6-S05, M4-S03 | — |
| 8 | [M6-S08 — A4 invoice and connectivity guard](m6-s08-a4-invoice-and-connectivity-guard.md) | server + dispensary | M6-S05, M11-S02 | — |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
