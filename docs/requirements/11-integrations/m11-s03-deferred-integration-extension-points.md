---
id: M11-S03
epic: M11
title: Deferred integration extension points
phase: 2
priority: P1
apps: []
personas: [system architect]
depends_on: []
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-11-integrations
  - docs/product/m11-integrations.md
---

# M11-S03 — Deferred integration extension points

## User story

As **system architect**, I want to **retain a visible deferred integration
backlog** so that unsupported integrations are not accidentally presented as
Phase 1 features.

## Scope

### In

- POS customer payment gateway, government filing/license portals, ABDM, ecommerce, labs/insurance, and accounting exports are not implemented.
- WhatsApp has no SMS fallback.
- Extension points do not expose fake successful behavior.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M11-S03-AC01 — Unsupported integrations stay unavailable

| Given | When | Then |
|---|---|---|
| This story remains deferred | An agent selects Phase 1 work | No POS gateway, government portal, ABDM, ecommerce, lab/insurance, or accounting-export API, UI, table, or success claim is created |

### M11-S03-AC02 — WhatsApp has no SMS fallback

| Given | When | Then |
|---|---|---|
| A WhatsApp delivery fails in Phase 1 | Delivery handling runs | No SMS fallback is attempted or advertised |

### M11-S03-AC03 — Future refinement precedes implementation

| Given | When | Then |
|---|---|---|
| Product activates one deferred integration | Its story is refined | Provider contract, identity, authorization, data, failure, retry, reconciliation, compliance, UI, and test criteria are approved before coding |

## Required tests

- None while deferred; repository validation must keep the tracker state `deferred`.

## Definition of done

- [ ] Product explicitly activates and refines one or more deferred integrations.
- [ ] The refined implementation and independent verification pass.
