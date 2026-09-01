---
id: M5-S06
epic: M5
title: Purchase return, debit note, and supplier ledger
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Inventory, Accountant, OWNER]
depends_on: [M5-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5-S06 — Purchase return, debit note, and supplier ledger

## User story

As **Inventory or Accountant or OWNER**, I want to **return rejected or confirmed goods and reconcile supplier payable** so that **procure branch stock through controlled supplier, po, receipt, qc, return, and payable flows.**

## Scope

### In

- QC rejection auto-creates return and debit note for rejected quantity.
- Confirmed purchase return reduces stock immediately.
- Debit note reduces supplier payable.
- Ledger records invoices, debit notes, partial/full payments, mode, reference, balance, and due date.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M5-S06-AC01 — QC rejection auto-creates return and debit note for rejected quantity

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They return rejected or confirmed goods and reconcile supplier payable | QC rejection auto-creates return and debit note for rejected quantity. |

### M5-S06-AC02 — Confirmed purchase return reduces stock immediately

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They return rejected or confirmed goods and reconcile supplier payable | Confirmed purchase return reduces stock immediately. |

### M5-S06-AC03 — Debit note reduces supplier payable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They return rejected or confirmed goods and reconcile supplier payable | Debit note reduces supplier payable. |

### M5-S06-AC04 — Ledger records invoices, debit notes, partial/full payments, mode, reference, balance, a

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They return rejected or confirmed goods and reconcile supplier payable | Ledger records invoices, debit notes, partial/full payments, mode, reference, balance, and due date. |

### M5-S06-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The return rejected or confirmed goods and reconcile supplier payable operation is attempted | Over-return, overpayment, duplicate reference, stale balance, or cross-tenant supplier fails atomically. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Returns, debit notes, ledger, and payments use /api/v1/purchase-returns and /api/v1/suppliers/{id}/ledger.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary exposes return documents, payable balance, payment recording, and Growth due reminders.
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
