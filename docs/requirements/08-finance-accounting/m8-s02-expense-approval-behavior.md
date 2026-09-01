---
id: M8-S02
epic: M8
title: Expense approval behavior
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Accountant, OWNER, approver]
depends_on: [M8-S01, M1-S07]
blocked_by: [D-004]
sources:
  - docs/product/product-compiled.md#module-8-finance--accounting
  - docs/product/m8-finance.md
---

# M8-S02 — Expense approval behavior

## User story

As **Accountant or OWNER or approver**, I want to **apply the resolved approval policy to expense recording** so that **provide lightweight pharmacy finance, statutory summaries, and decision-ready branch and tenant reporting.**

## Scope

### In

- Thresholds, approvers, posting timing, edits, and rejection follow D-004.
- Pending expenses do not silently affect posted reports.
- Decision history is immutable.
- Approval respects tenant and module permissions.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M8-S02-AC01 — Thresholds, approvers, posting timing, edits, and rejection follow D-004

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They apply the resolved approval policy to expense recording | Thresholds, approvers, posting timing, edits, and rejection follow D-004. |

### M8-S02-AC02 — Pending expenses do not silently affect posted reports

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They apply the resolved approval policy to expense recording | Pending expenses do not silently affect posted reports. |

### M8-S02-AC03 — Decision history is immutable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They apply the resolved approval policy to expense recording | Decision history is immutable. |

### M8-S02-AC04 — Approval respects tenant and module permissions

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They apply the resolved approval policy to expense recording | Approval respects tenant and module permissions. |

### M8-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The apply the resolved approval policy to expense recording operation is attempted | Unauthorized, stale, duplicate, or self-approval violations fail without posting. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Expense approval uses the shared approval workflow and expense state transitions.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary shows pending, approved, rejected, and correction states.
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
