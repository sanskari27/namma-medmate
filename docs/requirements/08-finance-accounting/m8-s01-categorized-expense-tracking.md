---
id: M8-S01
epic: M8
title: Categorized expense tracking
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Accountant, OWNER]
depends_on: [M1-S05, M2-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-8-finance--accounting
  - docs/product/m8-finance.md
---

# M8-S01 — Categorized expense tracking

## User story

As **Accountant or OWNER**, I want to **record branch expenses in approved business categories** so that **provide lightweight pharmacy finance, statutory summaries, and decision-ready branch and tenant reporting.**

## Scope

### In

- Categories include rent, electricity, salaries, and miscellaneous with extensibility.
- Amount uses INR minor units and occurred date is retained.
- Expenses are branch-scoped and visible in tenant consolidation.
- Cashier has no finance access.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M8-S01-AC01 — Categories include rent, electricity, salaries, and miscellaneous with extensibility

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record branch expenses in approved business categories | Categories include rent, electricity, salaries, and miscellaneous with extensibility. |

### M8-S01-AC02 — Amount uses INR minor units and occurred date is retained

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record branch expenses in approved business categories | Amount uses INR minor units and occurred date is retained. |

### M8-S01-AC03 — Expenses are branch-scoped and visible in tenant consolidation

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record branch expenses in approved business categories | Expenses are branch-scoped and visible in tenant consolidation. |

### M8-S01-AC04 — Cashier has no finance access

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record branch expenses in approved business categories | Cashier has no finance access. |

### M8-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The record branch expenses in approved business categories operation is attempted | Invalid amount/date/category, closed period if configured later, or unauthorized access fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Expense CRUD uses /api/v1/finance/expenses.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides list, filters, create/edit, evidence, and totals.
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
