---
id: M8-S04
epic: M8
title: Core finance and GST reports
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Accountant, OWNER]
depends_on: [M6-S05, M5-S06, M8-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-8-finance--accounting
  - docs/product/m8-finance.md
---

# M8-S04 — Core finance and GST reports

## User story

As **Accountant or OWNER**, I want to **generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports** so that **provide lightweight pharmacy finance, statutory summaries, and decision-ready branch and tenant reporting.**

## Scope

### In

- P&L is revenue minus purchase-price COGS minus expenses; no journals, chart of accounts, trial balance, or balance sheet.
- GST output includes GSTR-1-style sales and GSTR-3B-style summaries.
- Reports are branch-filterable and tenant-consolidated for OWNER.
- TDS and accounting-software integration are out of scope.
- Phase 1 has no cash drawer or register-management workflow.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M8-S04-AC01 — P&L is revenue minus purchase-price COGS minus expenses

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports | P&L is revenue minus purchase-price COGS minus expenses; no journals, chart of accounts, trial balance, or balance sheet. |

### M8-S04-AC02 — GST output includes GSTR-1-style sales and GSTR-3B-style summaries

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports | GST output includes GSTR-1-style sales and GSTR-3B-style summaries. |

### M8-S04-AC03 — Reports are branch-filterable and tenant-consolidated for OWNER

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports | Reports are branch-filterable and tenant-consolidated for OWNER. |

### M8-S04-AC04 — TDS and accounting-software integration are out of scope

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports | TDS and accounting-software integration are out of scope. |

### M8-S04-AC05 — Phase 1 has no cash drawer or register-management workflow

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports | Phase 1 has no cash drawer or register-management workflow. |

### M8-S04-AC06 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The generate Day Book, sales, purchase, expense, P&L, GST, and branch comparison reports operation is attempted | Invalid periods, incomplete source state, unauthorized role, or excessive range returns explicit error. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Finance reports and exports use /api/v1/finance/reports.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides date/branch filters, reconciliation totals, PDF, and spreadsheet export.
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
