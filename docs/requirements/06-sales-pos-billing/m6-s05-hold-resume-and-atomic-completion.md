---
id: M6-S05
epic: M6
title: Hold, resume, and atomic completion
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Cashier]
depends_on: [M6-S01, M6-S02, M6-S03, M6-S04, M3-S04, M3-S08, M1-S07]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S05 — Hold, resume, and atomic completion

## User story

As **Cashier**, I want to **park an invoice and later complete it exactly once** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Held invoices reserve no stock unless explicitly completed.
- Resume recalculates stock, expiry, price, tax, and approvals.
- Completion atomically posts invoice, payments, stock, credit, and audit events.
- Completion also posts one customer purchase-history fact and, for a
  prescription-based linked-customer sale, one prescription-history fact.
- A failure rolls back the full transaction.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S05-AC01 — Held invoices reserve no stock unless explicitly completed

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They park an invoice and later complete it exactly once | Held invoices reserve no stock unless explicitly completed. |

### M6-S05-AC02 — Resume recalculates stock, expiry, price, tax, and approvals

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They park an invoice and later complete it exactly once | Resume recalculates stock, expiry, price, tax, and approvals. |

### M6-S05-AC03 — Completion atomically posts invoice, payments, stock, credit, and audit events

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They park an invoice and later complete it exactly once | Completion atomically posts invoice, payments, stock, credit, and audit events. |

### M6-S05-AC04 — Customer history facts post once

| Given | When | Then |
|---|---|---|
| A draft is linked to a customer, with or without a prescription reference | The invoice completes | One purchase-history fact is linked to the completed invoice and, when prescription-based, one prescription-history fact is linked; replay creates no duplicate |

### M6-S05-AC05 — A failure rolls back the full transaction

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They park an invoice and later complete it exactly once | A failure rolls back the full transaction. |

### M6-S05-AC06 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The park an invoice and later complete it exactly once operation is attempted | Two terminals completing the same hold, stale approval, depleted stock, or replay yields one outcome. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Hold, resume, and complete commands are invoice state transitions.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS lists held invoices and clearly surfaces revalidation changes.
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
