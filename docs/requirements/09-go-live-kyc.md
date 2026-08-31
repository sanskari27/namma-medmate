# Requirement Doc: Go-Live KYC (`go-live-kyc`)

## 1. Summary (one paragraph)

Go-Live KYC owns **KYC status on Pharmacy** and the Owner **go-live wizard** in the Pharmacy Partner Console. Namma HQ approves or rejects chemist KYC (GSTIN, PAN, Drug Licence, FSSAI, registered pharmacist, e-Invoicing, bank) with a reason; `admin-tenants` may also **display** the same queue, but this module is the system of record for KYC status and the wizard. No console **Bill** may be posted until KYC is **approved** and the Owner has completed the wizard (or confirmed skips where allowed). Wizard steps collect pharmacy profile, invoke opening-stock CSV (`inventory`), collect opening books for `books-gst` to post (including a **Start at ₹0** skip), collect invoice prefix and a thermal print-sample confirmation (`account-settings`), and optionally create the first staff **User** plus counter PIN (`manage-users` / `auth`). Re-run is available from Settings. A KYC reject blocks go-live even if the wizard is filled. UI in `modules/go-live-kyc/ui` via `@namma-medmate/api-client`; API in `modules/go-live-kyc/api`. Every pharmacy query includes tenant + `location_id`.

## 2. Scope (in / out)

### In scope

- Pharmacy Partner Console go-live wizard (five steps) and wizard re-run.
- **KYC** submission fields on **Pharmacy**: GSTIN, PAN, Drug Licence, FSSAI, registered pharmacist, e-Invoicing flag, bank.
- KYC status machine: `not_submitted` → `pending` → `approved` | `rejected`; resubmit from `rejected` → `pending`.
- HQ Approve / Reject with reason (this module’s API). Queue list for HQ.
- Go-live **gate** API consumed by `pos-billing`: posted **Bill** allowed only when `kyc_status=approved` AND `wizard_status=completed`.
- Orchestration of later modules: opening stock CSV ingest (`inventory`), opening books post (`books-gst`), invoice prefix + print sample (`account-settings`), first User + PIN (`manage-users` / `auth`).
- **AuditEvent** on KYC submit / approve / reject and wizard complete.
- English, i18n-ready.

### Out of scope

- Command-center chrome and tenant list UI (`admin-tenants` **shows** the queue; does not own status).
- Persistence of SKU / **Batch** rows (opening CSV ingest owned by `inventory`).
- Journal / **ChartOfAccount** posting (owned by `books-gst`).
- Live Invoice Settings templates beyond prefix + sample confirmation (`account-settings`).
- Ongoing licence WhatsApp alerts (`statutory-registers` / `whatsapp`).
- Shop-floor Cashfree GMV, SMS, branches product.
- CA filing on GSTN.

## 3. Dependencies (modules + external)

| Dependency | Why |
|---|---|
| `tenancy` | **Pharmacy** / **Location** identity; profile fields written through tenancy persistence. |
| `plan-gating` | Wizard and KYC are always reachable (not a paid module). Gate is legal / ops, not a plan lock. |
| `audit` | KYC and wizard completion **AuditEvent**. |
| `manage-users` | Step 5: create first non-Owner **User** + PIN. |
| `auth` | Step 5: PIN hash for that User and for Owner if PIN set here. |
| `inventory` (later) | Step 2: opening stock CSV ingest. Wizard invokes; does not parse stock itself. |
| `books-gst` (later) | Step 3: opening cash / optional khata / AP journals. Wizard collects; books posts. |
| `account-settings` (later) | Step 4: invoice prefix + thermal print sample. Wizard collects / confirms; Invoice Settings is SoR. |
| `pos-billing` (later consumer) | Must call the gate before posting a **Bill**. |
| `admin-tenants` (later UI) | Renders HQ queue using this module’s admin APIs. |
| `@namma-medmate/api-client` | Console + HQ clients. |

External: none for KYC decision (human HQ). No Cashfree in this module.

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall store on **Pharmacy** (tenant + `location_id`): `kyc_status`, `kyc_submitted_at`, `kyc_decided_at`, `kyc_reject_reason`, `wizard_status`, `wizard_completed_at`, and the KYC field set in §6.

**FR-2:** The system shall require `location_id` on every pharmacy go-live / KYC query and mutation (`LOCATION_REQUIRED`).

**FR-3:** The system shall isolate pharmacy wizard data by tenant. HQ admin routes are platform-scoped and authorised to Namma Super admin / Ops / Compliance only.

**FR-4:** The system shall use `kyc_status` ∈ `{ not_submitted, pending, approved, rejected }`. New **Pharmacy** starts `not_submitted`.

**FR-5:** The system shall accept a KYC submit payload with: `gstin`, `pan`, `drug_licence_no`, `drug_licence_expiry`, `fssai_no`, `fssai_expiry` (FSSAI optional but if number present expiry required), `pharmacist_name`, `pharmacist_registration_no`, `pharmacist_registration_expiry`, `e_invoicing_enabled` (boolean), `bank_account_holder`, `bank_account_number`, `bank_ifsc`. GSTIN, PAN, drug licence (number + expiry), registered pharmacist (name + registration no + expiry), e-invoicing flag, and bank (holder + account number + IFSC) are required (`KYC_FIELDS_INCOMPLETE`).

**FR-6:** The system shall on valid submit set `kyc_status=pending`, stamp `kyc_submitted_at`, clear `kyc_reject_reason`, emit `go-live-kyc.kyc.submitted`, and append **AuditEvent**.

**FR-7:** The system shall allow HQ to **Approve** a pending KYC: set `kyc_status=approved`, `kyc_decided_at=now`, `kyc_reject_reason=null`. Approve of a non-pending record shall fail `KYC_NOT_PENDING`.

**FR-8:** The system shall allow HQ to **Reject** a pending KYC with required `reason` (1–500 chars): set `kyc_status=rejected`, store reason, stamp `kyc_decided_at`. Reject of non-pending → `KYC_NOT_PENDING`.

**FR-9:** The system shall block go-live when `kyc_status=rejected` even if `wizard_status=completed` (`GO_LIVE_KYC_REJECTED` on the gate).

**FR-10:** The system shall allow the Owner to resubmit KYC from `rejected` (or update from `not_submitted`). Resubmit sets `pending` again. While `approved`, profile edits from the wizard / Settings shall not reset KYC to pending unless GSTIN, PAN, or drug licence number **changes**; those changes set `kyc_status=pending` and revoke go-live until re-approved (`KYC_REVERIFY_REQUIRED`).

**FR-11:** The system shall expose `GET /go-live-kyc/gate?location_id=` returning `{ "allowed": boolean, "kyc_status", "wizard_status", "blockers": string[] }` where `allowed` is true only if `kyc_status=approved` AND `wizard_status=completed`.

**FR-12:** The system shall refuse `allowed=true` while KYC is `not_submitted` or `pending` (`GO_LIVE_KYC_INCOMPLETE` in `blockers`).

**FR-13:** The system shall model wizard steps 1–5 with per-step status `not_started | in_progress | completed | skipped`. `wizard_status` is `not_started | in_progress | completed`.

**FR-14:** The system shall treat wizard **completed** when: step 1 completed; step 2 completed (including a zero-row CSV); step 3 completed **or** skipped via Start at ₹0; step 4 completed (prefix saved and print sample confirmed); step 5 completed **or** skipped as Owner-only.

**FR-15:** **Step 1 — Pharmacy profile.** The system shall persist GSTIN, drug licence + expiry, FSSAI + expiry if provided, registered pharmacist name + registration no + expiry, `e_invoicing_enabled`. Completing step 1 shall also upsert the same identity onto the KYC field set if KYC not yet approved (does not auto-submit KYC; Owner still submits KYC).

**FR-16:** **Step 2 — Opening stock CSV.** The system shall accept a CSV upload (or an explicit `zero_stock: true` with no rows). The system shall invoke `inventory` opening-stock ingest with `tenant_id`, `location_id`, and the file or empty declaration. This module shall not write **Batch** qty. Zero stock is a valid completion.

**FR-17:** **Step 3 — Opening books.** The system shall collect `cash_in_till_paise` (≥ 0) and optional `opening_khata[]` and `opening_ap[]`. The system shall invoke `books-gst` to post opening journals. If the Owner confirms **Start at ₹0**, the system shall send zeros / empty arrays with `start_at_zero: true` and mark the step `skipped` (counts as done for FR-14). The system shall not post journals itself.

**FR-18:** **Step 4 — Invoice prefix + thermal print sample.** The system shall collect `invoice_prefix` (2–10 alphanumeric) and `print_sample_confirmed` (boolean must be true to complete). The system shall invoke `account-settings` to persist prefix. Print sample uses Invoice Settings thermal template (default) via browser print; this module only records confirmation.

**FR-19:** **Step 5 — First user + counter PIN.** If the Owner selects **Owner-only**, the system shall mark step 5 `skipped` after ensuring the Owner User has a counter PIN set (PIN 4–6 digits via `auth`). If the Owner adds a first staff User, the system shall call `manage-users` create (seat cap still applies) and may set that User’s PIN. Failure of `SEAT_CAP_REACHED` shall not complete the step.

**FR-20:** The system shall only allow the **Owner** User to submit KYC, complete wizard steps, and re-run the wizard (`OWNER_ONLY`). Managers shall not, unless later granted — v1: Owner only.

**FR-21:** The system shall allow **Re-run wizard** from Settings after completion. Re-run sets `wizard_status=in_progress` but shall not un-post historical **Bill**s. Step 2 re-run shall not duplicate batches: `inventory` ingest must be idempotent or the wizard shall offer Skip if opening stock already posted (`opening_stock_already_posted`). Step 3 re-run shall not post a second opening journal if `books-gst` reports openings already posted; Owner may Skip.

**FR-22:** The system shall list HQ KYC queue items with `kyc_status=pending` (filter: pending / approved / rejected / all), including pharmacy name, GSTIN, submitted_at, plan.

**FR-23:** The system shall require HQ reject `reason` and shall surface that reason on the chemist wizard KYC card.

**FR-24:** The system shall not allow `pos-billing` to treat the gate as optional: the gate contract is the only go-live check this module owns. Feature flags shall not bypass KYC in production.

**FR-25:** The system shall write **AuditEvent** for KYC submit, approve, reject, wizard step complete, wizard complete, go-live allowed transition.

**FR-26:** The system shall not log bank account numbers or full Aadhaar (Aadhaar is not a KYC field here; PAN may appear masked in HQ list).

**FR-27:** The system shall validate GSTIN as 15-character Indian GSTIN pattern and PAN as `AAAAA9999A` pattern. Drug licence and FSSAI are non-empty strings with expiry dates in the future **or** today-or-future at submit time; expired licence may still be submitted but HQ may reject (this module does not auto-reject on expiry).

**FR-28:** The system shall keep wizard progress durable per `location_id` so a refresh does not lose completed steps.

**FR-29:** The system shall emit `go-live-kyc.gate.changed` whenever `allowed` flips, for `pos-billing` and dashboard banners.

## 5. Non-Functional Requirements

- **Tenancy:** Pharmacy APIs: session tenant + `location_id`. HQ APIs: platform RBAC, target `tenant_id` in path.
- **i18n:** English; keys `goLiveKyc.*`.
- **Security:** HQ approve / reject is Namma staff only. Chemist cannot self-approve. Bank account number encrypted at rest.
- **Audit:** Append-only for FR-25.
- **Idempotency:** KYC submit with `Idempotency-Key`; HQ approve / reject idempotent if already in the target state (second approve of already approved returns 200 with current status, no extra **AuditEvent**).
- **Performance:** Gate GET P95 < 50 ms (cached on Pharmacy row).
- **Reliability:** If `inventory` / `books-gst` / `account-settings` is down, the step fails visibly; wizard_status stays `in_progress`; no silent `completed`.
- **No SMS.** No shop-floor Cashfree. No branch wizard.

## 6. Data Model / Entities

KYC and wizard columns live on **Pharmacy** / **Location** (tenancy row) plus a `wizard_progress` jsonb owned by this module’s service.

### Pharmacy fields (this module writes via tenancy)

| Field | Type | Notes |
|---|---|---|
| `kyc_status` | enum | `not_submitted` \| `pending` \| `approved` \| `rejected` |
| `kyc_submitted_at` | timestamptz null | |
| `kyc_decided_at` | timestamptz null | |
| `kyc_reject_reason` | string null | HQ |
| `kyc_gstin` | string | |
| `kyc_pan` | string | |
| `kyc_drug_licence_no` | string | |
| `kyc_drug_licence_expiry` | date | |
| `kyc_fssai_no` | string null | |
| `kyc_fssai_expiry` | date null | |
| `kyc_pharmacist_name` | string | |
| `kyc_pharmacist_registration_no` | string | |
| `kyc_pharmacist_registration_expiry` | date | |
| `kyc_e_invoicing_enabled` | boolean | |
| `kyc_bank_account_holder` | string | |
| `kyc_bank_account_number` | encrypted | |
| `kyc_bank_ifsc` | string | |
| `wizard_status` | enum | `not_started` \| `in_progress` \| `completed` |
| `wizard_completed_at` | timestamptz null | |

### WizardProgress (jsonb)

```json
{
  "steps": {
    "1_profile": { "status": "completed", "updated_at": "..." },
    "2_opening_stock": { "status": "completed", "zero_stock": true, "ingest_id": null },
    "3_opening_books": { "status": "skipped", "start_at_zero": true, "journal_ids": [] },
    "4_invoice": { "status": "completed", "invoice_prefix": "INV", "print_sample_confirmed": true },
    "5_first_user": { "status": "skipped", "owner_only": true, "created_user_id": null, "owner_pin_set": true }
  }
}
```

**Bill** is not stored here. **DutyShift** is not stored here. **SaasSubscription** is independent (a shop can be KYC-pending on Free).

## 7. API / Interface Contracts (REST JSON + events + UI)

Base: `/go-live-kyc`. Bearer. Pharmacy routes: `location_id` query. HQ routes: `/go-live-kyc/admin/...`.

### 7.1 Pharmacy REST

#### `GET /go-live-kyc/gate?location_id=`

Any authenticated staff of the tenant (so POS can check).

**200 data:**

```json
{
  "allowed": false,
  "kyc_status": "pending",
  "wizard_status": "in_progress",
  "blockers": ["GO_LIVE_KYC_INCOMPLETE", "GO_LIVE_WIZARD_INCOMPLETE"]
}
```

When rejected: `blockers` includes `GO_LIVE_KYC_REJECTED` and `reject_reason` is included as a sibling field `"reject_reason": "..."`.

#### `GET /go-live-kyc/status?location_id=`

Owner (and Manager if we later grant; v1 Owner for full KYC fields). Returns KYC statuses, masked bank (`****6789`), wizard_progress, gate.allowed.

#### `PUT /go-live-kyc/kyc?location_id=`

Owner. Submit / resubmit KYC body (FR-5). **200 data:** `{ "kyc_status": "pending", "submitted_at": "..." }`.

#### `GET /go-live-kyc/wizard?location_id=`

Owner. Returns `wizard_status`, `steps`, `gate`.

#### `PUT /go-live-kyc/wizard/steps/1?location_id=`

**Request:**

```json
{
  "gstin": "29ABCDE1234F1Z5",
  "drug_licence_no": "KA-20-123456",
  "drug_licence_issue": "2022-01-15",
  "drug_licence_expiry": "2027-01-14",
  "fssai_no": "11223344556677",
  "fssai_expiry": "2026-12-31",
  "pharmacist_name": "Anita Sharma",
  "pharmacist_registration_no": "KA-12345",
  "pharmacist_registration_expiry": "2027-03-31",
  "e_invoicing_enabled": false
}
```

**200 data:** step 1 status `completed`.

#### `POST /go-live-kyc/wizard/steps/2/upload-url?location_id=`

**Request:** `{ "file_name": "opening-stock.csv", "content_type": "text/csv", "byte_size": 2048 }`  
**200 data:** `{ "upload_url", "object_key", "expires_in_seconds": 600 }`

#### `POST /go-live-kyc/wizard/steps/2?location_id=`

**Request:** `{ "object_key": "tenants/.../opening.csv" }` **or** `{ "zero_stock": true }`  
Invokes `inventory` ingest. **200 data:** `{ "status": "completed", "zero_stock": true, "ingest_id": "..." }`.

If `inventory` not deployed yet, the API still records `zero_stock` / `object_key` and `ingest_pending: true`; step may complete for zero_stock immediately; non-zero file remains `in_progress` until ingest succeeds (see §10).

#### `PUT /go-live-kyc/wizard/steps/3?location_id=`

**Request:**

```json
{
  "start_at_zero": false,
  "cash_in_till_paise": 500000,
  "opening_khata": [
    { "customer_name": "Ramesh", "phone": "+919900011122", "balance_paise": 120000 }
  ],
  "opening_ap": [
    { "party_name": "MediDist Pvt Ltd", "gstin": "29AAAAA0000A1Z5", "balance_paise": 800000 }
  ]
}
```

Or `{ "start_at_zero": true }`. Invokes `books-gst`. Amounts are integer paise.

**200 data:** `{ "status": "skipped"|"completed", "start_at_zero": true }`.

#### `PUT /go-live-kyc/wizard/steps/4?location_id=`

**Request:** `{ "invoice_prefix": "INV", "print_sample_confirmed": true }`  
`print_sample_confirmed` false → 422 `PRINT_SAMPLE_REQUIRED`. Prefix pattern `^[A-Z0-9]{2,10}$`.

#### `PUT /go-live-kyc/wizard/steps/5?location_id=`

**Request (Owner-only skip):** `{ "owner_only": true, "owner_pin": "1234" }`  
**Request (add user):** `{ "owner_only": false, "owner_pin": "1234", "user": { "login_id": "cashier1", "role": "cashier", "password_enabled": true, "otp_enabled": false, "pin": "5566" } }`

Calls `manage-users` / `auth`. **200 data:** `{ "status": "completed"|"skipped", "created_user_id": null }`.

#### `POST /go-live-kyc/wizard/complete?location_id=`

Validates FR-14. Sets `wizard_status=completed`. If KYC not approved, gate remains `allowed=false`.

#### `POST /go-live-kyc/wizard/rerun?location_id=`

Owner. Sets `wizard_status=in_progress`. Does not change `kyc_status`.

### 7.2 HQ REST (Namma Super admin / Ops / Compliance)

#### `GET /go-live-kyc/admin/queue?status=pending&page=1&page_size=20`

**200 data:**

```json
{
  "items": [
    {
      "tenant_id": "t_01",
      "location_id": "l_01",
      "pharmacy_name": "Sri Krishna Medicals",
      "gstin": "29ABCDE1234F1Z5",
      "kyc_status": "pending",
      "submitted_at": "2026-08-30T10:00:00Z",
      "plan": "free"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```

No full bank account number.

#### `GET /go-live-kyc/admin/pharmacies/{tenant_id}?location_id=`

Full KYC fields with bank account masked except last 4. Used by HQ drawer and by `admin-tenants` UI.

#### `POST /go-live-kyc/admin/pharmacies/{tenant_id}/kyc/approve?location_id=`

**Request:** `{ }`  
**200 data:** `{ "kyc_status": "approved" }`.

#### `POST /go-live-kyc/admin/pharmacies/{tenant_id}/kyc/reject?location_id=`

**Request:** `{ "reason": "Drug licence image does not match GSTIN legal name." }`  
**200 data:** `{ "kyc_status": "rejected", "reason": "..." }`.

### 7.3 Invoked contracts (owned elsewhere)

- `inventory`: `POST /inventory/opening-stock` `{ location_id, zero_stock | object_key }` → `{ ingest_id }`.
- `books-gst`: `POST /books-gst/openings` `{ location_id, start_at_zero, cash_in_till_paise, opening_khata, opening_ap }` → `{ journal_ids[] }`.
- `account-settings`: `PUT /account-settings/invoice-settings` `{ location_id, invoice_prefix }` (partial).
- `manage-users`: `POST /manage-users/users`.
- `auth`: PIN set.

### 7.4 Events

| Event | Payload |
|---|---|
| `go-live-kyc.kyc.submitted` | `{ tenant_id, location_id }` |
| `go-live-kyc.kyc.approved` | `{ tenant_id, location_id, actor_admin_id }` |
| `go-live-kyc.kyc.rejected` | `{ tenant_id, location_id, reason }` |
| `go-live-kyc.wizard.step.completed` | `{ tenant_id, location_id, step }` |
| `go-live-kyc.wizard.completed` | `{ tenant_id, location_id }` |
| `go-live-kyc.gate.changed` | `{ tenant_id, location_id, allowed }` |

UI: `'go-live-kyc.wizard.updated': { location_id: string }`.

### 7.5 UI

**Pharmacy:** full-screen wizard (Owner) after signup and from Account **Run setup wizard**. Steps 1–5 with continue / skip (skip only where FR-14 allows). Banner if KYC rejected showing HQ reason. Cannot navigate to POS charge while gate.allowed is false (POS also enforces).

**HQ:** This module ships `modules/go-live-kyc/ui` admin widgets (approve / reject) consumed by Command center. `admin-tenants` may embed the same API.

## 8. User Stories & Acceptance Criteria (Given/When/Then, 2-3 each)

### US-1: Gate blocks posted bills until KYC and wizard are done

**Given** a new **Pharmacy** with `kyc_status=not_submitted` and `wizard_status=not_started`  
**When** `pos-billing` calls `GET /go-live-kyc/gate`  
**Then** `allowed` is false and `blockers` include `GO_LIVE_KYC_INCOMPLETE` and `GO_LIVE_WIZARD_INCOMPLETE`.

**Given** the Owner completed all wizard steps including Start at ₹0 and print sample, but HQ has not approved KYC  
**When** the gate is read  
**Then** `wizard_status` is `completed`, `allowed` is still false, blocker `GO_LIVE_KYC_INCOMPLETE` or `GO_LIVE_KYC_REJECTED` as applicable.

**Given** `kyc_status=approved` and `wizard_status=completed`  
**When** the gate is read  
**Then** `allowed` is true and `blockers` is empty.

### US-2: HQ reject blocks go-live; chemist resubmits

**Given** a pending KYC  
**When** Compliance POSTs reject with reason “FSSAI missing for food SKUs”  
**Then** `kyc_status=rejected`, the chemist status API returns that reason, and the gate `allowed` is false even if the wizard is completed.

**Given** rejected KYC  
**When** the Owner PUTs an updated KYC payload  
**Then** `kyc_status` becomes `pending`, reject reason is cleared, and HQ sees the shop on the pending queue again.

**Given** already `approved`  
**When** HQ POSTs approve again  
**Then** the API returns 200 with `kyc_status=approved` and does not write a duplicate decision **AuditEvent**.

### US-3: Opening stock may be zero; step 5 may be Owner-only

**Given** the Owner on step 2  
**When** they submit `{ "zero_stock": true }`  
**Then** step 2 is `completed`, `inventory` is invoked with zero stock, and no **Batch** is required to proceed.

**Given** the Owner on step 3  
**When** they submit `{ "start_at_zero": true }`  
**Then** step 3 is `skipped`, `books-gst` is invoked with zeros, and FR-14 still counts the step as satisfied.

**Given** the Owner on step 5  
**When** they submit `{ "owner_only": true, "owner_pin": "4455" }`  
**Then** step 5 is `skipped`, Owner PIN is set via `auth`, and no additional **User** is created.

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Charge before gate | `pos-billing` must not post **Bill**; this module returns `allowed: false` |
| KYC rejected after wizard complete | Gate false; `GO_LIVE_KYC_REJECTED` |
| HQ approve while not pending | 409 `KYC_NOT_PENDING` |
| Reject without reason | 400 `VALIDATION_ERROR` |
| Invalid GSTIN / PAN | 400 `VALIDATION_ERROR` |
| Print sample not confirmed | 422 `PRINT_SAMPLE_REQUIRED` |
| Step 5 add user at seat cap | 409 `SEAT_CAP_REACHED`; step not completed |
| `inventory` ingest fail | Step 2 stays `in_progress`; error `OPENING_STOCK_FAILED`; no silent complete |
| `books-gst` fail | Step 3 stays `in_progress`; `OPENING_BOOKS_FAILED` |
| Second opening books on re-run | 409 `OPENING_BOOKS_ALREADY_POSTED`; Owner skips |
| Non-Owner completes wizard | 403 `OWNER_ONLY` |
| GSTIN change after approve | `kyc_status=pending`; gate false until re-approve |
| FSSAI omitted | Allowed; HQ may still reject |
| Expired drug licence at submit | Accepted; HQ may reject |
| Duplicate webhook N/A | This module has no Cashfree |
| Missing `location_id` | 400 `LOCATION_REQUIRED` |

## 10. Open Questions / Assumptions

1. **Assumption (per brief):** KYC fields = GSTIN, PAN, Drug Licence, FSSAI, registered pharmacist, e-Invoicing, bank. HQ Approve / Reject with reason.
2. **Assumption:** v1 wizard mutations are Owner-only (`OWNER_ONLY`).
3. **Assumption:** Changing GSTIN, PAN, or drug licence number after approval reopens KYC (`pending`) and closes the gate. Other profile edits do not.
4. **Assumption:** FSSAI is optional at submit; drug licence is required.
5. **Assumption:** Zero opening stock and Start at ₹0 are the only skips that still satisfy FR-14, plus Owner-only on step 5.
6. **Assumption:** Re-run cannot duplicate opening journals or opening stock; those steps become Skip if already posted.
7. **Assumption:** Amounts in paise (integer).
8. **Assumption:** `admin-tenants` will call this module’s admin APIs; this module may still ship a minimal HQ queue widget.
9. **Assumption:** If `inventory` / `books-gst` / `account-settings` are not yet implemented, wizard stores the payload and `ingest_pending` / equivalent; gate cannot be `allowed` for a non-zero stock file until ingest succeeds. Zero stock and Start at ₹0 can complete without those modules by recording the skip locally and emitting the command for later consumers.
10. **Assumption:** Licence issue dates are stored when provided; expiry is required for drug licence and pharmacist registration.
11. Vague “confirms skips where allowed” is FR-14 + FR-17 + FR-19.
