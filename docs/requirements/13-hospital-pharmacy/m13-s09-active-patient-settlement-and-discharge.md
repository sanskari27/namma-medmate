---
id: M13-S09
epic: M13
title: Active-patient settlement and discharge
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist, Cashier]
depends_on: [M13-S08, M13-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#l-active-patients-settlement-discharge
---

# M13-S09 — Active-patient settlement and discharge

## User story

As **OWNER, Pharmacist, or Cashier**, I want to **settle unpaid ward and emergency bills and discharge the bed** so that **occupancy frees only after patient invoices are handled.**

## Scope

### In

- Active Patients list: ACTIVE admissions and casualty with outstanding INV bills; All in-patients view; search UHID/name/ward.
- Drawer totals and invoice table; settle N unpaid bills with Cash/UPI/Card/Insurance/TPA in one action.
- Occupied-bed Final bill & discharge: settle outstanding then set DISCHARGED and free the bed.
- Casualty without a bed remains listable until bills are settled.

### Out

- Hospital WS AR settlement, TPA claim submission.

## Acceptance criteria

### M13-S09-AC01 — Active Patients lists UHID, ward or casualty, unpaid INV totals

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Cashier with HOSPITAL | They open Active Patients | Active-unsettled and all-in-patients views show branch-scoped admissions; search filters UHID, name, ward |

### M13-S09-AC02 — Unpaid patient bills can be settled together with Cash, UPI, Card, or Insurance/TPA

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Cashier with HOSPITAL and unpaid Ward/Emergency INVs | They settle the outstanding | Invoices become paid; Insurance/TPA snapshots insurer/policy; hospital AR is unchanged |

### M13-S09-AC03 — Discharge frees the bed only after outstanding patient bills are settled or explicitly included

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with an ACTIVE occupied admission | They discharge | With outstanding, discharge is 422 until settled in the same request; success sets DISCHARGED and bed Free |

### M13-S09-AC04 — Casualty without a bed can be settled without a ward assign

| Given | When | Then |
|---|---|---|
| An EMERGENCY unpaid invoice exists with UHID and no bed | Staff open Active Patients | The casualty row appears; settlement does not require a ward |

### M13-S09-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The settle or discharge operation is attempted | Concurrent discharge vs new Ward bill is 409; foreign UHID is 404; no half-paid set and still-occupied bed |

## Implementation contract

### Server

- Settlement and discharge use `/api/v1/hospital/admissions/{id}/settle` and `/discharge`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Active Patients + occupied-bed Final bill & discharge.
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
