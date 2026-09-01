---
id: M7
product_module: 7
title: Prescription & Regulatory Compliance
sources:
  - docs/product/product-compiled.md#module-7-prescription--regulatory-compliance-phase-1-scope
  - docs/product/m7-prescriptions.md
---

# M7 — Prescription & Regulatory Compliance

## Outcome

Track licenses and expose reliable Phase 1 pharmacy registers and regulatory exports.

## Actors

- OWNER
- Pharmacist
- Accountant
- MASTER
- authorized role

## Product capabilities covered

- License expiry
- Controlled registers
- Compliance dashboard
- Prescription reference archive
- Deferred regulatory workflows

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M7-S01 — License and registration expiry](m7-s01-license-and-registration-expiry.md) | server + dispensary + admin | M2-S04, M1-S04 | — |
| 2 | [M7-S02 — Controlled-substance sale register](m7-s02-controlled-substance-sale-register.md) | server + dispensary | M6-S04, M6-S07, M4-S07 | — |
| 3 | [M7-S03 — Compliance dashboard and Phase 1 registers](m7-s03-compliance-dashboard-and-phase-1-registers.md) | server + dispensary | M4-S04, M4-S05, M4-S06, M5-S06, M6-S07, M7-S01, M7-S02 | — |
| 4 | [M7-S04 — Prescription-reference archive](m7-s04-prescription-reference-archive.md) | server + dispensary | M6-S04 | D-003 |
| 5 | [M7-S05 — Advanced regulatory workflows](m7-s05-advanced-regulatory-workflows.md) | server + dispensary + admin | M7-S03 | deferred |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
