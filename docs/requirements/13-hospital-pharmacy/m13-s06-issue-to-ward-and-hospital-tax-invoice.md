---
id: M13-S06
epic: M13
title: Issue to ward and hospital tax invoice
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist, Inventory]
depends_on: [M13-S01, M13-S05, M6-S02, M4-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#h-issue-to-ward-hospital-tax-invoice
  - docs/product/m13-hospital.md#j-dual-billing-do-not-collapse
---

# M13-S06 — Issue to ward and hospital tax invoice

## User story

As **OWNER, Pharmacist, or Inventory**, I want to **issue pharmacy stock to a ward and bill the hospital credit account** so that **floor supply is GST-invoiced at the institutional price in one atomic write.**

## Scope

### In

- Ad-hoc issue or link to an APPROVED indent (linking closes the indent to ISSUED).
- Reasons FLOOR_STOCK, CONSUMPTION, PATIENT_REFILL (refill requires UHID).
- Reason is informational; the bill always debits the hospital account at credit price.
- One transaction: pharmacy STOCK_OUT, ward-held qty up, hospital AR debit, tax invoice WS/FY/branch/seq.
- Invoice snapshots MRP, credit price, GST/HSN/batch/expiry, MRP-value vs billed-to-hospital, hospital GSTIN vs pharmacy GSTIN.
- Credit-limit breach blocks the issue with stock and indent unchanged.

### Out

- Patient POS invoices, TPA claim filing, rewriting M6 INV numbers onto ward issues.

## Acceptance criteria

### M13-S06-AC01 — Completing an issue is one transaction of stock, ward qty, AR, and WS invoice

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL, on-hand stock, and a hospital account | They complete a ward issue | Pharmacy stock falls, ward stock rises, hospital AR increases by billed paise, and WS invoice exists; adapter failure rolls all back |

### M13-S06-AC02 — Linked indent is billed and closed; ad-hoc issue is allowed

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL and an APPROVED indent | They issue linked to that indent or with none | Linked indent becomes ISSUED with WS ref; a second issue against it is 409; ad-hoc has no indent |

### M13-S06-AC03 — PATIENT_REFILL requires UHID; other reasons do not

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL | They issue CONSUMPTION, FLOOR_STOCK, or PATIENT_REFILL | Refill without UHID is 422; consumption/floor stock may omit patient |

### M13-S06-AC04 — Tax invoice shows institutional credit price, MRP for hospital patient billing, and NET terms

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL | They view or PDF the WS invoice | Lines include batch, expiry, HSN, GST, qty, MRP, credit price, disc %, amount; footer shows MRP value, billed-to-hospital, terms, both GSTINs |

### M13-S06-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The ward-issue operation is attempted | CREDIT_LIMIT, insufficient stock, foreign batch, or other-tenant indent is rejected with no partial STOCK_OUT or AR debit |

## Implementation contract

### Server

- Ward issues use `/api/v1/hospital/issues` and PDF `/api/v1/hospital/issues/{id}/pdf`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Hospital Billing Issue to ward + New ward issue + invoice overlay.
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
