---
id: M2
product_module: 2
title: Organization, Tenant & Branch Structure
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2 — Organization, Tenant & Branch Structure

## Outcome

Onboard verified pharmacy tenants, administer lifecycle and plans, and operate isolated branches.

## Actors

- prospective OWNER
- OWNER
- MASTER
- Verification Agent
- Inventory

## Product capabilities covered

- Tenant registration and KYC
- Tenant lifecycle
- Branch master
- Plan limits and subscription administration
- Inter-branch transfer

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M2-S01 — Tenant registration and email verification](m2-s01-tenant-registration-and-email-verification.md) | server + dispensary | M1-S03 | — |
| 2 | [M2-S02 — KYC submission and review](m2-s02-kyc-submission-and-review.md) | server + dispensary + admin | M2-S01, M1-S05 | — |
| 3 | [M2-S03 — Tenant status lifecycle](m2-s03-tenant-status-lifecycle.md) | server + dispensary + admin | M2-S02 | — |
| 4 | [M2-S04 — Default branch and branch master](m2-s04-default-branch-and-branch-master.md) | server + dispensary + admin | M2-S02 | — |
| 5 | [M2-S05 — Plans, limits, and upgrades](m2-s05-plans-limits-and-upgrades.md) | server + dispensary + admin | M2-S02 | D-007, D-008 |
| 6 | [M2-S06 — Inter-branch stock transfer](m2-s06-inter-branch-stock-transfer.md) | server + dispensary | M2-S04, M4-S03, M1-S07 | — |
| 7 | [M2-S07 — Kiosk self-order scope](m2-s07-kiosk-self-order-scope.md) | server + dispensary | M2-S04 | D-009 |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
