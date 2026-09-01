---
id: M7-S05
epic: M7
title: Advanced regulatory workflows
phase: 2
priority: P2
apps: [server, dispensary, admin]
personas: [OWNER, Pharmacist, MASTER]
depends_on: [M7-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#phase-2--deferred-new-workflows-required
  - docs/product/m7-prescriptions.md
---

# M7-S05 — Advanced regulatory workflows

## Deferred scope

This Phase 2 story is an inventory of future workflows only:

- Cold-chain temperature, maintenance, and excursion records.
- Medicine quarantine, counterfeit/spurious medicine, and adverse reaction records.
- Formal wastage/destruction, recall, and product withdrawal workflows.
- Pharmacist duty/supervision roster.
- Regulatory inspection, license inspection, and compliance incident records.
- Schedule X prescription archive after a standalone prescription repository exists.

## Acceptance criteria

### M7-S05-AC01 — No accidental Phase 1 implementation

| Given | When | Then |
|---|---|---|
| This story remains deferred | An agent selects Phase 1 work | None of these workflows, APIs, tables, screens, or claims are implemented |

### M7-S05-AC02 — Future refinement

| Given | When | Then |
|---|---|---|
| Product moves a workflow into an approved phase | This story is refined | Actors, state machine, retention, evidence, approvals, exports, and measurable acceptance criteria are defined before coding |

## Definition of done

- [ ] Product explicitly activates and refines the selected Phase 2 scope.
- [ ] Required implementation and verification gates pass.
