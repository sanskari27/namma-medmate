---
id: M7-S03
epic: M7
title: Compliance dashboard and Phase 1 registers
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, authorized role]
depends_on: [M4-S04, M4-S05, M4-S06, M5-S06, M6-S07, M7-S01, M7-S02]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-7-prescription--regulatory-compliance-phase-1-scope
  - docs/product/m7-prescriptions.md
---

# M7-S03 — Compliance dashboard and Phase 1 registers

## User story

As **OWNER or authorized role**, I want to **view and export every Phase 1 regulatory register from source transactions** so that **track licenses and expose reliable phase 1 pharmacy registers and regulatory exports.**

## Scope

### In

- The dashboard is separate from business reports.
- It includes all registers listed in Module 7: H1 sales, purchase, supplier license, license expiry, controlled stock, batch stock, expired/damaged, supplier return, stock loss/verification, near-expiry, traceability, and supplier/product purchase-sale views.
- Exports are one-click, filtered, and generated from existing facts.
- Permission may be granted module-wide to other roles.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M7-S03-AC01 — The dashboard is separate from business reports

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view and export every Phase 1 regulatory register from source transactions | The dashboard is separate from business reports. |

### M7-S03-AC02 — It includes all registers listed in Module 7

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view and export every Phase 1 regulatory register from source transactions | It includes all registers listed in Module 7: H1 sales, purchase, supplier license, license expiry, controlled stock, batch stock, expired/damaged, supplier return, stock loss/verification, near-expiry, traceability, and supplier/product purchase-sale views. |

### M7-S03-AC03 — Exports are one-click, filtered, and generated from existing facts

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view and export every Phase 1 regulatory register from source transactions | Exports are one-click, filtered, and generated from existing facts. |

### M7-S03-AC04 — Permission may be granted module-wide to other roles

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They view and export every Phase 1 regulatory register from source transactions | Permission may be granted module-wide to other roles. |

### M7-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The view and export every Phase 1 regulatory register from source transactions operation is attempted | Unsupported range, excessive export, unauthorized role, or inconsistent source data returns a safe error. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Dashboard queries and exports use /api/v1/compliance/reports.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides register cards, filters, empty states, and PDF/spreadsheet downloads.
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
