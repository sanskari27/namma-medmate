---
id: M3-S06
epic: M3
title: Refill reminders and segmentation
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

# M3-S06 — Refill reminders and segmentation

## User story

As **OWNER or authorized staff**, I want to **manage refill schedules and customer tags** so that **staff can identify due refills and reusable customer segments.**

## Scope

### In

- Refill due dates are per customer and medicine and may be customized.
- Tags support tenant-defined segmentation.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S06-AC01 — Refill due dates are per customer and medicine and may be customized

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage refill schedules and customer tags | Refill due dates are per customer and medicine and may be customized. |

### M3-S06-AC02 — Tags support tenant-defined segmentation

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage refill schedules and customer tags | Tags support tenant-defined segmentation. |

### M3-S06-AC03 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The refill or tag operation is attempted | Invalid schedules, duplicate tags, or unauthorized changes are rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Refill and tag operations use customer subresources under `/api/v1/customers`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Customer detail exposes refill schedules and tags.
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
