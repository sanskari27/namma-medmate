# Requirement Doc: Customers (`customers`)

**Status:** v1  
**Plan gate:** Starter  
**Surface:** Pharmacy Partner Console  
**Owner module:** `modules/customers/{ui,api,docs}`  
**Canonical entity:** Customer  
**Stack:** React + TypeScript AWS Lambdas  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.6, §2.3 (allergy/consent), §8 Customer; `docs/requirements/00-glossary.md`; `docs/requirements/00-decomposition-plan.md`

---

## 1. Summary

This module is the tenant-scoped named-customer directory and Customer 360 for one pharmacy location. Walk-ins still bill on Free without a profile. Named CRM — search, KPIs, clinical profile, allergy store, consent flags, credit-limit field, and purchase history — starts here on Starter.

The module stores the Customer record (phone unique per tenant when named), allergies, address, age, gender, blood group, conditions, and DPDP consent flags. Loyalty **lots** are owned by `crm`; this module only **displays** the current points balance. Khata outstanding, ageing, repayment, and WhatsApp remind are owned by `khata` and **embedded** on Customer 360. POS owns the allergy acknowledge prompt at charge; this module stores allergies and exposes `getCustomerAllergies` plus a cart-SKU match helper.

v1 named customers are created at POS or on this screen. There is no bulk customer import in v1.

---

## 2. Scope (in / out)

### In scope

- Named Customer create / read / update at this screen and via API used by POS (and later kiosk identify).
- Phone uniqueness per tenant for named customers.
- Clinical profile: allergies, address, age, gender, blood group, conditions.
- DPDP consent flags (marketing, refill). Owner may clear marketing consent. Transactional bill history is retained for GST.
- Customer list: search, sort (Top spenders / Most orders / Recent), export Excel + PDF.
- KPI cards: named customers, lifetime sales, repeat customers, patients on chronic Rx, credit outstanding.
- Table columns: Rx tag, Due tag, phone, order count, units, last visit, loyalty points (display), lifetime value, credit limit.
- Customer 360: summary, embedded khata (repayment + reminder + credit limit + full ledger via `khata`), purchase history, **New sale** shortcut to POS with this customer selected.
- `GET` allergies and `match` of stored allergies against cart SKUs. POS/kiosk own the on-screen prompt.
- Credit-limit **field** on Customer; Owner sets it. `khata` enforces it at charge.
- Plan gating: Starter (and above). Expired paid plan locks this module; data is retained.
- Tenant + `location_id` on every query. PII is tenant-scoped.

### Out of scope

- Walk-in profiles, walk-in allergy checks, walk-in khata (walk-in cannot take credit).
- Bulk customer import / go-live CSV of customers (not v1).
- Loyalty lot earn/burn/expiry/redeem (owned by `crm`).
- Khata ledger postings, ageing math, repayment cash, WhatsApp remind send (owned by `khata`; UI embeds).
- POS charge, invoice, hold, GST breakup (owned by `pos-billing`).
- Campaigns, segments, RFM, feedback (owned by `crm`).
- Prescription queue and Rx images (owned by `prescriptions`).
- WhatsApp send (owned by `whatsapp`). This module never talks to Meta.
- Customer debit notes, UPI/card GMV, extra branches, hospital/IPD.
- HQ tenant CRM (that is `admin-saas-crm`).
- Deleting a Customer in a way that erases GST bill history.

---

## 3. Dependencies

| Module                           | Why                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenancy`                        | Tenant + `location_id`. All Customer rows belong to that shop.                                                                                    |
| `plan-gating`                    | Starter required for console routes and APIs. Read-only gate.                                                                                     |
| `auth` / `manage-users`          | Session; role/permission `customers`. Owner always allowed.                                                                                       |
| `audit`                          | Append-only log for create/update, consent change, credit-limit change.                                                                           |
| `khata`                          | 360 embeds outstanding, due tag, repayment, remind, ledger, credit-limit check at charge. Credit outstanding KPI.                                 |
| `crm`                            | Loyalty points **display** (lots owned by `crm`).                                                                                                 |
| `pos-billing`                    | Creates named customers at the counter; New sale shortcut; purchase history from posted Bills; lifetime sales / order count / units / last visit. |
| `prescriptions`                  | Rx tag / chronic-Rx KPI input (linked Rx), not stored as queue here.                                                                              |
| `inventory` / `master-catalogue` | Allergy match against cart SKU name and composition.                                                                                              |
| `whatsapp`                       | Not called directly by this module. Khata remind and CRM campaigns go through those modules → `whatsapp`.                                         |
| `kiosk`                          | May attach an existing named customer after phone + OTP (kiosk module). Allergy check uses this store.                                            |

This module does **not** depend on `khata` or `crm` to **create** a Customer. Display fields that those modules own are read through their published contracts (or denormalized projections they update).

---

## 4. Functional Requirements

**FR-1:** The system shall require an active Starter (or higher) plan for every `customers` console route and API; if the plan is Free or expired-as-Free, the route shall show the plan-gating paywall and the API shall return `403 PLAN_REQUIRED` with `required_plan: "starter"`. Customer rows already stored shall be retained.

**FR-2:** The system shall scope every Customer query, mutation, and export to the authenticated pharmacy tenant and the `location_id` on the request. A staff session from another tenant shall not read or write this PII.

**FR-3:** The system shall persist a named Customer only when a phone number is provided. Phone shall be unique per tenant among named customers (normalized: digits only, Indian 10-digit after stripping `+91` / leading `0` as needed). Duplicate create or update shall return `409 PHONE_TAKEN`.

**FR-4:** The system shall not create a Customer record for a walk-in. A bill with no `customer_id` is a walk-in: no profile, no allergy check, and the customer cannot be used for khata (enforced by `khata` / `pos-billing`).

**FR-5:** The system shall allow Owner, Manager, Pharmacist, and Cashier (and any user granted the `customers` or POS customer-create permission) to create a named Customer from this screen or from POS, with: `name` (required), `phone` (required), optional `address`, `age`, `gender`, `blood_group`, `conditions[]`, `allergies[]`, `marketing_consent`, `refill_consent`, optional `credit_limit` (Owner-only write; see FR-18).

**FR-6:** The system shall allow the same authorized roles to update those profile fields. Changing phone shall re-apply FR-3 uniqueness. Clearing `name` shall be rejected (`400 NAME_REQUIRED`).

**FR-7:** The system shall store allergies as a tenant-scoped list of strings on the Customer (trimmed, case-preserved; match is case-insensitive). Empty list means no allergies on file.

**FR-8:** The system shall expose `getCustomerAllergies(customerId)` returning that list (or `404` if the customer does not exist in this tenant/location). Walk-in / missing `customer_id` is not a call into this API; callers must not invent a profile.

**FR-9:** The system shall expose a match operation: given `customer_id` and cart `sku_ids[]`, return each allergy that case-insensitive substring-matches the SKU’s `name` or `composition` (salt). POS and kiosk own the acknowledge UI; this module does not prompt and does not block charge.

**FR-10:** The system shall store DPDP consent booleans `marketing_consent` and `refill_consent` (default `false` until explicitly set true). Campaigns (`crm`) shall read these flags; this module is the source of truth.

**FR-11:** The system shall allow the Owner to set `marketing_consent` to `false` (delete marketing consent) without deleting the Customer, bills, khata, or GST invoice history. The API shall be `POST .../consent/marketing/revoke` (idempotent). Refill consent is unchanged unless the Owner also updates it.

**FR-12:** The system shall retain transactional bill history for GST when consent is revoked or the 360 is edited. There is no “erase all purchases” action in this module.

**FR-13:** The system shall show KPI cards on the customers home for the current location: (a) count of named customers; (b) lifetime sales = sum of posted Bill GST-inclusive totals for named customers; (c) repeat customers = named customers with `order_count >= 2`; (d) patients on chronic Rx (see §10); (e) credit outstanding = sum of khata balances for named customers (`khata` contract).

**FR-14:** The system shall list named customers in a table with columns: Rx tag, Due tag, name, phone, order count, units sold, last visit, loyalty points (display from `crm`; 1 point per ₹100 net collected is the earn rule owned by `crm`), lifetime value, credit limit. Missing loyalty module/plan shall show `0` or em dash without erroring the list.

**FR-15:** The system shall search the list by name or phone (substring, case-insensitive on name).

**FR-16:** The system shall sort the list by exactly one of: **Top spenders** (lifetime value desc), **Most orders** (order count desc), **Recent** (last visit desc, nulls last). Default: Recent.

**FR-17:** The system shall export the current filtered/sorted list as Excel and as formatted PDF. Export is shop business data for this tenant only. Exports shall not include Rx images.

**FR-18:** The system shall store optional `credit_limit` (INR, 2 decimal places) on the Customer. Only the Owner may set, change, or clear it. `null` means no limit. `khata.checkCreditLimit` reads this field. Cashier/Manager/Pharmacist may view it.

**FR-19:** The system shall render Customer 360 for one named customer: summary (profile, consents, Rx tag, Due tag, loyalty points display, LTV, order count, last visit, credit limit); khata panel **embedded from `khata`** (outstanding, repayment, WhatsApp reminder, unpaid bills, full ledger); purchase history of posted Bills (invoice no, date, tender, total, line summary) with row open-to-invoice owned by POS/Orders; **New sale** control that navigates to staff POS with `customer_id` pre-selected.

**FR-20:** The system shall set **Rx tag** true when the customer has at least one prescription in `prescriptions` in status Approved or Dispensed (or a denormalized `has_rx` maintained by that module). Otherwise false.

**FR-21:** The system shall set **Due tag** true when `khata` reports outstanding > 0 for that customer (overdue 30d+ may use the same tag plus khata’s overdue flag on the khata screen). Otherwise false.

**FR-22:** The system shall update denormalized list fields when a Bill is posted or a credit note is posted: `order_count`, `units`, `last_visit_at`, `lifetime_value`. Source of GMV is posted Bills in `pos-billing`, not a parallel sales engine.

**FR-23:** The system shall emit `audit.AuditEvent` on Customer create, profile update, credit-limit change, and marketing-consent revoke (actor, role, tenant, `location_id`, timestamp, before/after for consent and credit limit).

**FR-24:** The system shall not provide a v1 bulk import endpoint or CSV uploader for customers.

**FR-25:** The system shall reject create/update if `location_id` is missing or does not belong to the session tenant (`400 LOCATION_REQUIRED` / `403`).

---

## 5. Non-Functional Requirements

- **English UI** ships; copy and export headers are i18n-ready (keys, not hardcoded concatenation that blocks later packs).
- **PII:** name, phone, address, age, gender, blood group, conditions, allergies, consents are accessible only to that tenant’s staff. CA pack must not receive a full patient dump from this module.
- **DPDP:** consent flags on 360; Owner can revoke marketing consent; campaigns honour opt-out via `crm` reading these flags; GST bill history retained.
- **Tenancy:** `location_id` on every query; schema-ready for a future branch id; UI is one shop.
- **Performance:** list page p95 < 1.5s for 10k named customers with pagination (page size 50 default). Allergy match p95 < 300ms for a cart of ≤ 50 SKUs.
- **Security:** APIs via `@namma-medmate/api-client` only from UI. Lambdas never import UI. Persistence only through `libs/db-services`.
- **Availability:** read APIs used at POS charge (allergies, match, get by phone) must not fail open into another tenant; on 5xx POS treats as “no match / cannot load profile” and must not charge khata without a resolved named customer (POS rule).
- **Audit:** append-only; no silent PII edits.

---

## 6. Data Model / Entities

Tenant-scoped. Table names illustrative.

### Customer

| Field                           | Type                                    | Notes                                                      |
| ------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `customer_id`                   | UUID                                    | PK                                                         |
| `tenant_id`                     | UUID                                    | not null                                                   |
| `location_id`                   | UUID                                    | not null                                                   |
| `name`                          | string                                  | required for named                                         |
| `phone_e164` / `phone_national` | string                                  | unique per `tenant_id` among named; required               |
| `address`                       | string                                  | nullable                                                   |
| `age`                           | int                                     | nullable; years                                            |
| `gender`                        | enum `male\|female\|other\|unspecified` | nullable                                                   |
| `blood_group`                   | string                                  | nullable; free text constrained to ABO/Rh set in UI        |
| `conditions`                    | string[]                                | clinical conditions                                        |
| `allergies`                     | string[]                                | source of truth for POS/kiosk check                        |
| `marketing_consent`             | boolean                                 | default false                                              |
| `marketing_consent_revoked_at`  | timestamptz                             | nullable                                                   |
| `refill_consent`                | boolean                                 | default false                                              |
| `credit_limit`                  | decimal(12,2)                           | nullable = no limit; Owner write                           |
| `has_rx`                        | boolean                                 | denormalized from `prescriptions`                          |
| `order_count`                   | int                                     | denormalized from posted Bills                             |
| `units_sold`                    | int                                     | denormalized                                               |
| `lifetime_value`                | decimal(14,2)                           | sum of posted bill totals (GST-inclusive)                  |
| `last_visit_at`                 | timestamptz                             | nullable                                                   |
| `loyalty_points_display`        | int                                     | denormalized from `crm` lots remaining; not the lot ledger |
| `created_at` / `updated_at`     | timestamptz                             |                                                            |
| `created_by_user_id`            | UUID                                    |                                                            |

Unique: `(tenant_id, phone_national)` where phone is not null.  
No walk-in row.  
Loyalty lots are **not** stored here (`crm.LoyaltyLot`).  
Khata ledger is **not** stored here (`khata.KhataLedger`).

### Projection / read models (not owned facts)

- Due / outstanding: `khata`
- Loyalty remaining and expiry: `crm`
- Purchase history: query `pos-billing` Bills by `customer_id`

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/v1/locations/{location_id}`  
Auth: `Authorization: Bearer <session>`. Tenant from session.  
Errors:

```json
{
  "error": {
    "code": "PHONE_TAKEN",
    "message": "A named customer with this phone already exists for this pharmacy."
  }
}
```

Pagination: `?page=1&page_size=50`.

### 7.1 REST

**GET** `/v1/locations/{location_id}/customers/kpis`

Response:

```json
{
  "named_customers": 128,
  "lifetime_sales": 1842500.0,
  "repeat_customers": 61,
  "patients_on_chronic_rx": 22,
  "credit_outstanding": 47320.5
}
```

**GET** `/v1/locations/{location_id}/customers`

Query: `q`, `sort=top_spenders|most_orders|recent` (default `recent`), `page`, `page_size`.

Response:

```json
{
  "items": [
    {
      "customer_id": "c_01",
      "name": "Anita Sharma",
      "phone": "9876543210",
      "rx_tag": true,
      "due_tag": true,
      "order_count": 14,
      "units": 86,
      "last_visit_at": "2026-08-28T10:11:00+05:30",
      "loyalty_points": 42,
      "lifetime_value": 21800.0,
      "credit_limit": 5000.0
    }
  ],
  "page": 1,
  "page_size": 50,
  "total": 128
}
```

**GET** `/v1/locations/{location_id}/customers/export?format=xlsx|pdf&q&sort`

Response: `200` binary file (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `application/pdf`). Same columns as the table.

**POST** `/v1/locations/{location_id}/customers`

```json
{
  "name": "Anita Sharma",
  "phone": "9876543210",
  "address": "12 MG Road",
  "age": 54,
  "gender": "female",
  "blood_group": "B+",
  "conditions": ["diabetes"],
  "allergies": ["penicillin"],
  "marketing_consent": true,
  "refill_consent": true,
  "credit_limit": 5000.0
}
```

`credit_limit` ignored unless actor is Owner (omit or `403 CREDIT_LIMIT_OWNER_ONLY` if a non-Owner sends a value).

**201:**

```json
{
  "customer_id": "c_01",
  "name": "Anita Sharma",
  "phone": "9876543210",
  "allergies": ["penicillin"],
  "marketing_consent": true,
  "refill_consent": true,
  "credit_limit": 5000.0
}
```

**GET** `/v1/locations/{location_id}/customers/{customer_id}` — full 360 payload (profile + denormalized stats). Khata block is loaded by the UI from `khata` APIs; this response may include `khata_summary` only if `khata` is called server-side as a BFF aggregate. Preferred: UI composes `GET customer` + `GET khata/customers/{id}`.

**PATCH** `/v1/locations/{location_id}/customers/{customer_id}` — partial profile. Same Owner rule for `credit_limit`.

**GET** `/v1/locations/{location_id}/customers/by-phone/{phone}` — POS lookup. `200` customer or `404 NOT_FOUND` (treat as new named / walk-in at POS).

**GET** `/v1/locations/{location_id}/customers/{customer_id}/allergies`  
`getCustomerAllergies`

```json
{ "customer_id": "c_01", "allergies": ["penicillin", "sulfa"] }
```

**POST** `/v1/locations/{location_id}/customers/{customer_id}/allergies/match`

```json
{
  "sku_ids": ["sku_amox", "sku_pcm"]
}
```

```json
{
  "hits": [
    {
      "sku_id": "sku_amox",
      "allergy": "penicillin",
      "matched_on": "composition"
    }
  ]
}
```

Empty `hits` = no match. Unknown SKU ids are skipped (not 404).

**GET** `/v1/locations/{location_id}/customers/{customer_id}/purchase-history?page&page_size`

```json
{
  "items": [
    {
      "bill_id": "b_01",
      "invoice_no": "INV-2026-0412",
      "posted_at": "2026-08-28T10:11:00+05:30",
      "tender": "cash",
      "total": 430.0,
      "line_count": 3
    }
  ],
  "page": 1,
  "total": 14
}
```

**POST** `/v1/locations/{location_id}/customers/{customer_id}/consent/marketing/revoke`

Owner only. Idempotent. `200`:

```json
{
  "customer_id": "c_01",
  "marketing_consent": false,
  "marketing_consent_revoked_at": "2026-08-31T21:00:00+05:30"
}
```

Non-Owner: `403`.

### 7.2 Events consumed

| Event                                              | From            | Effect                                                                    |
| -------------------------------------------------- | --------------- | ------------------------------------------------------------------------- |
| `bill.posted`                                      | `pos-billing`   | Recompute `order_count`, `units_sold`, `lifetime_value`, `last_visit_at`. |
| `credit_note.posted`                               | `returns`       | Adjust lifetime value / units per CN lines (GST history remains).         |
| `loyalty.balance_changed`                          | `crm`           | Update `loyalty_points_display`.                                          |
| `prescription.approved` / `prescription.dispensed` | `prescriptions` | `has_rx = true`.                                                          |
| `khata.balance_changed`                            | `khata`         | Due tag on next list read (or denormalize `due_tag`).                     |

### 7.3 Events emitted

| Event                                | Payload (min)                             | Listeners                       |
| ------------------------------------ | ----------------------------------------- | ------------------------------- |
| `customer.created`                   | `customer_id`, phone, name, `location_id` | `audit`, POS                    |
| `customer.updated`                   | `customer_id`, changed fields             | `audit`                         |
| `customer.marketing_consent_revoked` | `customer_id`                             | `crm` (stop campaigns), `audit` |
| `customer.credit_limit_changed`      | `customer_id`, old, new                   | `khata`, `audit`                |

### 7.4 UI (Pharmacy Partner Console)

- Route: `/customers` (sidebar Business / Customers). Lock icon on Free.
- List: KPI row, search, sort control, Export Excel, Export PDF, table, open 360.
- Route: `/customers/:customer_id` — 360. Khata embed (repayment chips and remind are `khata` UI). **New sale** → POS cart with customer selected.
- No import button in v1.

---

## 8. User Stories & Acceptance Criteria

### US-1: Create a named customer at this screen

**Given** a Starter pharmacy and a Manager on `/customers`  
**When** they save name “Anita Sharma” and phone `9876543210` with allergy “penicillin”  
**Then** a Customer exists for this tenant+location, phone is unique, the row appears in the list, and `getCustomerAllergies` returns `["penicillin"]`.

**Given** that phone already exists on this tenant  
**When** staff submit another named customer with the same phone  
**Then** the system returns `409 PHONE_TAKEN` and does not create a second row.

### US-2: Walk-in has no profile

**Given** a Cashier charging a cash bill with no customer selected  
**When** the bill posts  
**Then** no Customer row is created, allergy match is not called, and khata tender is not available for that bill.

### US-3: Owner revokes marketing consent; GST history remains

**Given** a named customer with `marketing_consent=true` and three posted bills  
**When** the Owner revokes marketing consent  
**Then** `marketing_consent` is false, `crm` must not send further campaigns to that phone, and purchase history still lists the three bills.

---

## 9. Edge Cases & Error Handling

| Case                                                  | Behaviour                                       |
| ----------------------------------------------------- | ----------------------------------------------- |
| Plan Free / expired                                   | Paywall; API `403 PLAN_REQUIRED`; data retained |
| Duplicate phone                                       | `409 PHONE_TAKEN`                               |
| Invalid phone (not 10-digit national after normalize) | `400 PHONE_INVALID`                             |
| Missing name                                          | `400 NAME_REQUIRED`                             |
| Non-Owner sets credit_limit                           | `403 CREDIT_LIMIT_OWNER_ONLY`                   |
| Non-Owner revokes marketing consent                   | `403`                                           |
| Unknown `customer_id`                                 | `404`                                           |
| Cross-tenant id                                       | `404` (no leak)                                 |
| Allergy match with empty allergies                    | `hits: []`                                      |
| Allergy match unknown sku_id                          | skip id                                         |
| Export with zero rows                                 | valid empty spreadsheet/PDF                     |
| `crm` down for points display                         | list shows `0` / em dash; do not fail list      |
| `khata` down for due tag                              | due tag false / omitted; do not fail list       |
| Concurrent duplicate create same phone                | one `201`, one `409`                            |
| Walk-in phone typed but not saved as named            | no Customer; POS decides walk-in vs create      |

---

## 10. Open Questions / Assumptions

1. **No bulk customer import in v1** (go-live may add it later). Named customers are created at POS or this screen only.
2. **Repeat customer** = `order_count >= 2` on posted Bills.
3. **Patients on chronic Rx** = named customers whose `conditions[]` is non-empty **or** `has_rx` is true. If product later wants a dedicated chronic flag, that is a spec change.
4. **Phone normalize:** 10-digit Indian national; `+91` / `91` / leading `0` stripped before uniqueness.
5. **Allergy match:** case-insensitive substring on SKU `name` and `composition` only. No ingredient ontology in v1.
6. **Loyalty points on the table** are a display projection from `crm` (1 pt per ₹100 net collected is earned in `crm`, not recalculated here).
7. **Credit limit write** is Owner-only; view is any role that can open Customers or POS.
8. **Gender / blood group** are optional profile fields; they do not gate billing.
9. **Deleting a customer record** is not a v1 action (DPDP: revoke marketing consent; retain GST history). If a future “forget” is required, it must preserve invoice legal hold.
10. **GSTIN on the customer master** is not in this module; B2B GSTIN is captured on the bill in `pos-billing`.
11. Khata reminders and campaigns are not sent by this module.
12. Kiosk identify/create of a named OTC profile is implemented in `kiosk` using this API; this module does not own kiosk UI.
