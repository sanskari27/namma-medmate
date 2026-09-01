---
id: M1-S06
epic: M1
title: Branch assignment and switching
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, staff]
depends_on: [M1-S05, M2-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S06 — Branch assignment and switching

## User story

As **OWNER or staff**, I want to **assign users to multiple branches and switch active branch safely** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- Branch assignment controls data visibility but does not redefine module permissions.
- Only branches in the same tenant may be assigned.
- Every branch-scoped request validates the active branch against user assignments.
- OWNER can use consolidated and per-branch views.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S06-AC01 — Branch assignment controls data visibility but does not redefine module permissions

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They assign users to multiple branches and switch active branch safely | Branch assignment controls data visibility but does not redefine module permissions. |

### M1-S06-AC02 — Only branches in the same tenant may be assigned

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They assign users to multiple branches and switch active branch safely | Only branches in the same tenant may be assigned. |

### M1-S06-AC03 — Every branch-scoped request validates the active branch against user assignments

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They assign users to multiple branches and switch active branch safely | Every branch-scoped request validates the active branch against user assignments. |

### M1-S06-AC04 — OWNER can use consolidated and per-branch views

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They assign users to multiple branches and switch active branch safely | OWNER can use consolidated and per-branch views. |

### M1-S06-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The assign users to multiple branches and switch active branch safely operation is attempted | Forged, removed, inactive, or cross-tenant branch selections return denied without changing context. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Assignments and active-branch selection use /api/v1/users/{id}/branches and /api/v1/session/branch.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- The dispensary shell provides branch switching and refreshes branch-scoped data.
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
