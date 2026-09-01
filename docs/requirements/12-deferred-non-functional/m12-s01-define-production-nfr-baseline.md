---
id: M12-S01
epic: M12
title: Define production NFR baseline
phase: 2
priority: P2
apps: []
personas: [Product owner, Architecture owner]
depends_on: []
blocked_by: [D-006]
sources:
  - docs/product/product-compiled.md
  - docs/product/product-compiled.md#open-items-requiring-final-confirmation
---

# M12-S01 — Define production NFR baseline

## User story

As **Product owner or Architecture owner**, I want to **approve measurable production non-functional requirements before related implementation** so that **keep unresolved production constraints visible without allowing an agent to invent them.**

## Scope

### In

- Define hosting/cloud and India data residency.
- Define web/mobile/native and POS hardware assumptions.
- Define load, latency, availability, backup, RPO, and RTO targets.
- Define business retention, churn export/deletion, localization, and staging/production controls.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M12-S01-AC01 — Define hosting/cloud and India data residency

| Given | When | Then |
|---|---|---|
| A request or event initiated by Product owner / Architecture owner with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They approve measurable production non-functional requirements before related implementation | Define hosting/cloud and India data residency. |

### M12-S01-AC02 — Define web/mobile/native and POS hardware assumptions

| Given | When | Then |
|---|---|---|
| A request or event initiated by Product owner / Architecture owner with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They approve measurable production non-functional requirements before related implementation | Define web/mobile/native and POS hardware assumptions. |

### M12-S01-AC03 — Define load, latency, availability, backup, RPO, and RTO targets

| Given | When | Then |
|---|---|---|
| A request or event initiated by Product owner / Architecture owner with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They approve measurable production non-functional requirements before related implementation | Define load, latency, availability, backup, RPO, and RTO targets. |

### M12-S01-AC04 — Define business retention, churn export/deletion, localization, and staging/production c

| Given | When | Then |
|---|---|---|
| A request or event initiated by Product owner / Architecture owner with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They approve measurable production non-functional requirements before related implementation | Define business retention, churn export/deletion, localization, and staging/production controls. |

### M12-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The approve measurable production non-functional requirements before related implementation operation is attempted | The story remains deferred and blocked until all measurable targets and owners are approved. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

- This is a product/architecture decision contract only.
- It authorizes no API, UI, schema, infrastructure, dependency, or runtime
  implementation while D-006 is open and tracker status is `deferred`.
- Closing D-006 requires measurable targets, accountable owners, approval date,
  and follow-up implementation stories with their own acceptance criteria.

## Required tests

- None while deferred; repository validation must keep the decision and tracker
  references consistent.

## Definition of done

- [ ] D-006 is closed with measurable approved requirements.
- [ ] Follow-up implementation stories are created before runtime work.
