---
id: M4-S07
epic: M4
title: Controlled-substance inventory controls
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Pharmacist, OWNER]
depends_on: [M4-S03, M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S07 — Controlled-substance inventory controls

## User story

As **Pharmacist or OWNER**, I want to **restrict and report Schedule H, H1, X, and NDPS stock** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- Dispensing requires prescription verification and Pharmacist role.
- Cashier-only accounts cannot dispense controlled products.
- Each movement feeds a separate controlled register.
- Government-format stock reporting and general export remain traceable.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S07-AC01 — Dispensing requires prescription verification and Pharmacist role

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They restrict and report Schedule H, H1, X, and NDPS stock | Dispensing requires prescription verification and Pharmacist role. |

### M4-S07-AC02 — Cashier-only accounts cannot dispense controlled products

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They restrict and report Schedule H, H1, X, and NDPS stock | Cashier-only accounts cannot dispense controlled products. |

### M4-S07-AC03 — Each movement feeds a separate controlled register

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They restrict and report Schedule H, H1, X, and NDPS stock | Each movement feeds a separate controlled register. |

### M4-S07-AC04 — Government-format stock reporting and general export remain traceable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They restrict and report Schedule H, H1, X, and NDPS stock | Government-format stock reporting and general export remain traceable. |

### M4-S07-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The restrict and report Schedule H, H1, X, and NDPS stock operation is attempted | Missing verification, wrong role, incomplete patient/prescriber data, or altered export scope fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Controlled validation and stock register use /api/v1/compliance/controlled-stock.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS blocks unauthorized dispense; compliance views provide filtered export.
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
