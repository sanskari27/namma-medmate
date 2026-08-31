# Requirement Doc: Pharmacy tenant & location (`tenancy`)

## 1. Summary

The `tenancy` module is the identity root for a neighbourhood retail chemist on Namma MedMate. It owns the **Pharmacy** tenant and its single **Location**, enforces “one pharmacy tenant = one location” in v1, and requires `location_id` on every pharmacy-scoped query so the schema is branch-ready without selling branches. Staff logins are tenant-scoped: a chemist User belongs to exactly one Pharmacy. A Namma Super admin / Ops / Finance / Support / Compliance identity is not a pharmacy User and must never be issued pharmacy-console tenant context. The Pharmacy Partner Console UI is one shop. Platform Admin HQ creates and reads Pharmacy/Location records; other HQ screens (KYC, subscription, CRM Software) consume this identity and do not redefine it.

## 2. Scope

- In scope:
  - Create a Pharmacy tenant together with exactly one Location (`location_id`).
  - Persist and return Pharmacy + Location identity for console bootstrap and HQ lookup.
  - Enforce tenant isolation: every pharmacy query in this module requires `tenant_id` and `location_id`; `location_id` must belong to that tenant.
  - Expose a TenantContext contract (`tenant_id`, `location_id`, shop display name) consumed by all later pharmacy modules via `@namma-medmate/api-client`.
  - Reject a second Location on a v1 tenant (API hard-stop; no branches UI).
  - Enforce Regular GST dealer classification only; retail chemist only.
  - Surface shop identity in the Pharmacy Partner Console shell (one-shop badge) and provide HQ-readable tenant records.
  - List personas for documentation of who uses which surface; this module does not implement their feature screens.
- Out of scope:
  - Branches UI, stock-transfer, chain HQ, extra GSTIN, extra Location create/switcher.
  - Staff User create, roles, seats, password/OTP/PIN (`auth`, `manage-users`).
  - Plan, seats, SaasSubscription, Cashfree (`plan-gating`, `saas-billing`).
  - GSTIN, licences, e-invoicing flag, GSTN/IRP secret refs, go-live wizard (`go-live-kyc`, `account-settings`, `books-gst`).
  - KYC approve/reject, suspend/reactivate subscription (`admin-tenants`, `admin-saas-crm`, `saas-billing`).
  - Stock, bills, customers, khata, registers, books (those records *belong to* the tenant; other modules own them).
  - CA share link (not a console login; `ca-sharing`).
  - Kiosk mode chrome (`kiosk`).
  - Platform Admin HQ full Pharmacies command-center list UX (`admin-tenants` consumes this API).

## 3. Dependencies

- Other modules/slugs and what is needed:
  - None required to implement this module (decomposition #01).
  - Downstream: `auth` stores `tenant_id` + `location_id` on User and session; `manage-users` creates Users only for an existing Pharmacy; `whatsapp` reads Location display name for template body; `audit` stores tenant on every AuditEvent; `plan-gating` / `saas-billing` attach SaasSubscription to Pharmacy; `admin-tenants` lists Pharmacies; every pharmacy module must send `location_id` on queries.
- External services/APIs/libraries:
  - Persistence only through `libs/db-services`.
  - UI talks to API only via `@namma-medmate/api-client`.
  - AWS Lambda (TypeScript) + API Gateway for REST.
  - No Meta, Cashfree, GSTN, or SMS in this module.

## 4. Functional Requirements

- FR-1: The system shall create a Pharmacy and exactly one Location in a single atomic operation, generating `tenant_id` (UUID) and `location_id` (UUID).
- FR-2: The system shall persist Location `display_name` (shop name) on create and update; this is the name later modules put in WhatsApp template bodies.
- FR-3: The system shall set `gst_dealer_type` to `regular` on every Pharmacy and reject any other dealer type.
- FR-4: The system shall set `business_type` to `retail` on every Pharmacy and reject hospital, IPD, wholesale, diagnostics, insurance/TPA, or Jan Aushadhi classifications.
- FR-5: The system shall reject an attempt to create a second Location for an existing `tenant_id` with HTTP 409 and code `LOCATION_LIMIT_V1`.
- FR-6: The system shall require `tenant_id` and `location_id` on every pharmacy-scoped read or update in this module.
- FR-7: The system shall return HTTP 403 with code `LOCATION_TENANT_MISMATCH` when the supplied `location_id` does not belong to the supplied `tenant_id`.
- FR-8: The system shall return HTTP 404 with code `PHARMACY_NOT_FOUND` when `tenant_id` does not exist.
- FR-9: The system shall return HTTP 404 with code `LOCATION_NOT_FOUND` when `location_id` does not exist.
- FR-10: The system shall load current Pharmacy + Location for a pharmacy session from the session’s `tenant_id` and `location_id` without allowing the client to switch location.
- FR-11: The system shall not issue Pharmacy tenant context to a Namma HQ principal (Super admin / Ops / Finance / Support / Compliance). HQ callers may create and read Pharmacy records via HQ-authorised endpoints only.
- FR-12: The system shall not provide a Location switcher, stock-transfer action, extra GSTIN field, or chain-HQ navigation in v1 UI.
- FR-13: The system shall expose shop identity in the Pharmacy Partner Console shell as a single shop name badge (English copy, i18n keys).
- FR-14: The system shall allow HQ to GET a Pharmacy by `tenant_id` including its single Location.
- FR-15: The system shall allow HQ to list Pharmacies with pagination, returning each tenant’s `tenant_id`, `location_id`, and `display_name`.
- FR-16: The system shall allow Owner (pharmacy console) to update Location `display_name` only; GSTIN/licences/plan are not writable here.
- FR-17: The system shall not delete a Pharmacy or Location in v1 (no delete endpoint).
- FR-18: The system shall treat Staff User records as tenant-scoped: this module does not create Users but exposes `assertUserTenant(tenant_id, user_id)` is *not* owned here — instead it exposes `getLocationForTenant(tenant_id)` so `auth` can bind the User to the sole Location.
- FR-19: The system shall include `location_id` in every successful pharmacy JSON response body for this module (not header-only).
- FR-20: The system shall reject pharmacy console API calls that omit `location_id` with HTTP 400 and code `LOCATION_ID_REQUIRED`.

## 5. Non-Functional Requirements

- NFR-1: Pharmacy Partner Console and Platform Admin HQ UI strings ship in English and are keyed for i18n (`tenancy.*`).
- NFR-2: `tenant_id` and `location_id` are UUID v4, unique, never reused.
- NFR-3: Create Pharmacy+Location is a single database transaction; neither row is visible without the other.
- NFR-4: List/get endpoints p95 latency ≤ 200 ms excluding auth, at the v1 scale of neighbourhood retail tenants.
- NFR-5: APIs never import UI. Persistence only through `libs/db-services`.
- NFR-6: Module layout is `modules/tenancy/{ui,api,docs}`.
- NFR-7: Pharmacy data for tenant A is never returned on a query authenticated as tenant B.
- NFR-8: No SMS, no chemist-owned WhatsApp, no shop-floor Cashfree, no extra branches product copy on any screen this module owns.
- NFR-9: Audit of tenant create is emitted to `audit` once `audit` exists; until then, create is still transactional and logged at the Lambda logger with `tenant_id` (no secrets).

## 6. Data Model / Entities

- Entities/fields this module owns:
  - **Pharmacy** (tenant)
    - `tenant_id` (UUID, PK)
    - `gst_dealer_type` (`regular` only)
    - `business_type` (`retail` only)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - **Location**
    - `location_id` (UUID, PK)
    - `tenant_id` (UUID, FK → Pharmacy, unique in v1)
    - `display_name` (string, 1–120 chars; shop name)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - Invariant: count(Location where tenant_id = T) = 1 for every Pharmacy T in v1.
- Relationships to entities owned elsewhere (reference by name, don't redefine):
  - **User (login)** — `auth` / `manage-users`. Each User has `tenant_id` + `location_id` pointing here. A Namma HQ principal is not a User of this Pharmacy.
  - **Employee (HR)** — `employees`. Tenant-scoped; not a login.
  - **SaasSubscription** — `saas-billing` / `admin-saas-crm`. Plan and seats live there; Pharmacy does not duplicate plan columns.
  - **SKU**, **Batch**, **Bill**, **HeldCart**, **CreditNote**, **GRN**, **StockTake**, **PurchaseReturn / ExpiryReturn**, **Customer**, **LoyaltyLot**, **KhataLedger**, **Doctor (shop list)**, **DutyShift**, **Journal / ChartOfAccount**, **Gstr2bMatch**, **Payment** (GMV), **Offer**, **PurchaseOrder**, **Expense**, **CaShareLink** — all belong to this tenant + location; other modules own the rows and must store `tenant_id` + `location_id`.
  - GSTIN, licences + expiry, e-invoicing flag, IRP/GSTN secret ref, wizard complete — stored by `go-live-kyc` / `account-settings` / `books-gst` against this `tenant_id` + `location_id`.

## 7. API / Interface Contracts

Base: pharmacy Lambdas under `/tenancy`. HQ Lambdas share the same service with HQ auth. JSON envelope `{ "data": ... }` on success; `{ "error": { "code", "message", "i18n_key" } }` on failure. Pharmacy requests must include `location_id` as a query parameter on GET and in the JSON body on POST/PATCH (schema-ready). Session-authenticated pharmacy calls also carry `tenant_id` and `location_id` in the session; the query/body value must match the session or the call fails `LOCATION_TENANT_MISMATCH`.

### 7.1 REST — HQ (Platform Admin HQ principal)

**POST `/tenancy/pharmacies`**

Create Pharmacy + Location.

Request:

```json
{
  "display_name": "Sri Krishna Medicals",
  "gst_dealer_type": "regular",
  "business_type": "retail"
}
```

Response `201`:

```json
{
  "data": {
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "display_name": "Sri Krishna Medicals",
    "gst_dealer_type": "regular",
    "business_type": "retail",
    "created_at": "2026-08-31T16:00:00.000Z"
  }
}
```

Errors: `400 VALIDATION_FAILED` (missing/empty `display_name`, dealer type ≠ `regular`, business type ≠ `retail`); `401`; `403` if caller is not HQ.

**GET `/tenancy/pharmacies/{tenant_id}`**

Response `200`:

```json
{
  "data": {
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "gst_dealer_type": "regular",
    "business_type": "retail",
    "location": {
      "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
      "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
      "display_name": "Sri Krishna Medicals"
    },
    "created_at": "2026-08-31T16:00:00.000Z",
    "updated_at": "2026-08-31T16:00:00.000Z"
  }
}
```

**GET `/tenancy/pharmacies?limit=50&cursor=`**

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
        "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
        "display_name": "Sri Krishna Medicals"
      }
    ],
    "next_cursor": null
  }
}
```

**POST `/tenancy/pharmacies/{tenant_id}/locations`**

Always rejected in v1.

Response `409`:

```json
{
  "error": {
    "code": "LOCATION_LIMIT_V1",
    "message": "This pharmacy already has its location. Extra branches are not available.",
    "i18n_key": "tenancy.errors.locationLimitV1"
  }
}
```

### 7.2 REST — Pharmacy Partner Console (pharmacy User)

**GET `/tenancy/current?location_id={uuid}`**

Response `200`: same inner object as GET pharmacy by id, scoped to the session tenant. `location_id` query required and must match session.

**PATCH `/tenancy/current?location_id={uuid}`**

Request:

```json
{
  "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
  "display_name": "Sri Krishna Medicals Indiranagar"
}
```

Allowed role: **Owner** only. Others: `403 FORBIDDEN_ROLE`.

Response `200`: updated Pharmacy + Location.

### 7.3 Internal helper for other Lambdas (same api-client types)

**GET `/tenancy/locations/{location_id}?tenant_id={uuid}`**

Used by `whatsapp`, `auth`, and others to resolve shop name and validate pairing.

Response `200`:

```json
{
  "data": {
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "display_name": "Sri Krishna Medicals"
  }
}
```

### 7.4 Events emitted

- `PharmacyCreated` — `{ tenant_id, location_id, display_name, gst_dealer_type, business_type, at }`
- `LocationDisplayNameUpdated` — `{ tenant_id, location_id, display_name, actor_user_id, at }`

No GMV, stock, or GSTN events.

### 7.5 UI routes / components this module exposes

- Pharmacy Partner Console:
  - No standalone sidebar route. Shell mounts `TenantBootstrap` on every authenticated console route.
  - Components: `TenantBootstrap`, `ShopIdentityBadge` (shows `display_name`), `useTenant()` → `{ tenant_id, location_id, display_name }`.
  - i18n keys: `tenancy.badge.shopName`, `tenancy.errors.locationIdRequired`, `tenancy.errors.locationTenantMismatch`, `tenancy.errors.pharmacyNotFound`, `tenancy.errors.locationLimitV1`, `tenancy.form.displayName`, `tenancy.form.save`.
- Platform Admin HQ:
  - No command-center list page here (`admin-tenants` owns `/hq/pharmacies`).
  - Components for HQ reuse: `CreatePharmacyFields` (display_name, locked Regular GST + retail copy) used by `admin-tenants` create flow via shared UI import **only if** that module’s UI lives in HQ; otherwise HQ calls POST `/tenancy/pharmacies` through `@namma-medmate/api-client` and this module’s `ui` still ships `CreatePharmacyFields` + `PharmacyIdentityReadOnly`.
  - Routes owned here: none required. Optional fragment route unused in v1.

Personas (this module does not own their screens): **Owner**, **Manager**, **Pharmacist**, **Cashier** use Pharmacy Partner Console; **Kiosk shopper** has no tenant admin; **CA** uses CA share link (not a login); **Namma Super admin / Ops / Finance / Support / Compliance** use Platform Admin HQ.

## 8. User Stories & Acceptance Criteria

### US-1: HQ creates a one-shop Pharmacy

As a Namma Ops user I create a chemist account so the shop can later complete KYC and go-live.

- AC-1: Given I am an HQ principal, when I POST `/tenancy/pharmacies` with a non-empty `display_name`, `gst_dealer_type=regular`, and `business_type=retail`, then the response is 201 and contains both `tenant_id` and `location_id`.
- AC-2: Given that Pharmacy exists, when I GET `/tenancy/pharmacies/{tenant_id}`, then exactly one `location` object is returned and its `tenant_id` matches.
- AC-3: Given I POST dealer type `composition` or business type `wholesale`, then the response is 400 `VALIDATION_FAILED` and no Pharmacy row is written.

### US-2: Console shows one shop and cannot switch location

As an **Owner** I see my shop name and never a branch picker.

- AC-1: Given I have a pharmacy session for location L, when the console shell renders, then `ShopIdentityBadge` shows Location `display_name` and no location switcher is present.
- AC-2: Given I call GET `/tenancy/current` without `location_id`, then the response is 400 `LOCATION_ID_REQUIRED`.
- AC-3: Given I call GET `/tenancy/current` with another tenant’s `location_id`, then the response is 403 `LOCATION_TENANT_MISMATCH`.

### US-3: v1 refuses a second location

As the platform we do not sell branches.

- AC-1: Given Pharmacy T already has a Location, when anyone POSTs `/tenancy/pharmacies/{tenant_id}/locations`, then the response is 409 `LOCATION_LIMIT_V1`.
- AC-2: Given the Pharmacy Partner Console, when I inspect navigation, then there is no “Add branch”, stock-transfer, extra GSTIN, or chain HQ entry owned by this module.
- AC-3: Given Pro marketing copy is rendered by other modules, when this module refers to Location, then it never uses the phrase “unlimited branches”.

### US-4: Namma admin is not a pharmacy user

As a Super admin I can read tenants in HQ but I cannot become a chemist User via this module.

- AC-1: Given I am an HQ principal, when I call GET `/tenancy/current`, then the response is 403 (pharmacy session required).
- AC-2: Given I am a Pharmacist User, when I call POST `/tenancy/pharmacies`, then the response is 403.
- AC-3: Given a Pharmacy is created, when I inspect the payload, then no HQ principal `user_id` is attached as a pharmacy User.

### US-5: Owner renames the shop

As an **Owner** I correct the board name used on WhatsApp and the console badge.

- AC-1: Given I am Owner, when I PATCH `/tenancy/current` with a valid `display_name` and matching `location_id`, then GET current returns the new name.
- AC-2: Given I am Cashier, when I PATCH `/tenancy/current`, then the response is 403 `FORBIDDEN_ROLE`.
- AC-3: Given the name is updated, when `whatsapp` later resolves the Location, then it receives the new `display_name`.

## 9. Edge Cases & Error Handling

- Missing `display_name` or whitespace-only: `400 VALIDATION_FAILED`, i18n `tenancy.errors.displayNameRequired`.
- `display_name` longer than 120 characters: `400 VALIDATION_FAILED`.
- Duplicate create retries: no client idempotency key in v1; two POSTs create two Pharmacies (HQ operators must not double-submit). Assumption logged in §10.
- Pharmacy GET with malformed UUID: `400 VALIDATION_FAILED`.
- Pharmacy console call with valid session but omitted `location_id`: `400 LOCATION_ID_REQUIRED`.
- `location_id` belongs to a different tenant: `403 LOCATION_TENANT_MISMATCH` (do not leak the other shop’s `display_name`).
- HQ list cursor tampering: ignore invalid cursor and return the first page (or `400`); do not leak rows.
- Concurrent second-location attempts: unique constraint on `Location.tenant_id` (v1) plus FR-5.
- Owner update of GSTIN via this API: field ignored / not in schema; client must use `account-settings`.
- Suspended subscription: this module still returns Pharmacy identity; `plan-gating` / `saas-billing` decide module locks. Do not 404 the tenant.
- Deleted-looking tenants: no delete; no soft-delete field in v1.

Error catalogue:

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Body/query fails schema |
| `LOCATION_ID_REQUIRED` | 400 | Pharmacy query missing `location_id` |
| `PHARMACY_NOT_FOUND` | 404 | Unknown `tenant_id` |
| `LOCATION_NOT_FOUND` | 404 | Unknown `location_id` |
| `LOCATION_TENANT_MISMATCH` | 403 | Pairing invalid |
| `LOCATION_LIMIT_V1` | 409 | Second Location |
| `FORBIDDEN_ROLE` | 403 | Non-Owner patch |
| `HQ_ONLY` | 403 | Pharmacy User hit HQ create/list |
| `PHARMACY_SESSION_REQUIRED` | 403 | HQ principal hit `/tenancy/current` |

## 10. Open Questions / Assumptions

- Assumption: `tenant_id` is UUID v4; `location_id` is UUID v4; exactly one Location per tenant in v1.
- Assumption: shop name lives on Location as `display_name` (WhatsApp “shop name in template body”).
- Assumption: timezone for the shop is `Asia/Kolkata` and is not stored here until a later spec adds it.
- Assumption: HQ create is the only way a Pharmacy comes into existence in v1 (no self-serve signup in this module).
- Assumption: create Pharmacy is not idempotent; HQ UI disables double-submit.
- Assumption: subscription suspend does not hide the Pharmacy row.
- Assumption: `admin-tenants` owns the HQ list page and calls this module’s GET/POST; this module does not duplicate Command center tiles.
- Assumption: address, GSTIN, PAN, licences, logo, and bank details are not columns on Pharmacy/Location here.
- Vague in source (“do not block branches”): v1 API returns 409 on a second Location rather than inserting a dormant row. Revisit if a later release sells branches; `location_id` on every query remains the extension point.
- Out of v1 (never implement here): extra branches as a product, extra GSTIN, stock-transfer, chain HQ, hospital/IPD, wholesale, Jan Aushadhi.
---
