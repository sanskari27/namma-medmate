---
id: M13-S08
epic: M13
title: POS hospital sale sources
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Cashier, Pharmacist]
depends_on: [M13-S04, M6-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#k-pos-sale-sources
  - docs/product/m13-hospital.md#j-dual-billing-do-not-collapse
---

# M13-S08 — POS hospital sale sources

## User story

As **Cashier or Pharmacist**, I want to **bill OPD, ward, and emergency patients on the existing till** so that **patient invoices stay on the INV ledger and do not debit hospital AR.**

## Scope

### In

- Sale sources COUNTER (unchanged), OPD_RX, WARD, EMERGENCY.
- Ward sale from occupied-bed Bill medicines prefills name, phone, ward, UHID.
- Ward requires UHID + ward for admitted patients; Emergency requires UHID, ward optional.
- OPD_RX may attach a hospital doctor as prescriber.
- Payment modes include existing M6 modes plus Insurance/TPA snapshot (no TPA API).
- Completed patient invoices do not post hospital WS issues or hospital AR.

### Out

- Discharge (M13-S09), ward-floor issues (M13-S06), Online source (D-008).

## Acceptance criteria

### M13-S08-AC01 — Till sale sources include Counter, OPD Rx, Ward, and Emergency

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with SALES and HOSPITAL | They start or complete a bill | Source is stored on the invoice; Counter remains valid without UHID |

### M13-S08-AC02 — Occupied-bed Bill medicines opens a Ward draft with UHID and ward prefilled

| Given | When | Then |
|---|---|---|
| An ACTIVE admission exists | Pharmacist chooses Bill medicines | POS source is WARD with name, phone if any, UHID, and ward; completing creates INV not WS |

### M13-S08-AC03 — Ward requires UHID and ward; Emergency requires UHID

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with HOSPITAL | They complete WARD or EMERGENCY without required fields | 422 names the missing UHID/ward; casualty without a bed is allowed |

### M13-S08-AC04 — Patient invoices never debit the hospital credit account

| Given | When | Then |
|---|---|---|
| A request or event initiated by Cashier / Pharmacist with HOSPITAL | They complete a Ward or Emergency INV | Hospital AR and WS sequence are unchanged; customer/khata rules from M6 still apply when used |

### M13-S08-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The hospital-source POS operation is attempted | Foreign UHID is 404, discharged admission cannot take a new Ward bill, and no partial complete remains |

## Implementation contract

### Server

- Extend `/api/v1/sales/invoices` with saleSource and hospital fields; do not add a second POS stack.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary `/pos` sale-source control + occupied-bed Bill medicines.
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
