---
id: M3-S10
epic: M3
title: Family credit limits
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, Cashier, Accountant]
depends_on: [M3-S03, M3-S05]
blocked_by: [D-002]
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S10 — Family credit limits

## User story

As **OWNER, Cashier, or Accountant**, I want family-linked credit to follow one
approved balance and limit model.

## Acceptance criteria

### M3-S10-AC01 — Resolved balance ownership

| Given | When | Then |
|---|---|---|
| D-002 is closed | A family member uses credit | Limit consumption and ledger ownership follow exactly the chosen shared-pool or individual-limit model |

### M3-S10-AC02 — Family visibility

| Given | When | Then |
|---|---|---|
| Authorized staff views a family | Credit history is requested | Visibility and payoff totals follow D-002 while each source invoice and payment remains identifiable |

### M3-S10-AC03 — Concurrent enforcement

| Given | When | Then |
|---|---|---|
| Two family members attempt credit concurrently | Both sales evaluate the applicable limit | Transactions serialize or conflict so the approved family/individual limit cannot be exceeded |

### M3-S10-AC04 — Decision safety

| Given | When | Then |
|---|---|---|
| D-002 remains open | An agent selects this story | No family credit schema, aggregation, settlement, or limit behavior is invented |

## Definition of done

- [ ] D-002 is closed and represented exactly.
- [ ] Ledger, POS, settlement, concurrency, tenant, and family-boundary tests pass.
- [ ] Independent verification returns `PASS`.
