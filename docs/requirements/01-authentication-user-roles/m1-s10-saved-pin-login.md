---
id: M1-S10
epic: M1
title: Saved PIN login
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [MASTER, OWNER, staff]
depends_on: [M1-S01, M1-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/product-compiled.md#authentication
---

# M1-S10 — Saved PIN login

## User story

As **MASTER or OWNER or staff**, I want to **sign back in on this till or console with a six-digit PIN after this device has remembered me** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- After email+password login and PIN enroll, this device may keep that person as a saved login.
- Several people can be saved on one device; tap a person and enter PIN to start a new session.
- “Use another account” remains email and password.
- Sign out ends the server session and keeps saved people on this device.
- Five minutes of inactivity on a PIN-enrolled session signs out the same way (no idle lock overlay). Relogin is the saved-login picker plus PIN.
- Three failed PINs drop that person on this device; password still works.
- Binding lasts 30 days from last successful PIN or password login on that device (sliding). Password change or reset revokes all of that user’s saved devices.

### Out

- WhatsApp OTP, social login, SSO, or 2FA.
- Owner enable/remove of saved login in Manage Users (M1-S04).
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S10-AC01 — This device keeps a PIN-enrolled person as a saved login

| Given | When | Then |
|---|---|---|
| OWNER, staff, or MASTER has signed in with email and password and enrolled a six-digit PIN on this browser | They sign out and return to the login screen | That person appears as a saved login on this device |

### M1-S10-AC02 — Several people per device; PIN starts a new session

| Given | When | Then |
|---|---|---|
| Two PIN-enrolled people are saved on this till or console | They tap a saved person and enter the correct PIN | A new session is created for that person and any prior session for them is revoked |

### M1-S10-AC03 — Use another account is email and password

| Given | When | Then |
|---|---|---|
| Saved people are shown on the login screen | They choose to use another account | Email and password login is available and PIN is not accepted without a device binding |

### M1-S10-AC04 — Sign out ends the session and keeps saved people

| Given | When | Then |
|---|---|---|
| An authenticated user with a saved binding on this device | They sign out | The access session is revoked and the saved-login list still includes them |

### M1-S10-AC04b — Five-minute idle signs out; PIN picker relogin

| Given | When | Then |
|---|---|---|
| A PIN-enrolled user is signed in on this till or console | The screen is idle for five minutes | The access session is revoked, they are returned to the login picker, and there is no idle lock overlay |

### M1-S10-AC05 — Three failed PINs drop that person on this device

| Given | When | Then |
|---|---|---|
| A saved person on this device | They enter an incorrect PIN three times | That binding is revoked; password login still works; a fourth PIN on this device cannot start a session |

### M1-S10-AC06 — Sliding 30-day binding; password change or reset clears saved devices

| Given | When | Then |
|---|---|---|
| A saved binding exists for a user | 30 days pass without a successful PIN or password login on that device, or they change or reset their password | The binding no longer appears and PIN login on that device is denied |

### M1-S10-AC07 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing device cookie, unknown user on this device, deactivated account, or malformed PIN | PIN login or saved-list is attempted | PIN without a device binding is rejected. Deactivated people are omitted. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- GET /api/v1/auth/saved-logins, POST /api/v1/auth/pin/login, DELETE /api/v1/auth/saved-logins/{userId}, and POST /api/v1/auth/logout manage saved logins and sign-out.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary shows shop-floor staff tiles and a POS keypad for PIN login. Admin shows an HQ operator list and segmented PIN cells. Do not clone one app into the other.
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
