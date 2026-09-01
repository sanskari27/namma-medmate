---
id: M3-S09
epic: M3
title: Loyalty earn and redeem
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, Cashier]
depends_on: [M3-S01, M2-S05, M6-S05, M6-S07]
blocked_by: [D-012]
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S09 — Loyalty earn and redeem

## User story

As **OWNER or Cashier**, I want customers to earn and redeem Growth-plan loyalty
points under an approved policy.

## Scope

- Loyalty is available only on Growth and higher plans.
- D-012 defines eligible spend/products, earn rate, point value, rounding,
  redemption limits, expiry, return reversal, downgrade behavior, and manual adjustment authority.
- Every balance change is an immutable ledger entry linked to its source.
- Redemption and concurrent sales cannot create a negative balance.

## Acceptance criteria

### M3-S09-AC01 — Deterministic earning

| Given | When | Then |
|---|---|---|
| An eligible completed sale under an entitled plan | The sale posts | Points are awarded once using the exact D-012 rate, eligibility, and rounding rules |

### M3-S09-AC02 — Safe redemption

| Given | When | Then |
|---|---|---|
| A customer has sufficient redeemable points | Cashier applies redemption | The invoice benefit and ledger debit use the D-012 value and limits atomically |

### M3-S09-AC03 — Return and plan transitions

| Given | When | Then |
|---|---|---|
| A source sale is returned or the tenant changes plan | The transition posts | Reversal, retained balance, expiry, and future access follow D-012 without rewriting ledger history |

### M3-S09-AC04 — Failure and concurrency

| Given | When | Then |
|---|---|---|
| The plan is denied, points are insufficient, or concurrent redemption races | Redemption is attempted | At most one valid transaction posts and the balance never becomes negative |

## Definition of done

- [ ] D-012 is closed and represented exactly.
- [ ] Ledger, POS, return, plan, concurrency, and isolation tests pass.
- [ ] Independent verification returns `PASS`.
