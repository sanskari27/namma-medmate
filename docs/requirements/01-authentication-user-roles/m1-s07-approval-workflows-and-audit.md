---
id: M1-S07
epic: M1
title: Approval workflows and audit
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [authorized role, approver, MASTER]
depends_on: [M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S07 — Approval workflows and audit

## User story

As **authorized role or approver or MASTER**, I want to **configure module approval rules and retain compliant action history** so that **secure tenant-aware access, staff lifecycle, role authorization, approvals, and auditable activity.**

## Scope

### In

- Workflow-builder access is permission-controlled, not owner-only.
- Thresholds and approver roles are configured per functional module.
- Login and business actions retain user, tenant, branch, timestamp, action, and outcome for 90 days.
- Approval decisions and audit entries preserve the acting identity and original business context.
- Login events additionally record success/failure and request-origin IP,
  user-agent, and session identifier when available, without credentials or tokens.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M1-S07-AC01 — Workflow-builder access is permission-controlled, not owner-only

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized role / approver / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure module approval rules and retain compliant action history | Workflow-builder access is permission-controlled, not owner-only. |

### M1-S07-AC02 — Thresholds and approver roles are configured per functional module

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized role / approver / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure module approval rules and retain compliant action history | Thresholds and approver roles are configured per functional module. |

### M1-S07-AC03 — Login and business actions retain user, tenant, branch, timestamp, action, and outcome f

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized role / approver / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure module approval rules and retain compliant action history | Login and business actions retain user, tenant, branch, timestamp, action, and outcome for 90 days. |

### M1-S07-AC04 — Approval decisions and audit entries preserve the acting identity and original business 

| Given | When | Then |
|---|---|---|
| A request or event initiated by authorized role / approver / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They configure module approval rules and retain compliant action history | Approval decisions and audit entries preserve the acting identity and original business context. |

### M1-S07-AC05 — Login origin without secrets

| Given | When | Then |
|---|---|---|
| A login succeeds or fails | The login audit event is stored | It records timestamp, outcome, attempted identity, authenticated user when known, source IP, user-agent, and session identifier when available, and excludes passwords, PINs, and tokens |

### M1-S07-AC06 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The configure module approval rules and retain compliant action history operation is attempted | Self-approval when prohibited, stale decisions, changed thresholds, unauthorized export, and cross-tenant reads are rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Approval definitions, requests, decisions, and audit queries use /api/v1/approvals and /api/v1/audit.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Target apps expose configuration, pending approvals, and authorized audit views.
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
