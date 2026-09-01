---
id: M9
product_module: 9
title: Reporting, Analytics & Dashboards
sources:
  - docs/product/product-compiled.md#module-9-reporting--analytics--dashboards
  - docs/product/m9-reports.md
---

# M9 — Reporting, Analytics & Dashboards

## Outcome

Give each role actionable dashboards, comparisons, exports, and plan-appropriate analytics.

## Actors

- Cashier
- Inventory
- Accountant
- OWNER

## Product capabilities covered

- Role dashboards
- Owner overview
- Comparison and analytics
- Custom reporting and export
- Plan gating

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M9-S01 — Role-specific dashboards](m9-s01-role-specific-dashboards.md) | server + dispensary | M1-S05, M2-S06, M4-S04, M5-S05, M6-S05, M8-S01, M8-S03 | — |
| 2 | [M9-S02 — Owner operational overview](m9-s02-owner-operational-overview.md) | server + dispensary | M9-S01, M1-S07, M2-S06, M4-S04, M5-S05, M6-S05, M7-S01, M8-S03 | — |
| 3 | [M9-S03 — Period comparison and trend analytics](m9-s03-period-comparison-and-trend-analytics.md) | server + dispensary | M9-S01, M6-S05, M4-S03 | — |
| 4 | [M9-S04 — Custom report builder and exports](m9-s04-custom-report-builder-and-exports.md) | server + dispensary | M9-S03 | — |
| 5 | [M9-S05 — Plan-tier report access](m9-s05-plan-tier-report-access.md) | server + dispensary | M9-S04, M2-S05 | D-005 |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
