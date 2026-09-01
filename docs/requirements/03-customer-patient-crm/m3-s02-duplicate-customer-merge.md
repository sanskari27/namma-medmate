---
id: M3-S02
epic: M3
title: Duplicate customer merge
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, authorized staff]
depends_on: [M3-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S02 — Duplicate customer merge

## User story

As **OWNER or authorized staff**, I want to **merge duplicate profiles without losing financial, prescription, or purchase history** so that **maintain unified tenant-wide customer records, health context, engagement, loyalty, and credit.**

## Scope

### In

- The survivor and duplicate must belong to the same tenant.
- References move transactionally and immutable source transactions are not rewritten.
- Conflicts are previewed before confirmation.
- The duplicate is soft-deactivated with merge provenance.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S02-AC01 — The survivor and duplicate must belong to the same tenant

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They merge duplicate profiles without losing financial, prescription, or purchase history | The survivor and duplicate must belong to the same tenant. |

### M3-S02-AC02 — References move transactionally and immutable source transactions are not rewritten

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They merge duplicate profiles without losing financial, prescription, or purchase history | References move transactionally and immutable source transactions are not rewritten. |

### M3-S02-AC03 — Conflicts are previewed before confirmation

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They merge duplicate profiles without losing financial, prescription, or purchase history | Conflicts are previewed before confirmation. |

### M3-S02-AC04 — The duplicate is soft-deactivated with merge provenance

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They merge duplicate profiles without losing financial, prescription, or purchase history | The duplicate is soft-deactivated with merge provenance. |

### M3-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The merge duplicate profiles without losing financial, prescription, or purchase history operation is attempted | Concurrent updates, cycles, already-merged records, or cross-tenant merges fail atomically. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Preview and execute merge use /api/v1/customers/merge.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- A review screen shows conflicting fields and affected linked records.
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
