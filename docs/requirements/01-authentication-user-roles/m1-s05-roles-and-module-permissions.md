---
id: M1-S05
epic: M1
title: Roles and module permissions
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [MASTER, OWNER]
depends_on: [M1-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S05 — Roles and module permissions

## User story

As **MASTER or OWNER**, I want to **manage predefined and custom module-level roles without privilege escalation** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- A user may hold multiple roles.
- Custom role permissions are capped by subscription module entitlements and the creator’s own permissions.
- Permissions are module-level, not action-level.
- OWNER has all tenant modules; MASTER can create platform sub-roles.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S05-AC01 — A user may hold multiple roles

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage predefined and custom module-level roles without privilege escalation | A user may hold multiple roles. |

### M1-S05-AC02 — Custom role permissions are capped by subscription module entitlements and the creator’s

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage predefined and custom module-level roles without privilege escalation | Custom role permissions are capped by subscription module entitlements and the creator’s own permissions. |

### M1-S05-AC03 — Permissions are module-level, not action-level

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage predefined and custom module-level roles without privilege escalation | Permissions are module-level, not action-level. |

### M1-S05-AC04 — OWNER has all tenant modules

| Given | When | Then |
|---|---|---|
| A request or event initiated by MASTER / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage predefined and custom module-level roles without privilege escalation | OWNER has all tenant modules; MASTER can create platform sub-roles. |

### M1-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The manage predefined and custom module-level roles without privilege escalation operation is attempted | An actor cannot grant a permission they do not possess or one excluded by the active plan. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Role and assignment endpoints are separated under /api/v1/roles and /api/v1/users/{id}/roles.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Role editors show only grantable modules and explain plan-gated modules.
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
