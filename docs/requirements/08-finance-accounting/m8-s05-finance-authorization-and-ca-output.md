---
id: M8-S05
epic: M8
title: Finance authorization and CA output
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Accountant, OWNER]
depends_on: [M8-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-8-finance--accounting
  - docs/product/m8-finance.md
---

# M8-S05 — Finance authorization and CA output

## User story

As **Accountant or OWNER**, I want to **enforce finance visibility and create a categorized CA-shareable PDF** so that **provide lightweight pharmacy finance, statutory summaries, and decision-ready branch and tenant reporting.**

## Scope

### In

- Only Accountant and OWNER access finance reports.
- OWNER can consolidate and drill down; Accountant sees assigned branches.
- CA output contains categorized financial and sales data, not unrestricted personal medical data.
- Export is audited.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M8-S05-AC01 — Only Accountant and OWNER access finance reports

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce finance visibility and create a categorized CA-shareable PDF | Only Accountant and OWNER access finance reports. |

### M8-S05-AC02 — OWNER can consolidate and drill down

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce finance visibility and create a categorized CA-shareable PDF | OWNER can consolidate and drill down; Accountant sees assigned branches. |

### M8-S05-AC03 — CA output contains categorized financial and sales data, not unrestricted personal medic

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce finance visibility and create a categorized CA-shareable PDF | CA output contains categorized financial and sales data, not unrestricted personal medical data. |

### M8-S05-AC04 — Export is audited

| Given | When | Then |
|---|---|---|
| A request or event initiated by Accountant / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They enforce finance visibility and create a categorized CA-shareable PDF | Export is audited. |

### M8-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The enforce finance visibility and create a categorized CA-shareable PDF operation is attempted | Cashier, unassigned branch, cross-tenant, or over-broad export requests reveal no data. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Authorization wraps all /api/v1/finance resources and CA export.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Finance navigation and actions disappear or show denied states consistently.
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
