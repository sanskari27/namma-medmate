---
id: M6-S02
epic: M6
title: GST and discount calculation
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Cashier, approver]
depends_on: [M6-S01, M1-S07]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S02 — GST and discount calculation

## User story

As **Cashier or approver**, I want to **calculate tax and apply authorized line or invoice discounts** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Discount supports percentage or flat amount at line and bill level.
- Configured thresholds trigger approval before completion.
- GST derives from product tax category and HSN with CGST/SGST or IGST as applicable.
- Authorized manual tax adjustment is recorded with reason.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S02-AC01 — Discount supports percentage or flat amount at line and bill level

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They calculate tax and apply authorized line or invoice discounts | Discount supports percentage or flat amount at line and bill level. |

### M6-S02-AC02 — Configured thresholds trigger approval before completion

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They calculate tax and apply authorized line or invoice discounts | Configured thresholds trigger approval before completion. |

### M6-S02-AC03 — GST derives from product tax category and HSN with CGST/SGST or IGST as applicable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They calculate tax and apply authorized line or invoice discounts | GST derives from product tax category and HSN with CGST/SGST or IGST as applicable. |

### M6-S02-AC04 — Authorized manual tax adjustment is recorded with reason

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They calculate tax and apply authorized line or invoice discounts | Authorized manual tax adjustment is recorded with reason. |

### M6-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The calculate tax and apply authorized line or invoice discounts operation is attempted | Negative totals, excessive discount, inconsistent jurisdiction, unauthorized override, or stale approval fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Server-priced invoice calculation and approvals use invoice subresources.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- POS displays calculation breakdown, approval state, and authorized override controls.
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
