---
id: M1-S08
epic: M1
title: MASTER tenant-user impersonation
phase: 1
priority: P0
apps: [server, admin]
personas: [MASTER]
depends_on: [M1-S01, M1-S05]
blocked_by: [D-001]
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S08 — MASTER tenant-user impersonation

## User story

As **MASTER**, I want to **enter a tenant user's support context** so that I
can diagnose tenant issues without receiving the user's credentials.

## Scope

### In

- Only MASTER may start an impersonation session.
- The session retains both the original MASTER identity and effective tenant-user identity.
- Tenant, branch, role, expiry, nesting, visible banner, and exit behavior are explicit.
- Audit behavior follows D-001 and must not be invented by an implementation agent.

### Out

- Credential disclosure, password reset as an impersonation mechanism, or nested impersonation.

## Acceptance criteria

### M1-S08-AC01 — Enter and exit safely

| Given | When | Then |
|---|---|---|
| An authenticated MASTER and an active target user | MASTER starts then exits impersonation | The effective context changes only for the bounded support session and the original MASTER session is restored |

### M1-S08-AC02 — Visible identity

| Given | When | Then |
|---|---|---|
| An active impersonation session | Any admin or tenant view renders | A persistent accessible banner identifies the tenant, effective user, original MASTER, and exit action |

### M1-S08-AC03 — Authorization and decision safety

| Given | When | Then |
|---|---|---|
| A non-MASTER, inactive target, nested attempt, or open D-001 | Impersonation is requested | The operation is denied with no session mutation and no ambiguous audit behavior is implemented |

## Implementation contract

- Server endpoints live under `/api/v1/admin/impersonation` and preserve both identities in security context.
- Admin initiates and exits; dispensary routes entered through the support session show the impersonation banner.
- Add server and UI tests for authorization, expiry, tenant scope, exit restoration, and the resolved D-001 policy.

## Definition of done

- [ ] D-001 is closed and represented exactly.
- [ ] Every acceptance criterion has automated evidence.
- [ ] Target gates pass and the independent story verifier returns `PASS`.
- [ ] Tracker evidence is complete.
