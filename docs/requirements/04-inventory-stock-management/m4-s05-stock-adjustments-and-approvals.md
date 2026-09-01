---
id: M4-S05
epic: M4
title: Stock adjustments and approvals
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Inventory, OWNER, approver]
depends_on: [M4-S03, M1-S07]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-4-erp--inventory--stock-management
  - docs/product/m4-inventory.md
---

# M4-S05 — Stock adjustments and approvals

## User story

As **Inventory or OWNER or approver**, I want to **adjust stock for approved business reasons with full traceability** so that **control tenant product data and accurate branch, batch, expiry, and regulated stock.**

## Scope

### In

- Reasons are damage/breakage, expiry write-off, theft/loss, physical-count correction, and sample/free-goods removal.
- Every adjustment follows its configured approval workflow.
- Stock changes only after approval.
- Reason, quantity, batch, actor, approver, and timestamps are immutable.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M4-S05-AC01 — Reasons are damage/breakage, expiry write-off, theft/loss, physical-count correction, an

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They adjust stock for approved business reasons with full traceability | Reasons are damage/breakage, expiry write-off, theft/loss, physical-count correction, and sample/free-goods removal. |

### M4-S05-AC02 — Every adjustment follows its configured approval workflow

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They adjust stock for approved business reasons with full traceability | Every adjustment follows its configured approval workflow. |

### M4-S05-AC03 — Stock changes only after approval

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They adjust stock for approved business reasons with full traceability | Stock changes only after approval. |

### M4-S05-AC04 — Reason, quantity, batch, actor, approver, and timestamps are immutable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Inventory / OWNER / approver with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They adjust stock for approved business reasons with full traceability | Reason, quantity, batch, actor, approver, and timestamps are immutable. |

### M4-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The adjust stock for approved business reasons with full traceability operation is attempted | Unknown reason, overdraw, self-approval violation, stale request, or duplicate decision fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Adjustment requests and decisions use /api/v1/inventory/adjustments.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary exposes create, pending approval, decision, and history states.
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
