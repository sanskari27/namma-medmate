---
id: M13-S02
epic: M13
title: Wards, beds, and occupancy
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist]
depends_on: [M13-S01, M2-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#d-wards-beds-occupancy
---

# M13-S02 — Wards, beds, and occupancy

## User story

As **OWNER or Pharmacist**, I want to **maintain branch wards and a live bed map** so that **in-patient occupancy and dispensing have a real bed to attach to.**

## Scope

### In

- Ward master: name, code/bed prefix, floor, category GENERAL/ICU/PEDIATRIC/MATERNITY/SURGICAL/PRIVATE, capacity, nurse in-charge.
- Creating a ward allocates sequential free beds `{CODE}-1` … `{CODE}-N`.
- Occupancy KPIs and a bed map grouped by ward.
- Occupied beds cannot be double-booked.

### Out

- Admission clinical charting, HIS bed sync, hospital credit invoices.

## Acceptance criteria

### M13-S02-AC01 — Ward master captures name, code, floor, category, capacity, and nurse in-charge

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL and an active branch | They add or edit a ward | Name, code/prefix, floor, category, bed capacity, and nurse in-charge persist on that tenant+branch |

### M13-S02-AC02 — Creating a ward allocates sequential free beds from the code prefix

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They add a ward with capacity N | N free beds `{CODE}-1` through `{CODE}-N` exist and appear on the bed map |

### M13-S02-AC03 — Occupancy KPIs and the bed map group free versus occupied beds by ward

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They open IPD · Wards | Totals show ward count, total/occupied/free beds, occupancy %, and admitted count; each ward lists its beds |

### M13-S02-AC04 — Occupied beds cannot be double-booked

| Given | When | Then |
|---|---|---|
| A bed is already occupied on this branch | A second admit or assign targets that bed | The write is 409 or 422 BED_OCCUPIED and occupancy is unchanged |

### M13-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The ward or bed operation is attempted | Duplicate code, zero capacity, foreign branch ward, or cashier-without-HOSPITAL fails with no disclosure and no partial beds |

## Implementation contract

### Server

- Ward and bed resources use `/api/v1/hospital/wards`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary IPD · Wards bed map + Manage wards.
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
