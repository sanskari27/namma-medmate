---
id: M3-S05
epic: M3
title: Khata credit ledger and settlement
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Cashier, Accountant]
depends_on: [M3-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S05 — Khata credit ledger and settlement

## User story

As **OWNER or Cashier or Accountant**, I want to **enforce customer credit limits and maintain an immutable balance and payment history** so that **maintain unified tenant-wide customer records, health context, engagement, loyalty, and credit.**

## Scope

### In

- Credit sales consume available limit immediately.
- Settlement records partial or full payoff without editing source invoices.
- OWNER configures limits.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S05-AC01 — Credit sales consume available limit immediately

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce customer credit limits and maintain an immutable balance and payment history | Credit sales consume available limit immediately. |

### M3-S05-AC02 — Settlement records partial or full payoff without editing source invoices

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce customer credit limits and maintain an immutable balance and payment history | Settlement records partial or full payoff without editing source invoices. |

### M3-S05-AC03 — OWNER configures limits

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce customer credit limits and maintain an immutable balance and payment history | OWNER configures limits. |

### M3-S05-AC04 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The enforce customer credit limits and maintain an immutable balance and payment history operation is attempted | Over-limit sales, overpayment, replayed settlement, stale balance, and unauthorized limit changes fail atomically. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Ledger, limit, and settlement operations use /api/v1/customers/{id}/credit.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS shows available credit; customer and finance views show running balance and settlements.
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
