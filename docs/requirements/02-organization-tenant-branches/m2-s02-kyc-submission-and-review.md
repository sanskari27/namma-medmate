---
id: M2-S02
epic: M2
title: KYC submission and review
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [OWNER, MASTER, Verification Agent]
depends_on: [M2-S01, M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2-S02 — KYC submission and review

## User story

As **OWNER or MASTER or Verification Agent**, I want to **submit required KYC evidence and receive an authorized review decision** so that **onboard verified pharmacy tenants, administer lifecycle and plans, and operate isolated branches.**

## Scope

### In

- OWNER uploads KYC documents after email verification.
- MASTER or an explicitly permitted Verification Agent approves or rejects.
- Rejection includes a reason and permits corrected resubmission.
- Approval unlocks onboarding and triggers the default Free plan.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M2-S02-AC01 — OWNER uploads KYC documents after email verification

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / Verification Agent with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They submit required KYC evidence and receive an authorized review decision | OWNER uploads KYC documents after email verification. |

### M2-S02-AC02 — MASTER or an explicitly permitted Verification Agent approves or rejects

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / Verification Agent with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They submit required KYC evidence and receive an authorized review decision | MASTER or an explicitly permitted Verification Agent approves or rejects. |

### M2-S02-AC03 — Rejection includes a reason and permits corrected resubmission

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / Verification Agent with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They submit required KYC evidence and receive an authorized review decision | Rejection includes a reason and permits corrected resubmission. |

### M2-S02-AC04 — Approval unlocks onboarding and triggers the default Free plan

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / Verification Agent with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They submit required KYC evidence and receive an authorized review decision | Approval unlocks onboarding and triggers the default Free plan. |

### M2-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The submit required KYC evidence and receive an authorized review decision operation is attempted | Unsupported files, missing evidence, duplicate decisions, or unauthorized review are rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- KYC submission and admin review use /api/v1/tenants/{id}/kyc and /api/v1/admin/kyc.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary shows submission status; admin provides a review queue and evidence viewer.
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
