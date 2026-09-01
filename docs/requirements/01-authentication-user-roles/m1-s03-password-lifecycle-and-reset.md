---
id: M1-S03
epic: M1
title: Password lifecycle and reset
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [MASTER, OWNER, staff]
depends_on: [M1-S01, M11-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S03 — Password lifecycle and reset

## User story

As **MASTER or OWNER or staff**, I want to **enforce password policy, expiry, history, and the correct reset path** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- Passwords contain at least eight characters.
- Passwords expire after 90 days and cannot be reused.
- MASTER and OWNER receive time-limited email reset links.
- Sub-accounts are reset by their creating administrator and must change the temporary password.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S03-AC01 — Passwords contain at least eight characters

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce password policy, expiry, history, and the correct reset path | Passwords contain at least eight characters. |

### M1-S03-AC02 — Passwords expire after 90 days and cannot be reused

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce password policy, expiry, history, and the correct reset path | Passwords expire after 90 days and cannot be reused. |

### M1-S03-AC03 — MASTER and OWNER receive time-limited email reset links

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce password policy, expiry, history, and the correct reset path | MASTER and OWNER receive time-limited email reset links. |

### M1-S03-AC04 — Sub-accounts are reset by their creating administrator and must change the temporary pas

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce password policy, expiry, history, and the correct reset path | Sub-accounts are reset by their creating administrator and must change the temporary password. |

### M1-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The enforce password policy, expiry, history, and the correct reset path operation is attempted | Expired, consumed, tampered, reused, or cross-user reset tokens are rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Password change, request-reset, complete-reset, and administrator-reset endpoints live under /api/v1/auth.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Both apps provide only the reset flows permitted for the current account type.
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
