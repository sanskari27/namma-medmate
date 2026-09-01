---
id: M1-S02
epic: M1
title: PIN lock and unlock
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [authenticated user]
depends_on: [M1-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S02 — PIN lock and unlock

## User story

As **authenticated user**, I want to **resume an existing session after inactivity using a six-digit PIN** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- The client locks after five minutes of inactivity without ending the server session.
- PIN is per user and works across devices.
- Three failed PIN attempts revoke the session and require full login.
- A successful PIN restores the same session and selected branch.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S02-AC01 — The client locks after five minutes of inactivity without ending the server session

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They resume an existing session after inactivity using a six-digit PIN | The client locks after five minutes of inactivity without ending the server session. |

### M1-S02-AC02 — PIN is per user and works across devices

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They resume an existing session after inactivity using a six-digit PIN | PIN is per user and works across devices. |

### M1-S02-AC03 — Three failed PIN attempts revoke the session and require full login

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They resume an existing session after inactivity using a six-digit PIN | Three failed PIN attempts revoke the session and require full login. |

### M1-S02-AC04 — A successful PIN restores the same session and selected branch

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They resume an existing session after inactivity using a six-digit PIN | A successful PIN restores the same session and selected branch. |

### M1-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The resume an existing session after inactivity using a six-digit PIN operation is attempted | Malformed PINs and the fourth use after revocation cannot unlock the session. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- POST /api/v1/auth/pin and /api/v1/auth/pin/unlock manage PIN setup and unlock attempts.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Authenticated shells display a keyboard-accessible blocking lock screen and reset inactivity on meaningful user activity.
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
