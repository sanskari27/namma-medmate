---
id: M13-S01
epic: M13
title: Hospital module and credit account
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [OWNER, Accountant]
depends_on: [M2-S05, M1-S05]
blocked_by: [D-016]
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#a-entitlement-and-placement
  - docs/product/m13-hospital.md#b-hospital-credit-account-institutional-bill-to
  - docs/product/m13-hospital.md#c-institutional-price-list
---

# M13-S01 — Hospital module and credit account

## User story

As **OWNER or Accountant**, I want to **entitle HOSPITAL on Pro and maintain the institution credit account and price list** so that **ward supply can be billed to the hospital on credit at an institutional price.**

## Scope

### In

- HOSPITAL is a plan-gated tenant module on Pro only; other plans receive PLAN_LIMIT.
- One hospital credit account per tenant: name, GSTIN, stores contact, billing phone/email, terms, credit limit.
- Uniform % off MRP with optional per-product % or flat-paise override; credit price is what the hospital is billed.
- Price-list changes require OWNER or an existing M1-S07 approval; posted invoices are not rewritten.
- Dispensary Hospital Billing account screen and admin/dispensary plan copy name hospital on Pro only.

### Out

- Ward issues, POS patient bills, HIS integration, TPA APIs, a new OTP login factor.

## Acceptance criteria

### M13-S01-AC01 — HOSPITAL is a plan-gated tenant module on Pro only

| Given | When | Then |
|---|---|---|
| A Free, Starter, or Growth tenant calls a HOSPITAL API, or Pro has HOSPITAL | OWNER or staff opens hospital screens or APIs | Non-Pro receives 422 PLAN_LIMIT with an upgrade reason and no hospital rows leak. Pro with HOSPITAL proceeds |

### M13-S01-AC02 — One hospital credit account per tenant holds bill-to identity, terms, and limit

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Accountant with HOSPITAL, completed dependencies, and valid tenant context | They create or update the hospital credit account | Institution name, GSTIN, stores contact, billing phone/email, ON_DEMAND or NET_15/30/45, and credit limit in paise persist tenant-wide |

### M13-S01-AC03 — Uniform % off MRP applies unless a product has its own % or flat override

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER with HOSPITAL and a catalogue product | They set uniform discount and optional per-product rules | Credit price is MRP minus the effective discount in paise; products without a rule use the uniform % |

### M13-S01-AC04 — Price-list changes require OWNER or configured approval and do not rewrite posted invoices

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Accountant with HOSPITAL | They change uniform or per-product hospital pricing | Cashier cannot mutate the list; existing WS invoices keep snapshotted credit prices |

### M13-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The hospital account or price-list operation is attempted | Cross-tenant account is 404, negative limit or discount over MRP is 422, and no partial write remains |

## Implementation contract

### Server

- Hospital account and price list use `/api/v1/hospital/account` and `/api/v1/hospital/prices`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.
- `ModuleCode.HOSPITAL` is tenant + plan-gated; PlanCatalogue Pro includes it.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary Hospital Billing Account & statement + Price list; Pro subscription copy names hospital/IPD.
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
