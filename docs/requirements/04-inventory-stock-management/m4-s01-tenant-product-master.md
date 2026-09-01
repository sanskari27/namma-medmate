---
id: M4-S01
epic: M4
title: Tenant product master
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Inventory]
depends_on: [M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S01 — Tenant product master

## User story

As **OWNER or Inventory**, I want to **maintain each tenant’s independent product catalogue** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- No shared cross-tenant medicine catalogue exists.
- The product model covers identity, classification, composition, dosage, tax, units, pack, storage, tracking, controlled status, rack, reorder, returnability, notes, and active state from the product source.
- Barcode is stored as reference data only in Phase 1.
- Discontinued products remain in history.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S01-AC01 — No shared cross-tenant medicine catalogue exists

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain each tenant’s independent product catalogue | No shared cross-tenant medicine catalogue exists. |

### M4-S01-AC02 — The product model covers identity, classification, composition, dosage, tax, units, pack

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain each tenant’s independent product catalogue | The product model covers identity, classification, composition, dosage, tax, units, pack, storage, tracking, controlled status, rack, reorder, returnability, notes, and active state from the product source. |

### M4-S01-AC03 — Barcode is stored as reference data only in Phase 1

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain each tenant’s independent product catalogue | Barcode is stored as reference data only in Phase 1. |

### M4-S01-AC04 — Discontinued products remain in history

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain each tenant’s independent product catalogue | Discontinued products remain in history. |

### M4-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The maintain each tenant’s independent product catalogue operation is attempted | Duplicate SKU, invalid GST/HSN, inconsistent tracking flags, or cross-tenant access fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Product search and CRUD use /api/v1/products with tenant filters.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides dense accessible product forms and searchable lists.
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
