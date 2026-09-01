---
id: M3-S01
epic: M3
title: Customer records and phone deduplication
phase: 1
priority: P0
apps: [server, dispensary]
personas: [authorized pharmacy staff]
depends_on: [M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S01 — Customer records and phone deduplication

## User story

As **authorized pharmacy staff**, I want to **create and maintain tenant-wide customer profiles with phone deduplication** so that **maintain unified tenant-wide customer records, health context, engagement, loyalty, and credit.**

## Scope

### In

- Fields include name, phone, email, DOB, gender, address, blood group, allergies, and chronic conditions.
- Phone is unique within a tenant, not across tenants.
- Profiles are tenant-wide and visible across assigned branches.
- Customers have no login in Phase 1.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S01-AC01 — Fields include name, phone, email, DOB, gender, address, blood group, allergies, and chr

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create and maintain tenant-wide customer profiles with phone deduplication | Fields include name, phone, email, DOB, gender, address, blood group, allergies, and chronic conditions. |

### M3-S01-AC02 — Phone is unique within a tenant, not across tenants

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create and maintain tenant-wide customer profiles with phone deduplication | Phone is unique within a tenant, not across tenants. |

### M3-S01-AC03 — Profiles are tenant-wide and visible across assigned branches

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create and maintain tenant-wide customer profiles with phone deduplication | Profiles are tenant-wide and visible across assigned branches. |

### M3-S01-AC04 — Customers have no login in Phase 1

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create and maintain tenant-wide customer profiles with phone deduplication | Customers have no login in Phase 1. |

### M3-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The create and maintain tenant-wide customer profiles with phone deduplication operation is attempted | Duplicate phone returns a merge/search choice; invalid contact or cross-tenant access cannot write. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Customer search and CRUD use /api/v1/customers with tenant scope.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides list/detail/forms and a reusable creation dialog usable from other modules.
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
