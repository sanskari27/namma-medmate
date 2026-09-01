---
id: M1-S01
epic: M1
title: Email and password login
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [MASTER, OWNER, staff]
depends_on: []
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S01 — Email and password login

## User story

As **MASTER or OWNER or staff**, I want to **authenticate an active user with email and password** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- Email is case-normalized and globally unique for login.
- Passwords are verified with a one-way adaptive hash.
- A successful login invalidates any prior session for the user.
- Suspended, expired, terminated, deleted, or KYC-locked accounts cannot enter the product.
- Phase 1 supports email and password only: no OTP, social login, SSO, or 2FA.
- Failed logins do not lock the account, and Phase 1 adds no device or IP restriction.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S01-AC01 — Email is case-normalized and globally unique for login

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They authenticate an active user with email and password | Email is case-normalized and globally unique for login. |

### M1-S01-AC02 — Passwords are verified with a one-way adaptive hash

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They authenticate an active user with email and password | Passwords are verified with a one-way adaptive hash. |

### M1-S01-AC03 — A successful login invalidates any prior session for the user

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They authenticate an active user with email and password | A successful login invalidates any prior session for the user. |

### M1-S01-AC04 — Suspended, expired, terminated, deleted, or KYC-locked accounts cannot enter the product

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They authenticate an active user with email and password | Suspended, expired, terminated, deleted, or KYC-locked accounts cannot enter the product. |

### M1-S01-AC05 — Phase 1 supports email and password only

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They authenticate an active user with email and password | Phase 1 supports email and password only: no OTP, social login, SSO, or 2FA. |

### M1-S01-AC06 — Failed logins do not lock the account, and Phase 1 adds no device or IP restriction

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They authenticate an active user with email and password | Failed logins do not lock the account, and Phase 1 adds no device or IP restriction. |

### M1-S01-AC07 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The authenticate an active user with email and password operation is attempted | Invalid credentials return a generic denial without revealing whether the account exists. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- POST /api/v1/auth/login returns the standard envelope and an authenticated session.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Both login screens submit credentials and render validation, denied, locked, and success states.
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
