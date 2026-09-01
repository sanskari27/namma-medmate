---
id: M11-S01
epic: M11
title: Cashfree subscription billing
phase: 1
priority: P1
apps: [server, dispensary, admin]
personas: [OWNER, MASTER]
depends_on: [M2-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-11-integrations
  - docs/product/m11-integrations.md
---

# M11-S01 — Cashfree subscription billing

## User story

As **OWNER or MASTER**, I want to **pay only pharmacy-to-platform subscription charges through Cashfree** so that **integrate subscription payments, transactional email, and explicit phase 2 extension boundaries.**

## Scope

### In

- Cashfree is not used for customer POS payments in Phase 1.
- Checkout amount and plan are created server-side.
- Signed callbacks are verified and idempotent.
- Subscription activates only from a valid provider outcome and retains payment history.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M11-S01-AC01 — Cashfree is not used for customer POS payments in Phase 1

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They pay only pharmacy-to-platform subscription charges through Cashfree | Cashfree is not used for customer POS payments in Phase 1. |

### M11-S01-AC02 — Checkout amount and plan are created server-side

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They pay only pharmacy-to-platform subscription charges through Cashfree | Checkout amount and plan are created server-side. |

### M11-S01-AC03 — Signed callbacks are verified and idempotent

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They pay only pharmacy-to-platform subscription charges through Cashfree | Signed callbacks are verified and idempotent. |

### M11-S01-AC04 — Subscription activates only from a valid provider outcome and retains payment history

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They pay only pharmacy-to-platform subscription charges through Cashfree | Subscription activates only from a valid provider outcome and retains payment history. |

### M11-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The pay only pharmacy-to-platform subscription charges through Cashfree operation is attempted | Tampered amount, invalid signature, replay, abandoned checkout, or mismatched tenant cannot activate a plan. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Checkout, callback, and status use /api/v1/subscriptions/payments/cashfree.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary starts checkout and reconciles result; admin views payment state and exceptions.
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
