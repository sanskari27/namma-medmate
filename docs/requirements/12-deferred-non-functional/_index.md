---
id: M12
product_module: 12
title: Deferred Non-Functional Requirements
sources:
  - docs/product/product-compiled.md
  - docs/product/product-compiled.md#open-items-requiring-final-confirmation
---

# M12 — Deferred Non-Functional Requirements

## Outcome

Keep unresolved production constraints visible without allowing an agent to invent them.

## Actors

- Product owner
- Architecture owner
- Security owner

## Product capabilities covered

- Hosting and residency
- Client platforms and POS hardware
- Scale and performance
- Backup and disaster recovery
- Retention and portability
- Localization and environments

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M12-S01 — Define production NFR baseline](m12-s01-define-production-nfr-baseline.md) | decision | — | D-006 |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- Phase 2 language remains deferred even when a data model keeps an extension point.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
