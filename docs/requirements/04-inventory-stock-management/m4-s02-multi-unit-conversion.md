---
id: M4-S02
epic: M4
title: Multi-unit conversion
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Inventory, Cashier]
depends_on: [M4-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S02 — Multi-unit conversion

## User story

As **Inventory or Cashier**, I want to **define and apply exact product unit conversions such as strip to tablet** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- Each product has a base unit.
- Conversions are positive, deterministic, and versioned when used by transactions.
- Stock is normalized without losing displayed sale or purchase UOM.
- Fractional quantities follow the product’s allowed precision.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S02-AC01 — Each product has a base unit

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They define and apply exact product unit conversions such as strip to tablet | Each product has a base unit. |

### M4-S02-AC02 — Conversions are positive, deterministic, and versioned when used by transactions

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They define and apply exact product unit conversions such as strip to tablet | Conversions are positive, deterministic, and versioned when used by transactions. |

### M4-S02-AC03 — Stock is normalized without losing displayed sale or purchase UOM

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They define and apply exact product unit conversions such as strip to tablet | Stock is normalized without losing displayed sale or purchase UOM. |

### M4-S02-AC04 — Fractional quantities follow the product’s allowed precision

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They define and apply exact product unit conversions such as strip to tablet | Fractional quantities follow the product’s allowed precision. |

### M4-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The define and apply exact product unit conversions such as strip to tablet operation is attempted | Zero, negative, circular, duplicate, or precision-losing conversions are rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Product UOM endpoints use /api/v1/products/{id}/units.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Product, PO, GRN, and POS controls display valid units and converted availability.
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
