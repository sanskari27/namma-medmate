---
id: M6-S08
epic: M6
title: A4 invoice and connectivity guard
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Cashier, customer]
depends_on: [M6-S05, M11-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S08 — A4 invoice and connectivity guard

## User story

As **Cashier or customer**, I want to **produce the compliant A4 invoice and prevent online-only billing while disconnected** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- PDF includes all pharmacy, tax, license, line, patient/prescriber, pharmacist, controlled-drug, payment, return, and declaration fields in the product source.
- Thermal format is out of scope.
- Connection loss shows a full-screen blocking overlay and preserves the draft.
- Billing resumes after successful server reachability.
- Invoice status can represent GST e-invoice/IRN applicability and a future
  integration state without calling a GSP in Phase 1.
- When a linked customer has email, staff may send the immutable invoice copy
  through the Resend adapter without changing sale completion.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S08-AC01 — PDF includes all pharmacy, tax, license, line, patient/prescriber, pharmacist, controlle

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / customer with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They produce the compliant A4 invoice and prevent online-only billing while disconnected | PDF includes all pharmacy, tax, license, line, patient/prescriber, pharmacist, controlled-drug, payment, return, and declaration fields in the product source. |

### M6-S08-AC02 — Thermal format is out of scope

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / customer with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They produce the compliant A4 invoice and prevent online-only billing while disconnected | Thermal format is out of scope. |

### M6-S08-AC03 — Connection loss shows a full-screen blocking overlay and preserves the draft

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / customer with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They produce the compliant A4 invoice and prevent online-only billing while disconnected | Connection loss shows a full-screen blocking overlay and preserves the draft. |

### M6-S08-AC04 — Billing resumes after successful server reachability

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / customer with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They produce the compliant A4 invoice and prevent online-only billing while disconnected | Billing resumes after successful server reachability. |

### M6-S08-AC05 — Deferred e-invoice state

| Given | When | Then |
|---|---|---|
| A tenant is or may later become subject to GST e-invoicing | An invoice is issued in Phase 1 | The invoice can retain neutral applicability/integration status without generating an IRN or claiming successful GSP submission |

### M6-S08-AC06 — Email invoice copy

| Given | When | Then |
|---|---|---|
| A completed invoice has a linked customer email | Staff requests an email copy | The immutable invoice is queued through M11-S02 once and provider failure does not alter the completed sale |

### M6-S08-AC07 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The produce the compliant A4 invoice and prevent online-only billing while disconnected operation is attempted | A disconnected client cannot claim completion; PDF generation never changes invoice data. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Immutable invoice PDF generation and health/reconnect checks use /api/v1/sales/invoices/{id}/pdf and health.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS provides print/download, reconnect status, and draft recovery.
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
