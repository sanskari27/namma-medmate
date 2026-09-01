---
id: M2-S03
epic: M2
title: Tenant status lifecycle
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [OWNER, MASTER]
depends_on: [M2-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2-S03 — Tenant status lifecycle

## User story

As **OWNER or MASTER**, I want to **apply tenant status transitions and cascade access restrictions** so that **onboard verified pharmacy tenants, administer lifecycle and plans, and operate isolated branches.**

## Scope

### In

- Supported statuses are VERIFICATION_REQUIRED, ACTIVE, SUSPENDED, EXPIRED, and TERMINATED.
- MASTER can suspend or terminate with a reason.
- Suspension, expiry, or termination blocks every branch and user.
- Reactivation preserves business records and audit history.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M2-S03-AC01 — Supported statuses are VERIFICATION_REQUIRED, ACTIVE, SUSPENDED, EXPIRED, and TERMINATED

| Given | When | Then |
|---|---|---|
| A tenant completes registration, KYC review, subscription expiry, suspension, reactivation, or termination | The owning workflow changes lifecycle state | The persisted state is exactly one of VERIFICATION_REQUIRED, ACTIVE, SUSPENDED, EXPIRED, or TERMINATED and only a documented transition is accepted |

### M2-S03-AC02 — MASTER can suspend or terminate with a reason

| Given | When | Then |
|---|---|---|
| An authenticated MASTER views an eligible tenant | MASTER suspends or terminates it with a reason | The state, reason, MASTER identity, and timestamp commit once; OWNER cannot call the platform command |

### M2-S03-AC03 — Suspension, expiry, or termination blocks every branch and user

| Given | When | Then |
|---|---|---|
| A tenant is SUSPENDED, EXPIRED, or TERMINATED | OWNER or staff attempts any protected tenant or branch operation | Access is denied consistently for every tenant user and branch without deleting business data |

### M2-S03-AC04 — Reactivation preserves business records and audit history

| Given | When | Then |
|---|---|---|
| An authorized MASTER reactivates an eligible suspended tenant | Its users sign in again | Existing branches, users, transactions, and audit history remain intact and access follows current roles/assignments |

### M2-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The apply tenant status transitions and cascade access restrictions operation is attempted | Illegal transitions, stale updates, or tenant-user attempts are rejected without partial cascade. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Status commands use /api/v1/admin/tenants/{id}/status; all authenticated requests enforce current status.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Admin shows valid transitions; dispensary shows a non-destructive access explanation.
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
