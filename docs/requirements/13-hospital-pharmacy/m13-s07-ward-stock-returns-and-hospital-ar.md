---
id: M13-S07
epic: M13
title: Ward stock, returns, and hospital AR
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Accountant, Inventory]
depends_on: [M13-S06, M8-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#i-ward-stock-and-returns
  - docs/product/m13-hospital.md#b-hospital-credit-account-institutional-bill-to
---

# M13-S07 — Ward stock, returns, and hospital AR

## User story

As **OWNER, Accountant, or Inventory**, I want to **see ward-held stock, take returns, and collect hospital AR** so that **the institution ledger, ageing, and floor quantities stay consistent.**

## Scope

### In

- Ward stock list: ward, medicine, on-hand, credit price, value.
- Record return of unused ward stock to pharmacy branch with a hospital account credit.
- Statement: opening, supplied debit, returns+payments credit, closing; date, particulars, debit, credit, balance.
- Optional flag to show UHID/name on PATIENT_REFILL statement lines.
- Record payment (mode, reference, amount paise); ageing 0–30/31–60/61–90/90+; overdue + send reminder via M10.
- Export statement Excel/CSV and PDF.

### Out

- Patient IPD settlement, changing posted WS line prices.

## Acceptance criteria

### M13-S07-AC01 — Ward stock lists on-hand qty valued at credit price per ward and medicine

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Accountant / Inventory with HOSPITAL after issues | They open Ward stock | On-hand and value match posted issues minus returns; another branch is empty/404 |

### M13-S07-AC02 — A return restocks the pharmacy branch and credits hospital AR

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Accountant / Inventory with HOSPITAL and ward on-hand | They record a return | Pharmacy stock increases, ward on-hand falls, hospital closing balance falls; over-return is 422 |

### M13-S07-AC03 — Statement reconstructs supplied, returns, and payments with running balance

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Accountant with HOSPITAL | They open Account & statement | Debits are WS issues; credits are returns and HP payments; closing equals hospital owes |

### M13-S07-AC04 — Payments, ageing buckets, and overdue reminder are recorded without a TPA API

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Accountant with HOSPITAL | They record a payment or send reminder | Payment reduces AR; ageing uses IST due dates from terms; reminder routes on M10; overpayment is 422 |

### M13-S07-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The stock, return, or payment operation is attempted | Duplicate payment idempotency key does not double-credit; foreign issue return is 404; no partial stock/AR split |

## Implementation contract

### Server

- Ward stock, returns, statement, and payments use `/api/v1/hospital/ward-stock`, `/api/v1/hospital/returns`, `/api/v1/hospital/statement`, `/api/v1/hospital/payments`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Hospital Billing Ward stock, Record return, Account & statement, Record payment, Send reminder.
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
