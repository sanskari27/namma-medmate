---
id: M2-S01
epic: M2
title: Tenant registration and email verification
phase: 1
priority: P0
apps: [server, dispensary]
personas: [prospective OWNER]
depends_on: [M1-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2-S01 — Tenant registration and email verification

## User story

As **prospective OWNER**, I want to **register a pharmacy tenant and verify its email before KYC** so that **onboard verified pharmacy tenants, administer lifecycle and plans, and operate isolated branches.**

## Scope

### In

- Registration captures business name, email, phone, and password.
- The new tenant starts VERIFICATION_REQUIRED and cannot use product modules.
- Email verification tokens are single-use and time-limited.
- No trial or pre-KYC setup access is granted.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M2-S01-AC01 — Registration captures business name, email, phone, and password

| Given | When | Then |
|---|---|---|
| A request or event initiated by prospective OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They register a pharmacy tenant and verify its email before KYC | Registration captures business name, email, phone, and password. |

### M2-S01-AC02 — The new tenant starts VERIFICATION_REQUIRED and cannot use product modules

| Given | When | Then |
|---|---|---|
| A request or event initiated by prospective OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They register a pharmacy tenant and verify its email before KYC | The new tenant starts VERIFICATION_REQUIRED and cannot use product modules. |

### M2-S01-AC03 — Email verification tokens are single-use and time-limited

| Given | When | Then |
|---|---|---|
| A request or event initiated by prospective OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They register a pharmacy tenant and verify its email before KYC | Email verification tokens are single-use and time-limited. |

### M2-S01-AC04 — No trial or pre-KYC setup access is granted

| Given | When | Then |
|---|---|---|
| A request or event initiated by prospective OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They register a pharmacy tenant and verify its email before KYC | No trial or pre-KYC setup access is granted. |

### M2-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The register a pharmacy tenant and verify its email before KYC operation is attempted | Duplicate identity, invalid token, replay, or partial persistence produces no usable tenant. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- POST /api/v1/tenants/register and /api/v1/tenants/verify-email create and verify the pending tenant.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- The dispensary registration flow resumes safely after email verification.
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
