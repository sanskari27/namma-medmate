---
id: M6-S01
epic: M6
title: Invoice draft and numbering
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Cashier, Pharmacist]
depends_on: [M4-S03, M1-S06]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S01 — Invoice draft and numbering

## User story

As **Cashier or Pharmacist**, I want to **create branch invoice drafts with complete line and party context** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Numbering is financial-year and branch sequential, for example INV/2025-26/BR01/00001.
- Walk-in sale is allowed and customer details are requested but skippable.
- Each line snapshots product, batch, expiry, quantity, UOM, MRP, selling price, discount, HSN, GST, and totals.
- Invoices retain staff, branch, terminal, status, timestamps, and optional customer/doctor/prescription references.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S01-AC01 — Numbering is financial-year and branch sequential, for example INV/2025-26/BR01/00001

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create branch invoice drafts with complete line and party context | Numbering is financial-year and branch sequential, for example INV/2025-26/BR01/00001. |

### M6-S01-AC02 — Walk-in sale is allowed and customer details are requested but skippable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create branch invoice drafts with complete line and party context | Walk-in sale is allowed and customer details are requested but skippable. |

### M6-S01-AC03 — Each line snapshots product, batch, expiry, quantity, UOM, MRP, selling price, discount,

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create branch invoice drafts with complete line and party context | Each line snapshots product, batch, expiry, quantity, UOM, MRP, selling price, discount, HSN, GST, and totals. |

### M6-S01-AC04 — Invoices retain staff, branch, terminal, status, timestamps, and optional customer/docto

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create branch invoice drafts with complete line and party context | Invoices retain staff, branch, terminal, status, timestamps, and optional customer/doctor/prescription references. |

### M6-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The create branch invoice drafts with complete line and party context operation is attempted | Number collision, stale stock, invalid UOM, foreign branch/batch, or incomplete controlled data fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Draft and invoice resources use /api/v1/sales/invoices.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary POS provides product/batch selection, optional customer lookup, totals, and draft state.
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
