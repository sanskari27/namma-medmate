---
id: M13
product_module: 13
title: Hospital Pharmacy — IPD, Ward Supply & Institutional Billing
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md
---

# M13 — Hospital Pharmacy — IPD, Ward Supply & Institutional Billing

## Outcome

Let a Pro hospital pharmacy run IPD occupancy, ward requisitions, institutional
credit billing, and patient ward/emergency/OPD sales from the dispensary
dashboard without becoming a HIS.

## Actors

- OWNER
- Pharmacist
- Inventory
- Cashier
- Accountant

## Product capabilities covered

- HOSPITAL module entitlement (Pro)
- Hospital credit account and institutional price list
- Wards, beds, occupancy
- Departments and hospital doctors
- IPD admission, UHID, payer snapshot
- Ward indents
- Issue to ward and hospital tax invoice
- Ward stock, returns, statement, payments
- POS ward / emergency / OPD sources
- Patient IPD settlement, Insurance/TPA snapshot, discharge
- Hospital-aware sales register

## Stories

| Order | Story | Target apps | Depends on | Decision blockers |
|---:|---|---|---|---|
| 1 | [M13-S01 — Hospital module and credit account](m13-s01-hospital-module-and-credit-account.md) | server + dispensary + admin | M2-S05, M1-S05 | D-016 |
| 2 | [M13-S02 — Wards, beds, and occupancy](m13-s02-wards-beds-and-occupancy.md) | server + dispensary | M13-S01, M2-S04 | — |
| 3 | [M13-S03 — Departments and hospital doctors](m13-s03-departments-and-hospital-doctors.md) | server + dispensary | M13-S01, M3-S04 | — |
| 4 | [M13-S04 — IPD admission and UHID](m13-s04-ipd-admission-and-uhid.md) | server + dispensary | M13-S02, M13-S03, M3-S01 | — |
| 5 | [M13-S05 — Ward indents](m13-s05-ward-indents.md) | server + dispensary | M13-S02, M4-S03 | — |
| 6 | [M13-S06 — Issue to ward and hospital tax invoice](m13-s06-issue-to-ward-and-hospital-tax-invoice.md) | server + dispensary | M13-S01, M13-S05, M6-S02, M4-S03 | — |
| 7 | [M13-S07 — Ward stock, returns, and hospital AR](m13-s07-ward-stock-returns-and-hospital-ar.md) | server + dispensary | M13-S06, M8-S03 | — |
| 8 | [M13-S08 — POS hospital sale sources](m13-s08-pos-hospital-sale-sources.md) | server + dispensary | M13-S04, M6-S05 | — |
| 9 | [M13-S09 — Active-patient settlement and discharge](m13-s09-active-patient-settlement-and-discharge.md) | server + dispensary | M13-S08, M13-S04 | — |
| 10 | [M13-S10 — Hospital sales register](m13-s10-hospital-sales-register.md) | server + dispensary | M13-S08, M13-S09, M6-S08 | — |

## Boundaries

- Product behavior outside the cited sources is not part of this epic.
- A story with an open decision is not implementable.
- HIS/EMR, doctor/patient login, TPA claim APIs, and Phase 2 ecommerce stay out.
- Patient IPD invoices and hospital credit issues remain two ledgers.

## Completion rule

This epic is complete only when every Phase 1 story is `done`, every required gate passes, and no applicable decision remains open.
