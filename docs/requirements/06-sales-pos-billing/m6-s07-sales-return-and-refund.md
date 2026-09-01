---
id: M6-S07
epic: M6
title: Sales return and refund
phase: 1
priority: P0
apps: [server, dispensary]
personas: [authorized staff]
depends_on: [M6-S05, M4-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S07 — Sales return and refund

## User story

As **authorized staff**, I want to **record a manually approved return and issue cash refund or credit note** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Staff judges eligibility; the system records reason and decision.
- Returned quantity cannot exceed net sold quantity.
- Accepted product returns to its originating batch.
- Refund mode is cash or credit note and all effects are atomic.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S07-AC01 — Staff judges eligibility

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record a manually approved return and issue cash refund or credit note | Staff judges eligibility; the system records reason and decision. |

### M6-S07-AC02 — Returned quantity cannot exceed net sold quantity

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record a manually approved return and issue cash refund or credit note | Returned quantity cannot exceed net sold quantity. |

### M6-S07-AC03 — Accepted product returns to its originating batch

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record a manually approved return and issue cash refund or credit note | Accepted product returns to its originating batch. |

### M6-S07-AC04 — Refund mode is cash or credit note and all effects are atomic

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They record a manually approved return and issue cash refund or credit note | Refund mode is cash or credit note and all effects are atomic. |

### M6-S07-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The record a manually approved return and issue cash refund or credit note operation is attempted | Duplicate return, foreign branch/tenant, non-returnable product, expired batch policy, or over-return fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Return preview and confirmation use /api/v1/sales/returns.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary locates invoices, selects lines/quantities, records decision, and shows refund/restock.
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
