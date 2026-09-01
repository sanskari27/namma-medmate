---
id: M2-S05
epic: M2
title: Plans, limits, and upgrades
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [OWNER, MASTER]
depends_on: [M2-S02]
blocked_by: [D-007, D-008]
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2-S05 — Plans, limits, and upgrades

## User story

As **OWNER or MASTER**, I want to **enforce plan entitlements and manage self-service or manual subscription changes** so that **onboard verified pharmacy tenants, administer lifecycle and plans, and operate isolated branches.**

## Scope

### In

- Approved tenants receive Free automatically.
- A limit breach blocks only the attempted action and presents an upgrade reason.
- OWNER may self-serve upgrade; MASTER may override plan, status, or expiry.
- Branch and user limits follow the resolved canonical plan matrix.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M2-S05-AC01 — Approved tenants receive Free automatically

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce plan entitlements and manage self-service or manual subscription changes | Approved tenants receive Free automatically. |

### M2-S05-AC02 — A limit breach blocks only the attempted action and presents an upgrade reason

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce plan entitlements and manage self-service or manual subscription changes | A limit breach blocks only the attempted action and presents an upgrade reason. |

### M2-S05-AC03 — OWNER may self-serve upgrade

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce plan entitlements and manage self-service or manual subscription changes | OWNER may self-serve upgrade; MASTER may override plan, status, or expiry. |

### M2-S05-AC04 — Branch and user limits follow the resolved canonical plan matrix

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce plan entitlements and manage self-service or manual subscription changes | Branch and user limits follow the resolved canonical plan matrix. |

### M2-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The enforce plan entitlements and manage self-service or manual subscription changes operation is attempted | Downgrade conflicts, replayed payment callbacks, unauthorized overrides, and over-limit writes are safe and idempotent. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Plan catalogue, usage, upgrade intent, and admin override use /api/v1/subscriptions.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary shows usage and upgrade actions; admin shows override history.
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
