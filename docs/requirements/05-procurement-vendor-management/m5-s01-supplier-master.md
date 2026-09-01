---
id: M5-S01
epic: M5
title: Supplier master
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Inventory, Accountant]
depends_on: [M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-5-erp--procurement--vendor-management
  - docs/product/m5-procurement.md
---

# M5-S01 — Supplier master

## User story

As **OWNER or Inventory or Accountant**, I want to **maintain tenant-wide suppliers used independently by branches** so that **procure branch stock through controlled supplier, po, receipt, qc, return, and payable flows.**

## Scope

### In

- Supplier fields cover legal/trade identity, type, GST/PAN/licenses, contacts, address, terms, credit, bank/UPI, categories, status, notes, and timestamps.
- Suppliers are shared across tenant branches.
- PO placement and relationship context remain branch-specific.
- No supplier rating is introduced.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M5-S01-AC01 — Supplier fields cover legal/trade identity, type, GST/PAN/licenses, contacts, address, t

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain tenant-wide suppliers used independently by branches | Supplier fields cover legal/trade identity, type, GST/PAN/licenses, contacts, address, terms, credit, bank/UPI, categories, status, notes, and timestamps. |

### M5-S01-AC02 — Suppliers are shared across tenant branches

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain tenant-wide suppliers used independently by branches | Suppliers are shared across tenant branches. |

### M5-S01-AC03 — PO placement and relationship context remain branch-specific

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain tenant-wide suppliers used independently by branches | PO placement and relationship context remain branch-specific. |

### M5-S01-AC04 — No supplier rating is introduced

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Inventory / Accountant with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They maintain tenant-wide suppliers used independently by branches | No supplier rating is introduced. |

### M5-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The maintain tenant-wide suppliers used independently by branches operation is attempted | Duplicate GSTIN/code, invalid license dates, unsafe bank updates, or cross-tenant access fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Supplier search and CRUD use /api/v1/suppliers.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides supplier detail, license status, terms, and branch procurement history.
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
