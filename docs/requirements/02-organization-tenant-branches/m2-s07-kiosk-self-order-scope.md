---
id: M2-S07
epic: M2
title: Kiosk self-order scope
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, customer]
depends_on: [M2-S04]
blocked_by: [D-009]
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2-S07 — Kiosk self-order scope

## User story

As **OWNER**, I want the Kiosk branch classification to have an approved
behavioral scope before a self-order flow is built.

## Acceptance criteria

### M2-S07-AC01 — Decision-controlled scope

| Given | When | Then |
|---|---|---|
| D-009 remains open | An agent selects this story | The story remains blocked and no customer self-order API or UI is created |

### M2-S07-AC02 — Classification remains usable

| Given | When | Then |
|---|---|---|
| A branch is classified as Kiosk | The branch is maintained before D-009 closes | Classification is retained without implying a self-order capability |

### M2-S07-AC03 — Approved implementation only

| Given | When | Then |
|---|---|---|
| D-009 is closed | The story is refined | Its API, UI, payment, identity, inventory, and compliance criteria exactly reflect the recorded decision |

## Definition of done

- [ ] D-009 is closed and this contract is refined before runtime work.
- [ ] Required tests and target gates pass.
- [ ] Independent verification returns `PASS`.
