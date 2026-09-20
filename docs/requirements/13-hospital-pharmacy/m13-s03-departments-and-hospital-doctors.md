---
id: M13-S03
epic: M13
title: Departments and hospital doctors
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist]
depends_on: [M13-S01, M3-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#e-departments-and-doctors
---

# M13-S03 — Departments and hospital doctors

## User story

As **OWNER or Pharmacist**, I want to **maintain hospital departments and a doctor directory** so that **admissions and OPD Rx can name an attending or prescriber without giving doctors a login.**

## Scope

### In

- Department: name, type OPD/IPD/DIAGNOSTIC, head doctor.
- Doctor directory fields from the hospital source, including status AVAILABLE/ON_LEAVE/VISITING and consultation fee in paise.
- No doctor login.
- When medical registration number matches an existing M3 doctor on the tenant, reuse that reference instead of duplicating.

### Out

- Doctor portal, consult billing to patients, HIS credentialing.

## Acceptance criteria

### M13-S03-AC01 — Departments capture name, OPD/IPD/DIAGNOSTIC type, and head doctor

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They create or update a department | Name, type, and optional head doctor persist tenant-scoped |

### M13-S03-AC02 — Doctor directory stores profile, registration, consult slot, fee, and status

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They add or edit a doctor | Required name plus qualification, specialty, department, reg. no., gender, experience, phone, email, OPD room, days/hours, fee paise, status, languages, and notes persist |

### M13-S03-AC03 — Doctors have no login in Phase 1

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist with HOSPITAL | They maintain the hospital doctor directory | No password, PIN, or session is issued for the doctor |

### M13-S03-AC04 — Matching medical registration number reuses the tenant M3 doctor reference

| Given | When | Then |
|---|---|---|
| An M3 doctor already exists on the tenant with the same registration number | They add a hospital doctor with that number | One doctor identity is reused; a second unlinked row is rejected with 409 |

### M13-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The department or doctor operation is attempted | Foreign-tenant doctor is 404, missing name is 400, and no partial write remains |

## Implementation contract

### Server

- Department and doctor resources use `/api/v1/hospital/departments` and `/api/v1/hospital/doctors`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Departments and Doctors screens with Add/Edit doctor dialog.
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
