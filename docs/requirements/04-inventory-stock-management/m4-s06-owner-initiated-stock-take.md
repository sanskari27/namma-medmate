---
id: M4-S06
epic: M4
title: Owner-initiated stock take
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Inventory]
depends_on: [M4-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S06 — Owner-initiated stock take

## User story

As **OWNER or Inventory**, I want to **run an optional physical count and post approved variances** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- Stock takes are initiated by OWNER and are not automatically periodic.
- Expected quantity is snapshotted at start.
- Counts support batches and resumable progress.
- Posting creates physical-count adjustments through approval and is idempotent.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S06-AC01 — Stock takes are initiated by OWNER and are not automatically periodic

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They run an optional physical count and post approved variances | Stock takes are initiated by OWNER and are not automatically periodic. |

### M4-S06-AC02 — Expected quantity is snapshotted at start

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They run an optional physical count and post approved variances | Expected quantity is snapshotted at start. |

### M4-S06-AC03 — Counts support batches and resumable progress

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They run an optional physical count and post approved variances | Counts support batches and resumable progress. |

### M4-S06-AC04 — Posting creates physical-count adjustments through approval and is idempotent

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They run an optional physical count and post approved variances | Posting creates physical-count adjustments through approval and is idempotent. |

### M4-S06-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The run an optional physical count and post approved variances operation is attempted | Overlapping sessions, stale snapshot, duplicate posting, or unauthorized start is rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Sessions, counts, reconciliation, and posting use /api/v1/stock-takes.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides count sheets, variance review, and posting result.
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
