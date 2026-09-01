---
id: M6-S04
epic: M6
title: Prescription-linked and controlled sale
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Pharmacist, Cashier]
depends_on: [M6-S01, M4-S07, M3-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S04 — Prescription-linked and controlled sale

## User story

As **Pharmacist or Cashier**, I want to **capture sale-time prescription verification and partial fulfillment** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Phase 1 stores a manual verified checkbox and reference, not a prescription image.
- Controlled products require Pharmacist role and patient/prescriber context.
- Multi-visit partial fulfillment is tracked against the reference.
- Doctor remains a reference entity.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S04-AC01 — Phase 1 stores a manual verified checkbox and reference, not a prescription image

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They capture sale-time prescription verification and partial fulfillment | Phase 1 stores a manual verified checkbox and reference, not a prescription image. |

### M6-S04-AC02 — Controlled products require Pharmacist role and patient/prescriber context

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They capture sale-time prescription verification and partial fulfillment | Controlled products require Pharmacist role and patient/prescriber context. |

### M6-S04-AC03 — Multi-visit partial fulfillment is tracked against the reference

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They capture sale-time prescription verification and partial fulfillment | Multi-visit partial fulfillment is tracked against the reference. |

### M6-S04-AC04 — Doctor remains a reference entity

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They capture sale-time prescription verification and partial fulfillment | Doctor remains a reference entity. |

### M6-S04-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The capture sale-time prescription verification and partial fulfillment operation is attempted | Unverified controlled product, cashier-only dispense, over-fulfillment, or foreign reference cannot complete. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Prescription sale validation is part of invoice draft and completion APIs.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS presents verification, doctor, partial fulfillment, and regulatory warning states.
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
