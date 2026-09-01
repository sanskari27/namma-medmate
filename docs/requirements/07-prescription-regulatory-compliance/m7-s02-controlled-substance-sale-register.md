---
id: M7-S02
epic: M7
title: Controlled-substance sale register
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Pharmacist, OWNER]
depends_on: [M6-S04, M6-S07, M4-S07]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-7-prescription--regulatory-compliance-phase-1-scope
  - docs/product/m7-prescriptions.md
---

# M7-S02 — Controlled-substance sale register

## User story

As **Pharmacist or OWNER**, I want to **auto-populate an immutable controlled-drug register from completed sales** so that **track licenses and expose reliable phase 1 pharmacy registers and regulatory exports.**

## Scope

### In

- Entries include product, batch, quantity, prescription reference, patient, pharmacist, and date/time.
- Sales return creates a linked compensating fact.
- Entries are not manually editable.
- Exports support government-prescribed NDPS format and general spreadsheet.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M7-S02-AC01 — Entries include product, batch, quantity, prescription reference, patient, pharmacist, a

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They auto-populate an immutable controlled-drug register from completed sales | Entries include product, batch, quantity, prescription reference, patient, pharmacist, and date/time. |

### M7-S02-AC02 — Sales return creates a linked compensating fact

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They auto-populate an immutable controlled-drug register from completed sales | Sales return creates a linked compensating fact. |

### M7-S02-AC03 — Entries are not manually editable

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They auto-populate an immutable controlled-drug register from completed sales | Entries are not manually editable. |

### M7-S02-AC04 — Exports support government-prescribed NDPS format and general spreadsheet

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They auto-populate an immutable controlled-drug register from completed sales | Exports support government-prescribed NDPS format and general spreadsheet. |

### M7-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The auto-populate an immutable controlled-drug register from completed sales operation is attempted | Incomplete source sale cannot post; unauthorized or cross-tenant export is denied. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Register queries and exports use /api/v1/compliance/controlled-register.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Compliance views filter by branch, period, schedule, product, patient, and pharmacist.
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
