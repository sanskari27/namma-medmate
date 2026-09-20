---
id: M13-S04
epic: M13
title: IPD admission and UHID
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist]
depends_on: [M13-S02, M13-S03, M3-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#f-ipd-admission
---

# M13-S04 — IPD admission and UHID

## User story

As **OWNER or Pharmacist**, I want to **admit a patient to a free bed with a tenant-unique UHID** so that **ward occupancy, attending context, and later bills attach to one in-patient stay.**

## Scope

### In

- Admit requires name, UHID, ward, and a free bed; optional phone, age, gender, attending doctor, diagnosis, payer SELF_PAY or INSURANCE_TPA with insurer + policy.
- UHID is unique per tenant; the server suggests the next value.
- Admit occupies the bed and sets admission ACTIVE with admitted-at UTC.
- Phone may bind an existing M3 customer; CRM profile is not required.
- Patients have no login.

### Out

- Discharge settlement (M13-S09), POS bills, HIS ADT feed.

## Acceptance criteria

### M13-S04-AC01 — Admit requires name, UHID, ward, and a free bed

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL and a free bed | They admit a patient | Name, UHID, ward, and bed are stored; missing required fields are 400; occupied bed is rejected |

### M13-S04-AC02 — UHID is unique per tenant and the server can suggest the next identifier

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They open admit or submit a duplicate UHID | The form can prefill the next UHID; in-tenant duplicate is 409; other-tenant UHID is 404 |

### M13-S04-AC03 — Optional payer INSURANCE_TPA snapshots insurer name and policy number

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They admit with SELF_PAY or INSURANCE_TPA | Self-pay stores no policy; TPA without insurer/policy is 422; snapshots persist on the admission |

### M13-S04-AC04 — Patients have no login and CRM is optional

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They admit with or without a known customer phone | No patient session is created; matching phone may link M3; missing CRM still admits |

### M13-S04-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The admit operation is attempted | Concurrent double-book of the same bed leaves one occupant; foreign ward/doctor is 404; no partial occupancy remains |

## Implementation contract

### Server

- Admission resources use `/api/v1/hospital/admissions`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Admit patient dialog, Admissions list, occupied-bed header (UHID, ward, attending, diagnosis, payer).
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
