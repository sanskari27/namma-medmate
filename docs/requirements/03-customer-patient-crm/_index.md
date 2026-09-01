---
id: M3
product_module: 3
title: CRM — Customer & Patient Management
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3 — CRM — Customer & Patient Management

## Outcome

Maintain unified tenant-wide customer records, health context, engagement, loyalty, and credit.

## Actors

- OWNER
- Pharmacist
- Cashier
- Accountant
- authorized campaign role

## Product capabilities covered

- Customer identity
- Family and history
- Safety warnings
- Credit and loyalty
- Segmentation and communication
- CA sharing

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M3-S01 — Customer records and phone deduplication](m3-s01-customer-records-and-phone-deduplication.md) | server + dispensary | M1-S05 | — |
| 2 | [M3-S02 — Duplicate customer merge](m3-s02-duplicate-customer-merge.md) | server + dispensary | M3-S01 | — |
| 3 | [M3-S03 — Family links and shared history](m3-s03-family-links-and-shared-history.md) | server + dispensary | M3-S01 | — |
| 4 | [M3-S04 — Purchase, prescription, and doctor context](m3-s04-purchase-prescription-doctor-and-safety-context.md) | server + dispensary | M3-S01 | — |
| 5 | [M3-S05 — Khata credit ledger and settlement](m3-s05-khata-credit-ledger-and-settlement.md) | server + dispensary | M3-S03 | — |
| 6 | [M3-S06 — Refill reminders and segmentation](m3-s06-loyalty-refill-reminders-and-segmentation.md) | server + dispensary | M3-S01 | — |
| 7 | [M3-S07 — Campaigns and CA sharing](m3-s07-campaigns-and-ca-sharing.md) | server + dispensary | M3-S06, M10-S03, M8-S05 | — |
| 8 | [M3-S08 — Medication safety warnings](m3-s08-medication-safety-warnings.md) | server + dispensary | M3-S01, M4-S01 | D-011 |
| 9 | [M3-S09 — Loyalty earn and redeem](m3-s09-loyalty-earn-and-redeem.md) | server + dispensary | M3-S01, M2-S05, M6-S05, M6-S07 | D-012 |
| 10 | [M3-S10 — Family credit limits](m3-s10-family-credit-limits.md) | server + dispensary | M3-S03, M3-S05 | D-002 |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
