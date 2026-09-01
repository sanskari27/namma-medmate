---
id: M6-S06
epic: M6
title: Schemes and offers
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Cashier]
depends_on: [M6-S02]
blocked_by: [D-010]
sources:
  - docs/product/product-compiled.md#module-6-erp--sales--pos--billing
  - docs/product/m6-pos.md
---

# M6-S06 — Schemes and offers

## User story

As **OWNER or Cashier**, I want to **configure and apply approved BOGO, seasonal, bundle, and related offers** so that **complete compliant online pharmacy sales with pricing, payments, prescriptions, returns, and invoice output.**

## Scope

### In

- Eligibility, priority, stacking, quantity, date, tax, return, and approval behavior follow D-010.
- Applied benefits are snapshotted on invoice lines.
- Expired or inactive offers never apply.
- Manual discounts and schemes produce a deterministic total.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M6-S06-AC01 — Eligibility, priority, stacking, quantity, date, tax, return, and approval behavior foll

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure and apply approved BOGO, seasonal, bundle, and related offers | Eligibility, priority, stacking, quantity, date, tax, return, and approval behavior follow D-010. |

### M6-S06-AC02 — Applied benefits are snapshotted on invoice lines

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure and apply approved BOGO, seasonal, bundle, and related offers | Applied benefits are snapshotted on invoice lines. |

### M6-S06-AC03 — Expired or inactive offers never apply

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure and apply approved BOGO, seasonal, bundle, and related offers | Expired or inactive offers never apply. |

### M6-S06-AC04 — Manual discounts and schemes produce a deterministic total

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Cashier with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure and apply approved BOGO, seasonal, bundle, and related offers | Manual discounts and schemes produce a deterministic total. |

### M6-S06-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The configure and apply approved BOGO, seasonal, bundle, and related offers operation is attempted | Ambiguous precedence, recursive bundles, invalid dates, unauthorized setup, or stale price fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Offer definitions and pricing evaluation use /api/v1/offers and server-side invoice calculation.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides offer management, eligible-offer display, and calculation explanation.
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
