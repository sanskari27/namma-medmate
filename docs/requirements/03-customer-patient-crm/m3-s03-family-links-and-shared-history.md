---
id: M3-S03
epic: M3
title: Family links and shared history
phase: 1
priority: P0
apps: [server, dispensary]
personas: [authorized pharmacy staff]
depends_on: [M3-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S03 — Family links and shared history

## User story

As **authorized pharmacy staff**, I want to **link dependents into families and view collective purchase and prescription history** so that **maintain unified tenant-wide customer records, health context, engagement, loyalty, and credit.**

## Scope

### In

- A profile belongs to at most one family group.
- Links do not merge identities.
- Individual records remain distinguishable in family history.
- Family relationships stay tenant-scoped.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S03-AC01 — A profile belongs to at most one family group

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They link dependents into families and view collective purchase and prescription history | A profile belongs to at most one family group. |

### M3-S03-AC02 — Links do not merge identities

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They link dependents into families and view collective purchase and prescription history | Links do not merge identities. |

### M3-S03-AC03 — Individual records remain distinguishable in family history

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They link dependents into families and view collective purchase and prescription history | Individual records remain distinguishable in family history. |

### M3-S03-AC04 — Family relationships stay tenant-scoped

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized pharmacy staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They link dependents into families and view collective purchase and prescription history | Family relationships stay tenant-scoped. |

### M3-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The link dependents into families and view collective purchase and prescription history operation is attempted | Duplicate membership, self-link, cycles, or cross-tenant members are rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Family group and membership operations use /api/v1/customer-families.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Customer detail displays family members and filterable collective history.
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
