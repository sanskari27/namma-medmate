---
id: M6-S03
epic: M6
title: Mixed payment and khata sale
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Cashier]
depends_on: [M6-S02, M3-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S03 — Mixed payment and khata sale

## User story

As **Cashier**, I want to **settle an invoice with one or more supported payment modes** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Modes are Cash, Card, UPI, Credit/Khata, and Bank Transfer.
- Payment parts equal amount paid and calculate due/change correctly.
- POS payment is manually marked; no Phase 1 customer gateway.
- Khata consumes approved credit atomically.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S03-AC01 — Modes are Cash, Card, UPI, Credit/Khata, and Bank Transfer

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They settle an invoice with one or more supported payment modes | Modes are Cash, Card, UPI, Credit/Khata, and Bank Transfer. |

### M6-S03-AC02 — Payment parts equal amount paid and calculate due/change correctly

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They settle an invoice with one or more supported payment modes | Payment parts equal amount paid and calculate due/change correctly. |

### M6-S03-AC03 — POS payment is manually marked

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They settle an invoice with one or more supported payment modes | POS payment is manually marked; no Phase 1 customer gateway. |

### M6-S03-AC04 — Khata consumes approved credit atomically

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They settle an invoice with one or more supported payment modes | Khata consumes approved credit atomically. |

### M6-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The settle an invoice with one or more supported payment modes operation is attempted | Under/over-allocation, invalid change, insufficient credit, duplicate completion, or stale total fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Payment allocation is submitted with invoice completion under /api/v1/sales/invoices/{id}/complete.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS supports mixed tender, references, amount due, and change.
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
