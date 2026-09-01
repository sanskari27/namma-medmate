---
id: M8-S03
epic: M8
title: Consolidated AR and AP aging
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Accountant, OWNER]
depends_on: [M3-S05, M5-S06]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-8-finance--accounting
  - docs/product/m8-finance.md
---

# M8-S03 — Consolidated AR and AP aging

## User story

As **Accountant or OWNER**, I want to **view receivables and supplier payables with aging** so that **provide lightweight pharmacy finance, statutory summaries, and decision-ready branch and tenant reporting.**

## Scope

### In

- AR derives from customer credit; AP derives from supplier ledger.
- Buckets are 0–30, 31–60, 61–90, and 90+ days.
- Branch filters and tenant consolidation use one as-of date.
- Source balances remain the authority.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M8-S03-AC01 — AR derives from customer credit

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view receivables and supplier payables with aging | AR derives from customer credit; AP derives from supplier ledger. |

### M8-S03-AC02 — Buckets are 0–30, 31–60, 61–90, and 90+ days

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view receivables and supplier payables with aging | Buckets are 0–30, 31–60, 61–90, and 90+ days. |

### M8-S03-AC03 — Branch filters and tenant consolidation use one as-of date

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view receivables and supplier payables with aging | Branch filters and tenant consolidation use one as-of date. |

### M8-S03-AC04 — Source balances remain the authority

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view receivables and supplier payables with aging | Source balances remain the authority. |

### M8-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The view receivables and supplier payables with aging operation is attempted | Future as-of date policy, missing due date, unauthorized branch, or cross-tenant aggregation is safe. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Aging queries use /api/v1/finance/receivables and /api/v1/finance/payables.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides summary, buckets, drill-down, branch filter, and as-of date.
- Handle loading, empty, validation, denied, conflict, failure, and success states with labels, keyboard access, visible focus, and focus restoration.
- UI guards improve UX only; the server remains the authorization boundary.

## Data and state

- Use UUID identifiers, UTC persistence, IST display, and INR minor units where money applies.
- Add schema only through a new Flyway migration; never edit an existing migration.
- Preserve historical transaction snapshots when referenced master data later changes.

## Required tests

- Unit tests for each business branch and validator.
- Spring integration tests for persistence, authorization, transaction rollback, tenant isolation, and branch isolation where applicable.
- Component/integration tests in every targeted React app.
- End-to-end happy path and at least one failure path for the complete cross-app workflow.
- Regression tests for every bug found while implementing this story.

## Definition of done

- [ ] Every acceptance criterion has automated evidence.
- [ ] Every dependency is `done` and linked decisions are closed.
- [ ] Tests were observed failing before runtime implementation and now pass.
- [ ] Target-specific format, lint, test, build, and compose gates pass.
- [ ] The independent story verifier returns `PASS`.
- [ ] The implementation tracker contains evidence and is the only changed status source.
