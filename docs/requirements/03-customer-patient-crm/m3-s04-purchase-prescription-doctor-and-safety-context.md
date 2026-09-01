---
id: M3-S04
epic: M3
title: Purchase, prescription, and doctor context
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Pharmacist, Cashier]
depends_on: [M3-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S04 — Purchase, prescription, and doctor context

## User story

As **Pharmacist or Cashier**, I want to **view prescription sale history and
maintain doctor references** so that **customer records preserve their purchase
and prescriber context.**

## Scope

### In

- Customer history queries include prescription-based sale facts posted by the owning M6-S05 completion workflow.
- Doctor is a reference record with no Phase 1 login.
- Doctor references support tenant reporting such as top-referring doctors.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S04-AC01 — History reads linked prescription-sale facts

| Given | When | Then |
|---|---|---|
| M6-S05 has posted a prescription-based sale linked to a tenant customer | Pharmacist or Cashier opens that customer history | The immutable sale and prescription reference appear once; this story does not own sale posting |

### M3-S04-AC02 — Doctor is a reference record with no Phase 1 login

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view prescription sale history or maintain doctor references | Doctor is a reference record with no Phase 1 login. |

### M3-S04-AC03 — Doctor references support tenant reporting such as top-referring doctors

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view prescription sale history or maintain doctor references | Doctor references support tenant reporting such as top-referring doctors. |

### M3-S04-AC04 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The history or doctor-reference operation is attempted | Missing customer, invalid doctor, or cross-tenant reference is rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- History and doctor records use `/api/v1/customers/{id}/history` and `/api/v1/doctors`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Customer detail and POS show source-linked history and doctor references.
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
