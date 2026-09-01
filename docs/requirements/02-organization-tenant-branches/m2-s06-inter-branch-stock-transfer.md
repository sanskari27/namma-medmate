---
id: M2-S06
epic: M2
title: Inter-branch stock transfer
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Inventory]
depends_on: [M2-S04, M4-S03, M1-S07]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-2-organization--tenant--branch-structure
  - docs/product/m2-tenancy.md
---

# M2-S06 — Inter-branch stock transfer

## User story

As **OWNER or Inventory**, I want to **move stock using sender push or receiver pull with receiving confirmation** so that **onboard verified pharmacy tenants, administer lifecycle and plans, and operate isolated branches.**

## Scope

### In

- Either branch may initiate.
- The receiving branch Inventory role or OWNER confirms completion.
- Stock stays branch-isolated until confirmed.
- Transfer state and quantities are auditable and cannot exceed available stock.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M2-S06-AC01 — Either branch may initiate

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They move stock using sender push or receiver pull with receiving confirmation | Either branch may initiate. |

### M2-S06-AC02 — The receiving branch Inventory role or OWNER confirms completion

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They move stock using sender push or receiver pull with receiving confirmation | The receiving branch Inventory role or OWNER confirms completion. |

### M2-S06-AC03 — Stock stays branch-isolated until confirmed

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They move stock using sender push or receiver pull with receiving confirmation | Stock stays branch-isolated until confirmed. |

### M2-S06-AC04 — Transfer state and quantities are auditable and cannot exceed available stock

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They move stock using sender push or receiver pull with receiving confirmation | Transfer state and quantities are auditable and cannot exceed available stock. |

### M2-S06-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The move stock using sender push or receiver pull with receiving confirmation operation is attempted | Concurrent reservation, insufficient stock, same-branch, cross-tenant, duplicate confirmation, and unauthorized actions fail safely. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Transfer requests and state transitions use /api/v1/stock-transfers.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides outgoing, incoming, confirmation, rejection, and history views.
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
