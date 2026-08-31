# Requirement Doc: Account Settings (`account-settings`)

## 1. Summary (one paragraph)

Account Settings is the Pharmacy Partner Console module for **Account**, **Invoice Settings**, **Settings — Pharmacy Profile**, and **Help & Support**. It is always reachable (Invoice Settings is Free; some profile fields are **Owner-only**). Account shows logo, name, plan, business type, member-since, Run setup wizard / Edit profile, KPI tiles, plan and usage bars, a profile checklist, a KYC card, sign out, export summary (shop business data, not a full patient dump), and contact support via WhatsApp. Invoice Settings owns thermal / modern / minimal templates, accent, logo, signature, title, prefix, signatory, bank, T&C, footer, display toggles, live preview, print sample, and GRN batch label template. Pharmacy Profile owns identity and tax, licence expiry, retail / Regular GST classification, and encrypted GSTN / IRP credentials (Owner-only; never in logs or CA pack). Help owns WhatsApp chat / call / help centre links, FAQ, and a raise-ticket form. This module owns those routes and Account-group chrome for Account / Settings / Help / Invoice Settings. Dashboard is owned by `dashboard`. TDS / TCS are profile flags only. UI in `modules/account-settings/ui` via `@namma-medmate/api-client`; API in `modules/account-settings/api`. Every pharmacy query includes tenant + `location_id`.

## 2. Scope (in / out)

### In scope

- Routes: Account home, Invoice Settings, Pharmacy Profile, Help & Support.
- Account KPI tiles: plan, team, seats, invoices, lifetime sales, profile-complete %.
- Plan and usage bars (seats used / limit; plan name).
- Profile checklist chips linking to the correct screen: logo, signature, GSTIN, PAN, drug licence, FSSAI, bank.
- KYC card (read from `go-live-kyc`): GSTIN, PAN, Drug Licence, FSSAI, registered pharmacist, e-Invoicing, bank.
- Run setup wizard (navigates / starts `go-live-kyc` re-run). Edit profile (Pharmacy Profile).
- Sign out (`auth`). Export summary (shop business JSON/CSV). Contact support WhatsApp deep-link.
- Invoice Settings (Free): template `modern` | `minimal` | `thermal` (thermal default for counter printer), accent colour, logo, signature/seal, title, invoice prefix, signatory label, bank details, T&C, footer; toggles: show “you saved…” on MRP, include doctor, show HSN, print bank, print IRN/ACK when present; live preview; print sample; browser print to thermal 80mm; GRN batch sticker label template.
- Pharmacy Profile (always): identity and tax; licence expiry dates; classification retail + Regular GST; GSTN / IRP credentials encrypted, Owner-only UI; re-run setup wizard.
- Help: WhatsApp chat, `tel:` call, help centre URL, FAQ, raise-ticket form (creates **Ticket** for `admin-support`).
- Sidebar Account group entries this module owns: Account, Invoice Settings, Settings (Pharmacy Profile), Help & Support.

### Out of scope

- Dashboard home KPIs (`dashboard`).
- Manage Users (`manage-users`), Employees (`employees`), Subscription / Refer & Earn (`saas-billing`) — they appear in the Account **group** but are other modules.
- Chemist-facing Cashfree **merchant** keys (GMV). SaaS Cashfree keys are platform (`admin-platform-settings`).
- TDS / TCS auto-withhold or filled TDS reports (`reports` stubs).
- CA pack generation (`ca-sharing`) — this module must not put GSTN/IRP secrets in any export.
- Shop-floor GMV, SMS, branches product, Tally XML.
- Period lock (`books-gst`).

## 3. Dependencies (modules + external)

| Dependency | Why |
|---|---|
| `tenancy` | **Pharmacy** / **Location** name, member-since, business type. |
| `go-live-kyc` | KYC card; Run / re-run wizard; licence fields overlap with wizard step 1. |
| `plan-gating` | Plan name, seat limit, module unlock for display bars. Invoice Settings always unlocked. |
| `manage-users` | Team count / seats used (`active_count`). |
| `saas-billing` | Plan display, member billing period (read). |
| `pos-billing` (later) | Invoice count, lifetime sales for KPI tiles (read aggregates). |
| `auth` | Sign out. |
| `whatsapp` | Support chat is a `wa.me` deep-link to Namma WABA / support number; not auto-send. |
| `admin-support` (later) | **Ticket** create from raise-ticket form. |
| `audit` | GSTN/IRP credential edit, profile tax edit, invoice prefix change. |
| `@namma-medmate/api-client` | UI HTTP. |
| Object storage | Logo, signature/seal images. |

External: browser print dialog (no vendor SDK). No chemist Cashfree keys.

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall require `location_id` on every pharmacy Account Settings query and mutation (`LOCATION_REQUIRED`).

**FR-2:** The system shall isolate all settings by **Pharmacy** tenant.

**FR-3:** The system shall expose Account home to any authenticated staff User of the tenant (always on Free). Mutations of logo / display name require `permissions["account-settings"]` or Owner.

**FR-4:** The system shall persist pharmacy **display** fields: `logo_object_key`, `display_name`, `business_type` (v1 value `retail_chemist` only). `member_since` is `Pharmacy.created_at` (read-only).

**FR-5:** The system shall assemble Account KPI tiles from: `plan` (`plan-gating` / `saas-billing`), `team` = active **User** count (`manage-users`), `seats` = `{ used, limit, unlimited }`, `invoices` = posted **Bill** count for the location (0 if `pos-billing` has none), `lifetime_sales_paise` = sum of posted **Bill** totals (0 if none), `profile_complete_percent` per FR-6.

**FR-6:** The system shall compute `profile_complete_percent` as round(100 × present / 7) where the seven checklist items are: logo, signature, GSTIN, PAN, drug licence, FSSAI, bank (holder + IFSC + account). FSSAI missing counts as incomplete even if optional for KYC submit.

**FR-7:** The system shall render plan and usage bars: seats used / limit (or unlimited), and plan name. It shall not sell add-on SKUs or extra branches on this screen.

**FR-8:** The system shall return checklist items `{ key, complete, href }` with hrefs: logo → Account, signature → Invoice Settings, GSTIN / PAN / drug licence / FSSAI / bank → Pharmacy Profile.

**FR-9:** The system shall return a KYC card from `go-live-kyc` status (GSTIN, PAN, Drug Licence, FSSAI, registered pharmacist, e-Invoicing, bank masked, `kyc_status`). This module shall not Approve / Reject KYC.

**FR-10:** The system shall provide **Run setup wizard** / **Re-run setup wizard** by calling `POST /go-live-kyc/wizard/rerun` (or navigate to wizard if `not_started`). Owner only.

**FR-11:** The system shall **Sign out** by calling `auth` session revoke and clearing the console client session.

**FR-12:** The system shall **Export summary** as JSON (and CSV equivalent) containing shop business data only: pharmacy name, GSTIN, plan, KYC status, wizard status, seat used/limit, invoice count, lifetime sales paise, member_since. It shall not include customer names, phones, Rx images, allergies, GSTN/IRP secrets, or full staff PAN/Aadhaar.

**FR-13:** The system shall **Contact support** via `https://wa.me/<namma_support_e164>?text=` pre-filled i18n message (shop name + GSTIN). `sent` is false; no **WhatsAppMessage** send from this action.

**FR-14:** The system shall persist **InvoiceSettings** per tenant + `location_id` with: `template` ∈ `{ modern, minimal, thermal }` default `thermal`; `accent_hex`; `logo_object_key`; `signature_object_key`; `title` default “Tax Invoice”; `invoice_prefix`; `credit_note_prefix` default `CN` (used by `returns`; stored here); `signatory_label`; `bank_account_holder`; `bank_account_number` (encrypted); `bank_ifsc`; `terms`; `footer`; toggles `show_you_saved`, `include_doctor`, `show_hsn`, `print_bank`, `print_irn_ack`.

**FR-15:** The system shall allow Invoice Settings GET to any User with `pos-billing` or `account-settings` permission (cashiers must print). Mutations require `account-settings` permission or Owner.

**FR-16:** The system shall validate `invoice_prefix` `^[A-Z0-9]{2,10}$` and keep it stable for `pos-billing` numbering. Changing prefix shall not rewrite historical **Bill** numbers; it shall emit **AuditEvent**.

**FR-17:** The system shall provide live preview HTML/PDF of a sample invoice using current settings and dummy lines (no live patient PII). **Print sample** opens the browser print dialog targeting 80mm (`@page { size: 80mm auto }`) when `template=thermal` or when the user chooses thermal sample.

**FR-18:** The system shall persist a **label template** for GRN batch stickers: fields SKU name, batch no, expiry, MRP (GST-inclusive). `purchases` shall read this template when printing labels. Mutations on the same Invoice Settings permission.

**FR-19:** The system shall persist Pharmacy Profile identity and tax on **Pharmacy**: GSTIN, `e_invoicing_enabled`, PAN, drug licence no + issue + expiry, FSSAI no + expiry, `tds_applicable` boolean, `tcs_applicable` boolean, registered pharmacist name + registration no + expiry. GET allowed to Users with `account-settings`; mutations Owner-only.

**FR-20:** The system shall persist classification `retail: true` and `gst_scheme: "regular"` only. The UI shall not offer composition, wholesale, hospital, or Jan Aushadhi.

**FR-21:** The system shall store GSTN portal username + password and IRP credentials as encrypted secrets at rest, Owner-only GET (masked username, `irp_configured` boolean, `updated_at`) and Owner-only PUT (write-only secrets). GET shall never return plaintext passwords. PUT shall emit **AuditEvent** without secret values.

**FR-22:** The system shall never include GSTN/IRP secrets in export summary, logs, Invoice Settings preview, Help tickets, or any payload destined for a **CaShareLink**.

**FR-23:** The system shall not show chemist-facing Cashfree merchant keys or GMV settlement fields.

**FR-24:** The system shall treat TDS/TCS as flags only: no withholding at POS, no auto-filled TDS report numbers.

**FR-25:** The system shall serve Help FAQ as a static, i18n list (question, answer keys) and links: WhatsApp chat (FR-13), `tel:` to Namma support number, help centre URL from platform settings.

**FR-26:** The system shall accept raise-ticket `{ subject, category, body, contact_phone }` from any authenticated staff, create a **Ticket** via `admin-support` (or persist a local outbox event until that module exists), and return `ticket_id`. Category ∈ `{ billing_saas, billing_pos, inventory, gst, kyc, other }`.

**FR-27:** The system shall issue presigned upload URLs for logo and signature (jpeg/png/webp, max 2 MB).

**FR-28:** The system shall write **AuditEvent** for: display name/logo change, Invoice Settings mutation, profile tax mutation, GSTN/IRP mutation, export summary download.

**FR-29:** The system shall keep Invoice Settings available on Free (no `PLAN_REQUIRED` for that route). Pharmacy Profile and Help are always available. GSTN/IRP UI is Owner-only even on Pro.

**FR-30:** The system shall use English copy with i18n keys `accountSettings.*`.

## 5. Non-Functional Requirements

- **Tenancy:** `location_id` on every pharmacy query.
- **Secrets:** GSTN/IRP encrypted at rest (KMS / envelope). Owner-only UI. Never in logs, CA pack, tickets, or export summary.
- **PII:** Export summary is shop business data only (catalogue §9).
- **i18n:** English ships; invoice title/T&C/footer are Owner-authored strings (not translated unless they use keys later).
- **Print:** Sample print failure does not change settings. POS print failure is `pos-billing`.
- **Performance:** Account home aggregation P95 < 400 ms with parallel reads; missing `pos-billing` aggregates as zeros.
- **Audit:** FR-28 append-only.
- **No SMS.** No shop-floor Cashfree keys.
- **Accessibility:** Checklist and KPI tiles have text, not colour-only status.

## 6. Data Model / Entities

### InvoiceSettings (this module SoR)

| Field | Type | Notes |
|---|---|---|
| `tenant_id` + `location_id` | uuid | PK |
| `template` | enum | `modern` \| `minimal` \| `thermal` default `thermal` |
| `accent_hex` | string | e.g. `#0F7B4B` |
| `logo_object_key` | string null | May share Account logo |
| `signature_object_key` | string null | Seal / signature |
| `title` | string | Default Tax Invoice |
| `invoice_prefix` | string | Unique numbering owned by `pos-billing` using this prefix |
| `credit_note_prefix` | string | Default `CN` |
| `signatory_label` | string | e.g. Authorised Signatory |
| `bank_account_holder` | string null | Printed when `print_bank` |
| `bank_account_number` | encrypted null | |
| `bank_ifsc` | string null | |
| `terms` | string null | T&C |
| `footer` | string null | |
| `show_you_saved` | boolean | “You saved…” vs MRP |
| `include_doctor` | boolean | |
| `show_hsn` | boolean | |
| `print_bank` | boolean | |
| `print_irn_ack` | boolean | When IRN/ACK present |
| `label_sku` | boolean | GRN sticker; default true |
| `label_batch` | boolean | default true |
| `label_expiry` | boolean | default true |
| `label_mrp` | boolean | default true |
| `updated_at` | timestamptz | |

### Pharmacy profile fields (written here, row owned by `tenancy`)

GSTIN, PAN, licences + expiry, e-invoicing, TDS/TCS flags, registered pharmacist, `gst_scheme=regular`, `retail=true`, `gstn_username` encrypted, `gstn_password_cipher`, `irp_username` encrypted, `irp_secret_cipher`, `irp_configured`.

### Ticket

Created via `admin-support`; this module does not own the **Ticket** table.

## 7. API / Interface Contracts (REST JSON + events + UI)

Base: `/account-settings`. Bearer. `location_id` required.

### 7.1 Account

#### `GET /account-settings/account?location_id=`

**200 data:**

```json
{
  "display_name": "Sri Krishna Medicals",
  "logo_url": "https://...",
  "business_type": "retail_chemist",
  "member_since": "2026-01-10",
  "plan": "free",
  "kpis": {
    "plan": "free",
    "team": 1,
    "seats": { "used": 1, "limit": 2, "unlimited": false },
    "invoices": 0,
    "lifetime_sales_paise": 0,
    "profile_complete_percent": 29
  },
  "usage": {
    "seats_used": 1,
    "seat_limit": 2
  },
  "checklist": [
    { "key": "logo", "complete": true, "href": "/account" },
    { "key": "signature", "complete": false, "href": "/account/invoice-settings" },
    { "key": "gstin", "complete": false, "href": "/account/settings" },
    { "key": "pan", "complete": false, "href": "/account/settings" },
    { "key": "drug_licence", "complete": false, "href": "/account/settings" },
    { "key": "fssai", "complete": false, "href": "/account/settings" },
    { "key": "bank", "complete": false, "href": "/account/settings" }
  ],
  "kyc": {
    "kyc_status": "not_submitted",
    "gstin": null,
    "pan": null,
    "drug_licence": null,
    "fssai": null,
    "pharmacist": null,
    "e_invoicing_enabled": false,
    "bank_masked": null
  }
}
```

#### `PATCH /account-settings/account?location_id=`

**Request:** `{ "display_name": "Sri Krishna Medicals" }`  
Permission: `account-settings` or Owner.

#### `POST /account-settings/account/logo/upload-url?location_id=`

Same presign pattern as Employees photo (2 MB, image/*).

#### `PUT /account-settings/account/logo?location_id=`

`{ "object_key": "..." }`

#### `POST /account-settings/account/wizard?location_id=`

Owner. Proxies `go-live-kyc` rerun / start. **200:** `{ "wizard_href": "/go-live" }`.

#### `GET /account-settings/account/export-summary?location_id=`

**200 data:** FR-12 object. Also `Accept: text/csv` for CSV. **AuditEvent** `export_summary`.

#### `POST /account-settings/account/support-link?location_id=`

**200:** `{ "url": "https://wa.me/...", "sent": false }`.

#### `POST /account-settings/account/sign-out`

Calls `auth`. **200:** `{ "signed_out": true }`.

### 7.2 Invoice Settings

#### `GET /account-settings/invoice-settings?location_id=`

Cashiers allowed (FR-15). Bank account masked except last 4 unless Owner / `account-settings`.

#### `PUT /account-settings/invoice-settings?location_id=`

Full or partial replace of FR-14 fields (except secrets-style bank number write-only: omit to keep). `go-live-kyc` step 4 may PUT `{ "invoice_prefix": "INV" }` only.

#### `POST /account-settings/invoice-settings/signature/upload-url?location_id=`

#### `PUT /account-settings/invoice-settings/signature?location_id=`

#### `POST /account-settings/invoice-settings/preview?location_id=`

**200:** `{ "html": "<div>...</div>", "paper": "80mm"|"a5" }` dummy sample. No patient PII.

#### `GET /account-settings/invoice-settings/label-template?location_id=`

**200:** `{ "label_sku": true, "label_batch": true, "label_expiry": true, "label_mrp": true }`.

### 7.3 Pharmacy Profile

#### `GET /account-settings/pharmacy-profile?location_id=`

**200 data:** identity, tax, licences, pharmacist, `tds_applicable`, `tcs_applicable`, `gst_scheme: "regular"`, `retail: true`, `gstn: { "username_masked": "ab***", "configured": false, "updated_at": null }`, `irp: { "configured": false, "updated_at": null }`. Never plaintext passwords.

#### `PUT /account-settings/pharmacy-profile?location_id=`

Owner-only. Identity/tax/licence/pharmacist/TDS/TCS. GSTIN/PAN/drug licence number change must notify `go-live-kyc` (reverify rule in that module).

#### `PUT /account-settings/pharmacy-profile/gstn-irp?location_id=`

Owner-only. **Request:** `{ "gstn_username": "...", "gstn_password": "...", "irp_username": "...", "irp_secret": "..." }` — all write-only; omitted keys unchanged; empty string clears. **200:** masked configured flags. **AuditEvent** without secrets.

### 7.4 Help

#### `GET /account-settings/help?location_id=`

**200:** `{ "faq": [ { "id", "question_key", "answer_key" } ], "whatsapp_url", "tel_url", "help_centre_url" }`.

#### `POST /account-settings/help/tickets?location_id=`

**Request:** `{ "subject": "Cannot print thermal", "category": "billing_pos", "body": "...", "contact_phone": "+91..." }`  
**201:** `{ "ticket_id": "tk_01", "status": "open" }`.

### 7.5 Events

| Event | Payload |
|---|---|
| `account-settings.invoice.updated` | `{ tenant_id, location_id, invoice_prefix }` |
| `account-settings.profile.updated` | `{ tenant_id, location_id, fields[] }` |
| `account-settings.gstn-irp.updated` | `{ tenant_id, location_id }` (no secrets) |
| `account-settings.export.summary` | `{ tenant_id, location_id, actor_user_id }` |
| `account-settings.ticket.opened` | `{ tenant_id, location_id, ticket_id }` |

UI: `'account-settings.account.changed': { location_id: string }`.

### 7.6 UI

- Sidebar **Account** group (this module’s chrome): Account, Invoice Settings, Settings, Help & Support. Other group items (Manage Users, Employees, Subscription, Refer & Earn) registered by their modules.
- `/account` — Account home: logo, name, plan, business type, member-since, Run setup wizard, Edit profile, KPI tiles, usage bars, checklist, KYC card, Sign out, Export summary, Contact support.
- `/account/invoice-settings` — form + live preview + Print sample + label toggles.
- `/account/settings` — Pharmacy Profile; GSTN/IRP section visible only to Owner.
- `/help` — FAQ, WhatsApp, call, help centre, ticket form.
- Thermal sample: CSS 80mm; `window.print()`.
- i18n English.

## 8. User Stories & Acceptance Criteria (Given/When/Then, 2-3 each)

### US-1: Account home and export are shop data, not patients

**Given** an authenticated Cashier on Free  
**When** they open Account  
**Then** they see plan, seats, checklist, KYC card, and cannot open the GSTN/IRP credential form.

**Given** the Owner  
**When** they click Export summary  
**Then** the file contains name, GSTIN, plan, invoice count, lifetime sales, seats, KYC status, and does not contain customer phones or IRP secrets.

**Given** the Owner  
**When** they click Contact support  
**Then** a `wa.me` URL opens with a pre-filled message and no **WhatsAppMessage** is sent automatically.

### US-2: Invoice Settings on Free with thermal sample

**Given** a Free shop with default settings  
**When** the Owner loads Invoice Settings  
**Then** `template` is `thermal`, preview renders 80mm sample lines, and Print sample invokes the browser print dialog without posting a **Bill**.

**Given** Owner sets `invoice_prefix` to `SKM` and `show_hsn` true  
**When** they save  
**Then** GET returns those values, **AuditEvent** is written, and `pos-billing` can read the prefix for new invoices.

**Given** a Cashier  
**When** they GET Invoice Settings  
**Then** the request succeeds so POS can print; PUT from Cashier returns 403 unless `account-settings` was granted.

### US-3: Owner-only GSTN/IRP; TDS flags only

**Given** the Owner  
**When** they PUT GSTN username and password  
**Then** subsequent GET shows `configured: true` and a masked username, never the password, and logs contain no secret.

**Given** a Manager without `account-settings`  
**When** they PUT GSTN/IRP  
**Then** the API returns 403.

**Given** `tds_applicable=true`  
**When** a **Bill** is posted at POS  
**Then** this module does not withhold TDS; the flag is stored for `reports` stubs only.

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Missing `location_id` | 400 `LOCATION_REQUIRED` |
| Invalid prefix | 400 `VALIDATION_ERROR` |
| Non-Owner GSTN PUT | 403 |
| GSTN password in GET | Must not appear; if a bug returns it, treat as P0 |
| Export includes patients | Forbidden; contract test on export keys |
| `pos-billing` down | KPIs invoices/sales = 0, Account still loads |
| `admin-support` down | Ticket POST 503 `TICKET_BACKEND_UNAVAILABLE`; UI toast; no silent success |
| Logo > 2 MB | 400 `VALIDATION_ERROR` |
| Print sample cancelled | Settings unchanged |
| KYC reject | KYC card shows rejected + reason from `go-live-kyc`; still not a posted bill |
| Composition GST toggle | Not offered; `gst_scheme` always `regular` |
| Cashfree merchant key field | Not present |

## 10. Open Questions / Assumptions

1. **Assumption:** This module owns Account, Invoice Settings, Pharmacy Profile, Help routes and Account-group chrome for those four items. Dashboard is `dashboard`. Manage Users / Employees / Subscription / Refer & Earn register their own sidebar items into the Account group.
2. **Assumption:** Profile-complete % uses seven checklist items including FSSAI even if FSSAI is optional at KYC submit.
3. **Assumption:** Invoice count and lifetime sales read posted **Bill** aggregates; zeros before `pos-billing` exists.
4. **Assumption:** `credit_note_prefix` lives on InvoiceSettings (catalogue: CN prefix from Invoice Settings).
5. **Assumption:** Support WhatsApp / tel numbers come from platform settings, not the chemist WABA (chemists do not bring a number).
6. **Assumption:** Raise-ticket creates **Ticket** for `admin-support`; until that module exists, emit `account-settings.ticket.opened` and persist an outbox row.
7. **Assumption:** GSTIN/PAN/drug licence number edits after KYC approval are forwarded to `go-live-kyc` reverify rules.
8. **Assumption:** Bank on Invoice Settings may differ from KYC bank (invoice print vs KYC); both exist.
9. **Assumption:** Amounts in KPI tiles use integer paise.
10. Vague “Plan & usage bars” is seats used/limit plus plan name, not GMV processor usage.
