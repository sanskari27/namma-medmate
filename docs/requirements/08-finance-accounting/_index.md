---
id: M8
product_module: 8
title: Finance & Accounting
sources:
  - docs/product/product-compiled.md#module-8-finance--accounting
  - docs/product/m8-finance.md
---

# M8 — Finance & Accounting

## Outcome

Provide lightweight pharmacy finance, statutory summaries, and decision-ready branch and tenant reporting.

## Actors

- OWNER
- Accountant

## Product capabilities covered

- Expenses
- AR/AP
- Financial reports
- GST preparation
- Authorization and scope

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M8-S01 — Categorized expense tracking](m8-s01-categorized-expense-tracking.md) | server + dispensary | M1-S05, M2-S04 | — |
| 2 | [M8-S02 — Expense approval behavior](m8-s02-expense-approval-behavior.md) | server + dispensary | M8-S01, M1-S07 | D-004 |
| 3 | [M8-S03 — Consolidated AR and AP aging](m8-s03-consolidated-ar-and-ap-aging.md) | server + dispensary | M3-S05, M5-S06 | — |
| 4 | [M8-S04 — Core finance and GST reports](m8-s04-core-finance-and-gst-reports.md) | server + dispensary | M6-S05, M5-S06, M8-S01 | — |
| 5 | [M8-S05 — Finance authorization and CA output](m8-s05-finance-authorization-and-ca-output.md) | server + dispensary | M8-S04 | — |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
