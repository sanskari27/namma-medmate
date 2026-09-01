---
id: M1
product_module: 1
title: Authentication & User Roles
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1 — Authentication & User Roles

## Outcome

Secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.

## Actors

- MASTER
- OWNER
- Pharmacist
- Cashier
- Inventory
- Accountant
- custom roles

## Product capabilities covered

- Tenancy and hierarchy
- Staff onboarding
- Authentication and session security
- Permissions and approvals
- Audit and compliance

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M1-S01 — Email and password login](m1-s01-email-and-password-login.md) | server + dispensary + admin | — | — |
| 2 | [M1-S02 — PIN lock and unlock](m1-s02-pin-lock-and-unlock.md) | server + dispensary + admin | M1-S01 | — |
| 3 | [M1-S03 — Password lifecycle and reset](m1-s03-password-lifecycle-and-reset.md) | server + dispensary + admin | M1-S01, M11-S02 | — |
| 4 | [M1-S04 — Staff onboarding and verification](m1-s04-staff-onboarding-and-verification.md) | server + dispensary + admin | M1-S03 | — |
| 5 | [M1-S05 — Roles and module permissions](m1-s05-roles-and-module-permissions.md) | server + dispensary + admin | M1-S04 | — |
| 6 | [M1-S06 — Branch assignment and switching](m1-s06-branch-assignment-and-switching.md) | server + dispensary | M1-S05, M2-S04 | — |
| 7 | [M1-S07 — Approval workflows and audit](m1-s07-approval-workflows-and-audit.md) | server + dispensary + admin | M1-S05 | — |
| 8 | [M1-S08 — MASTER tenant-user impersonation](m1-s08-master-impersonation.md) | server + admin | M1-S01, M1-S05 | D-001 |
| 9 | [M1-S09 — DPDP operational controls](m1-s09-dpdp-operational-controls.md) | server + dispensary + admin | M1-S07, M3-S01 | D-013 |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
