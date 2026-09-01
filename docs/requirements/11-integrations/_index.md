---
id: M11
product_module: 11
title: Integrations
sources:
  - docs/product/product-compiled.md#module-11-integrations
  - docs/product/m11-integrations.md
---

# M11 — Integrations

## Outcome

Integrate subscription payments, transactional email, and explicit Phase 2 extension boundaries.

## Actors

- OWNER
- MASTER
- customer

## Product capabilities covered

- Cashfree subscription billing
- Resend transactional email
- Deferred integration boundaries

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M11-S01 — Cashfree subscription billing](m11-s01-cashfree-subscription-billing.md) | server + dispensary + admin | M2-S05 | — |
| 2 | [M11-S02 — Resend transactional email](m11-s02-resend-transactional-email.md) | server | — | — |
| 3 | [M11-S03 — Deferred integration extension points](m11-s03-deferred-integration-extension-points.md) | decision | — | deferred |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
