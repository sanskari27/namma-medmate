---
id: M13-S10
epic: M13
title: Hospital sales register
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist, Accountant]
depends_on: [M13-S08, M13-S09, M6-S08]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#m-sales-register
---

# M13-S10 — Hospital sales register

## User story

As **OWNER, Pharmacist, or Accountant**, I want to **filter and export patient sales by source, payment, insurer, and ward** so that **OPD, counter, IPD, and casualty mix is visible without mixing in WS hospital issues.**

## Scope

### In

- Register of M6 INV invoices with hospital-aware source tiles: OPD Prescription, Pharmacy Counter, Ward/IPD, Emergency/Casualty.
- Online tile is omitted or empty (D-008 Phase 2).
- Filters: period, source, payment mode including Insurance/TPA, paid/unpaid, insurer, ward, search.
- Totals: count, revenue, paid, unpaid, insurance amount.
- CSV/PDF export; WS hospital issues are not rows here.

### Out

- Hospital AR statement (M13-S07), scheduled email delivery.

## Acceptance criteria

### M13-S10-AC01 — Source tiles count OPD, Counter, Ward, and Emergency patient invoices

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Accountant with HOSPITAL | They open Sales Register | Tile counts and paise match completed INV by source on this branch |

### M13-S10-AC02 — Filters include payment mode, paid/unpaid, insurer, and ward

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Accountant with HOSPITAL | They apply filters | Insurance/TPA and ward filters return only matching INV rows; WS issues never appear |

### M13-S10-AC03 — Totals show revenue, paid, unpaid, and insurance amount in paise

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Accountant with HOSPITAL | They load the register | Totals equal the filtered row set; IST period bounds are respected |

### M13-S10-AC04 — CSV and PDF export the same filtered rows

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Accountant with HOSPITAL | They export | Bytes match the on-screen filter; audit records the export |

### M13-S10-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The register or export operation is attempted | Foreign branch is 404, cashier without HOSPITAL/REPORTING is 403, and no other-tenant invoice is listed |

## Implementation contract

### Server

- Register uses `/api/v1/hospital/sales-register` plus `/export`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Hospital Sales Register with tiles, filters, table, Excel/PDF.
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
