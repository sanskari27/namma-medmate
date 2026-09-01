---
id: M1-S04
epic: M1
title: Staff onboarding and verification
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [MASTER, OWNER, Verification Agent]
depends_on: [M1-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S04 — Staff onboarding and verification

## User story

As **MASTER or OWNER or Verification Agent**, I want to **create staff accounts and verify regulated registrations before activation** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- There is no staff self-registration.
- The creating administrator assigns permitted roles and sets an initial password; branch assignment is owned by M1-S06 after branches exist.
- Pharmacist license or staff registration can be approved by MASTER or an authorized Verification Agent.
- Deactivation is a soft delete.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S04-AC01 — There is no staff self-registration

| Given | When | Then |
|---|---|---|
| A prospective pharmacy or platform staff member | They attempt to find or call a staff self-registration flow | No staff self-registration UI or API is available |

### M1-S04-AC02 — Administrator-created staff account

| Given | When | Then |
|---|---|---|
| OWNER creates tenant staff or MASTER creates platform staff with roles they may grant | They submit a unique identity and initial password | One inactive/pending staff account is created with only the permitted roles; no branch is assigned by this story |

### M1-S04-AC03 — Pharmacist license or staff registration can be approved by MASTER or an authorized Veri

| Given | When | Then |
|---|---|---|
| MASTER or a Verification Agent with explicit verification permission reviews valid evidence | They approve a Pharmacist license or staff registration | The verification decision, reviewer, evidence reference, and timestamp are retained and activation may continue |

### M1-S04-AC04 — Deactivation is a soft delete

| Given | When | Then |
|---|---|---|
| The creating administrator is authorized to offboard an active staff account | They deactivate it | Login is denied while the account and historical references remain soft-deleted and auditable |

### M1-S04-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The create staff accounts and verify regulated registrations before activation operation is attempted | Plan limit, duplicate email, invalid license, privilege escalation, and cross-tenant creation fail atomically. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Staff lifecycle endpoints are tenant-scoped under /api/v1/users; verification operations are exposed to admin.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary manages tenant staff; admin manages platform staff and verification queues.
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
