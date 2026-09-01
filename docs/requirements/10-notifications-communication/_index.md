---
id: M10
product_module: 10
title: Notifications & Communication
sources:
  - docs/product/product-compiled.md#module-10-notifications--communication
  - docs/product/m10-notifications.md
---

# M10 — Notifications & Communication

## Outcome

Deliver actionable internal notifications and compliant tenant-namespaced WhatsApp communication.

## Actors

- all staff roles
- customer
- MASTER

## Product capabilities covered

- Notification center
- Internal trigger routing
- WhatsApp templates
- Customer and lifecycle messages

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M10-S01 — In-app notification center](m10-s01-in-app-notification-center.md) | server + dispensary + admin | M1-S01 | — |
| 2 | [M10-S02 — Internal event routing](m10-s02-internal-event-routing.md) | server + dispensary + admin | M10-S01 | — |
| 3 | [M10-S03 — Meta WhatsApp templates](m10-s03-meta-whatsapp-templates.md) | server + dispensary + admin | M10-S02, M1-S05 | — |
| 4 | [M10-S04 — WhatsApp customer messages](m10-s04-whatsapp-customer-messages.md) | server + dispensary | M10-S03, M3-S05, M3-S06, M3-S07 | — |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
