# Requirement Doc: Statutory Registers (`statutory-registers`)

**Status:** v1  
**Plan gate:** Starter  
**Surface:** Pharmacy Partner Console (legal record). HQ audit copy is **not** this module.  
**Owner module:** `modules/statutory-registers/{ui,api,docs}`  
**Canonical entities:** Doctor (shop list), DutyShift  
**Stack:** React + TypeScript AWS Lambdas  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.22, §2.3 (clinical/legal, licence alerts); `docs/requirements/00-glossary.md`; `docs/requirements/00-decomposition-plan.md`

---

## 1. Summary

This module is the pharmacy’s **legal** H1 and X registers, pharmacist-on-duty clock, shop doctor list, and licence desk. The **print/export for the drug inspector is the legal record**. Platform Admin HQ (`admin-rx-compliance`) is a read-only audit copy and must not be treated as the inspector’s copy.

Every scheduled sale, dispense, or return that moves an H1 or X line **appends** a register row: date, patient identity (name + phone if named), doctor **name + registration number**, drug, batch, qty, running balance, bill no, pharmacist on duty. A name-only doctor is not enough.

Staff-POS scheduled sale is **blocked** unless `isPharmacistOnDuty()` is true. Kiosk is OTC-only and has **no** duty dependency. POS picks doctors from this shop list (add-inline allowed). Licence desk stores drug licence, FSSAI, and pharmacist registration (issue date, expiry) and sends WhatsApp at 60 / 30 / 7 days via `whatsapp` (mandatory-path: succeed or console banner).

The 2-hour Rx SLA is **not** this module (`prescriptions`).

---

## 2. Scope (in / out)

### In scope

- Tabs: **H1 register · X register · Pharmacist on duty · Licence desk**.
- Append-only register entries for H1 and X on sale / dispense / return (qty sign: sale/dispense negative stock movement; return reversing).
- Export / print for the drug inspector (Excel + formatted PDF / print).
- Shop Doctor list: name, registration number, active; POS list + add-inline.
- DutyShift: clock-in / clock-out of a registered pharmacist from `employees`.
- `isPharmacistOnDuty()`, `listDoctors()`, `appendRegisterEntry()`, `getLicences()`.
- Block signal for scheduled staff-POS when nobody is on duty (POS enforces using this API).
- Event `duty.lapsed` / `duty.ended` so POS can WhatsApp if a scheduled cart is open.
- Licence desk: drug licence, FSSAI, pharmacist registration — issue date, expiry; WhatsApp 60 / 30 / 7 days; banner until ack if send fails.
- Tenant + `location_id`. Starter plan gate.
- Patient identity on H1/X lines: name + phone if named; walk-in scheduled still needs a patient name on the bill (POS), phone omitted if walk-in.

### Out of scope

- 2-hour prescription SLA, Rx image queue (`prescriptions`).
- HQ doctor verify / Schedule-X auto-flag (`admin-rx-compliance`).
- Kiosk duty checks (kiosk never sells H/H1/X).
- Employee HR file create (`employees`); this module only clocks in pharmacists that exist there with a pharmacist registration.
- POS cart, charge, PIN (`pos-billing` / `auth`).
- Allergy / substitute prompts (POS; allergies in `customers`).
- Marketing WhatsApp (`crm`).
- SMS fallback.
- Treating HQ screens as the legal register.

---

## 3. Dependencies

| Module | Why |
|---|---|
| `tenancy` | Tenant + `location_id`. Licence identity may also appear on go-live; this module is the licence desk + alert scheduler. |
| `plan-gating` | Starter. |
| `employees` | Registered pharmacists eligible to clock in (`employee_id` + pharmacist registration number). |
| `whatsapp` | Duty-lapse send is requested by POS; licence alerts sent from this module via `whatsapp`. Mandatory-path for licence. |
| `pos-billing` | Scheduled sale: calls `isPharmacistOnDuty`, `listDoctors`, `appendRegisterEntry` after post; doctor inline create. Duty-lapse WhatsApp if cart open. |
| `returns` | H1/X return appends reversing register line. |
| `prescriptions` | May call `appendRegisterEntry` on dispense when a bill no exists; SLA is not here. |
| `inventory` | SKU schedule tag H1 vs X; batch; running balance from batch qty after movement. |
| `customers` | Named patient name + phone on the line. |
| `audit` | Duty clock, licence edit, doctor add, register append. |
| `go-live-kyc` / `account-settings` | May collect licence dates at wizard/profile; this module **stores and alerts** licence desk records (single store — see §10). |
| `admin-rx-compliance` | Downstream read-only copy; must not write this legal register. |

---

## 4. Functional Requirements

**FR-1:** The system shall require Starter (or higher) for statutory-register console routes and APIs; otherwise paywall / `403 PLAN_REQUIRED`. Register rows are retained if the plan later expires.

**FR-2:** The system shall scope Doctor, DutyShift, Licence, and RegisterEntry to tenant + `location_id`.

**FR-3:** The system shall present four tabs: **H1 register**, **X register**, **Pharmacist on duty**, **Licence desk**.

**FR-4:** The system shall append a RegisterEntry when a posted staff-POS sale, a qualifying dispense, or a customer return includes an H1 or X SKU line. Fields: `occurred_at`, patient name, patient phone if named, doctor **name**, doctor **registration number**, drug (SKU name + id), batch no, qty (negative for sale/dispense, positive for return restock as specified by `returns`), running balance (batch qty remaining at location after the movement), bill no (or CN no for return), pharmacist on duty (`employee_id` + name + pharmacist reg.).

**FR-5:** The system shall reject `appendRegisterEntry` if doctor registration number is missing or blank (`400 DOCTOR_REG_REQUIRED`). Name-only doctor is not enough.

**FR-6:** The system shall reject `appendRegisterEntry` for H1/X if no pharmacist on duty can be recorded (`400 PHARMACIST_ON_DUTY_REQUIRED`) except for a return that references the original line’s duty snapshot (store original pharmacist on the reversing row; see §10).

**FR-7:** The system shall split H1 vs X by SKU schedule tag. An H1 line never appears on the X tab and vice versa.

**FR-8:** The system shall treat the pharmacy print/export of these registers as the **legal record**. Export Excel and print-ready PDF for a date range. Header: pharmacy name, GSTIN, drug licence no, location, period, generated-at. Footer: “Pharmacy legal register — not the HQ audit copy.”

**FR-9:** The system shall not allow edit or delete of a RegisterEntry. Corrections = reversing return/CN that appends a new line.

**FR-10:** The system shall maintain a shop Doctor list: `name`, `registration_number` (identity, unique per tenant), `active`. Inactive doctors are hidden from the POS picker default but remain on historical register rows.

**FR-11:** The system shall expose `listDoctors(activeOnly=true)` for POS scheduled sale. Add-inline: if POS sends a new name + registration number, create (or reactivate) the shop Doctor and return it. Duplicate registration number updates name if provided and returns the existing id (`200`).

**FR-12:** The system shall **not** use the HQ doctor directory as a substitute for the shop list. No automatic overwrite from HQ.

**FR-13:** The system shall clock-in a registered pharmacist from `employees` (employee has pharmacist registration). Clock-in creates DutyShift `{ employee_id, started_at, ended_at: null }`. Only one open shift per employee. Multiple pharmacists may be on duty concurrently.

**FR-14:** The system shall clock-out a DutyShift (`ended_at`). After clock-out, `isPharmacistOnDuty()` is true iff at least one other open shift exists.

**FR-15:** The system shall expose `isPharmacistOnDuty()` → `{ on_duty: boolean, pharmacists: [...] }`. POS shall not charge a cart containing H/H1/X if `on_duty` is false. This module does not charge.

**FR-16:** The system shall emit `duty.ended` / `duty.lapsed` when the last open shift ends (clock-out or admin force-end). POS, if a scheduled cart is open, shall request WhatsApp via `whatsapp` (template duty/Rx pending family as catalogued). Kiosk shall ignore duty.

**FR-17:** The system shall store Licence desk records for **drug licence**, **FSSAI**, and **pharmacist registration**: number, issue date, expiry date. Owner (and users with settings permission) may edit. `getLicences()` returns them.

**FR-18:** The system shall schedule WhatsApp to the Owner at **60, 30, and 7 days** before each licence expiry (template `licence_expiry`, shop name in body) via `whatsapp` only. Purpose transactional; marketing consent not required. Dedupe `licence:{type}:{days}:{expiry_date}`.

**FR-19:** The system shall treat licence alert send as **mandatory-path**: if `whatsapp` fails after retries, show a console banner until the Owner acknowledges. Banner names the licence type and expiry. Ack dismisses the banner, not the legal expiry.

**FR-20:** The system shall expose `appendRegisterEntry` to `pos-billing`, `returns`, and `prescriptions` (when they have bill no + required clinical fields). Idempotent on `(source, source_line_id)` so a retried bill post does not duplicate inspector rows.

**FR-21:** The system shall record patient identity: named → name + phone from Customer; walk-in scheduled → patient name from the bill, phone null. Missing patient name: `400 PATIENT_IDENTITY_REQUIRED`.

**FR-22:** The system shall emit AuditEvent for duty clock-in/out, licence edits, doctor create/inline, and each register append.

**FR-23:** The system shall not block OTC-only kiosk operations based on duty.

---

## 5. Non-Functional Requirements

- English UI; i18n-ready (register headings, inspector PDF).
- Append-only register: no in-place edit. Backups/export must be reproducible for a given period.
- Inspector PDF: printable A4; includes all FR-4 columns.
- PII (patient name/phone on register) tenant-scoped; CA pack has **no** Rx images and this export is Owner/staff only — not the CA link.
- Licence WhatsApp mandatory-path + banner (catalogue reliability).
- `isPharmacistOnDuty` p95 < 150ms (POS charge path).
- Starter plan; data retained on expiry.
- Persistence via `libs/db-services`. HQ readers copy events; they do not become source of truth.

---

## 6. Data Model / Entities

### Doctor (shop list)

| Field | Type | Notes |
|---|---|---|
| `doctor_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `name` | string | not null |
| `registration_number` | string | unique per tenant; identity |
| `active` | boolean | default true |
| `created_at` | timestamptz | |
| HQ `verify` flag is **not** stored here. |

### DutyShift

| Field | Type | Notes |
|---|---|---|
| `shift_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `employee_id` | UUID | `employees`; must have pharmacist registration |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz | null = open |
| `actor_user_id` | UUID | who clocked |

Open shift: `ended_at IS NULL`. Partial unique: one open shift per `(location_id, employee_id)`.

### Licence

| Field | Type | Notes |
|---|---|---|
| `licence_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `type` | enum `drug_licence\|fssai\|pharmacist_registration` | one active row per type per location |
| `number` | string | |
| `issued_on` | date | |
| `expires_on` | date | |
| `updated_at` | timestamptz | |

### LicenceAlertAck

Banner ack: `licence_id`, `days_window` (60|30|7), `acked_at`, `actor_user_id`.

### RegisterEntry

| Field | Type | Notes |
|---|---|---|
| `entry_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `schedule` | enum `H1\|X` | |
| `occurred_at` | timestamptz | |
| `patient_name` | string | |
| `patient_phone` | string | nullable (walk-in) |
| `customer_id` | UUID | nullable |
| `doctor_name` | string | |
| `doctor_registration_number` | string | required |
| `sku_id` | UUID | |
| `drug_name` | string | snapshot |
| `batch_no` | string | |
| `qty` | decimal | signed |
| `running_balance` | decimal | batch qty after movement |
| `bill_no` | string | invoice or CN number |
| `bill_id` / `credit_note_id` | UUID | nullable as applicable |
| `pharmacist_employee_id` | UUID | |
| `pharmacist_name` | string | snapshot |
| `pharmacist_registration_number` | string | snapshot |
| `source` | enum `sale\|dispense\|return` | |
| `source_line_id` | string | idempotency |

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/v1/locations/{location_id}`  
Auth: session Bearer.

### 7.1 REST — duty

**GET** `/v1/locations/{location_id}/duty/on-duty`  
`isPharmacistOnDuty()`

```json
{
  "on_duty": true,
  "pharmacists": [
    {
      "shift_id": "s_1",
      "employee_id": "e_9",
      "name": "R. Iyer",
      "pharmacist_registration_number": "KA-12345"
    }
  ]
}
```

**POST** `/v1/locations/{location_id}/duty/clock-in`

```json
{ "employee_id": "e_9" }
```

`201` shift. Errors: `404` employee, `400 NOT_REGISTERED_PHARMACIST`, `409 SHIFT_ALREADY_OPEN`.

**POST** `/v1/locations/{location_id}/duty/clock-out`

```json
{ "shift_id": "s_1" }
```

or `{ "employee_id": "e_9" }` for that employee’s open shift. `200`. If last pharmacist leaves, emit `duty.lapsed`.

**GET** `/v1/locations/{location_id}/duty/shifts?from&to` — on-duty tab history.

### 7.2 REST — doctors

**GET** `/v1/locations/{location_id}/doctors?active=true`  
`listDoctors()`

```json
{
  "items": [
    {
      "doctor_id": "d_1",
      "name": "Dr. Mehta",
      "registration_number": "KMC-7788",
      "active": true
    }
  ]
}
```

**POST** `/v1/locations/{location_id}/doctors`  
Create or inline upsert by `registration_number`.

```json
{ "name": "Dr. Mehta", "registration_number": "KMC-7788", "active": true }
```

**PATCH** `/v1/locations/{location_id}/doctors/{doctor_id}` — name, active.

### 7.3 REST — register

**POST** `/v1/locations/{location_id}/registers/entries`  
`appendRegisterEntry()`

```json
{
  "source": "sale",
  "source_line_id": "bill:b_99:line:3",
  "schedule": "H1",
  "occurred_at": "2026-08-31T10:05:00+05:30",
  "patient_name": "Anita Sharma",
  "patient_phone": "9876543210",
  "customer_id": "c_01",
  "doctor_name": "Dr. Mehta",
  "doctor_registration_number": "KMC-7788",
  "sku_id": "sku_h1",
  "drug_name": "Alprazolam 0.25mg",
  "batch_no": "ALX0926",
  "qty": -10,
  "running_balance": 40,
  "bill_no": "INV-2026-0412",
  "bill_id": "b_99",
  "pharmacist_employee_id": "e_9"
}
```

Snapshots for pharmacist name/reg filled from Employees + open DutyShift if ids valid.

**201** `{ "entry_id": "re_1" }`  
Duplicate `source_line_id`: `200` original entry.

**GET** `/v1/locations/{location_id}/registers/{h1|x}?from&to&q`

Table rows for the tab. `q` searches patient, doctor, drug, bill no.

**GET** `/v1/locations/{location_id}/registers/{h1|x}/export?format=xlsx|pdf&from&to`

Legal printout.

### 7.4 REST — licences

**GET** `/v1/locations/{location_id}/licences`  
`getLicences()`

```json
{
  "items": [
    {
      "licence_id": "l_1",
      "type": "drug_licence",
      "number": "KA-20-123456",
      "issued_on": "2024-01-15",
      "expires_on": "2026-10-31"
    }
  ],
  "banners": [
    {
      "licence_id": "l_1",
      "type": "drug_licence",
      "days_window": 30,
      "expires_on": "2026-10-31",
      "reason": "whatsapp_failed",
      "acknowledged": false
    }
  ]
}
```

**PUT** `/v1/locations/{location_id}/licences/{type}`  
Owner/settings. Replaces number, issue, expiry. Reschedules alerts.

**POST** `/v1/locations/{location_id}/licences/{licence_id}/alerts/{60|30|7}/ack`  
Dismiss mandatory-path banner.

### 7.5 Events emitted

| Event | Listeners |
|---|---|
| `register.entry.appended` | `admin-rx-compliance` (audit copy), `audit` |
| `duty.started` / `duty.ended` / `duty.lapsed` | `pos-billing` (block / WhatsApp if scheduled cart open), `audit` |
| `licence.updated` | `account-settings` projection, `audit` |
| `licence.alert.failed` | console banner |
| `doctor.upserted` | POS picker cache |

Licence send: this module → `whatsapp.send` (template `licence_expiry`).

### 7.6 UI

- Route `/statutory-registers` (or `/registers`) with four tabs.
- H1 / X: date filter, search, table FR-4 columns, Export Excel, Print PDF.
- On duty: list eligible pharmacists from `employees`, clock-in/out, who is on duty now, shift history.
- Licence desk: three cards (drug, FSSAI, pharmacist registration), dates, save; banner if WhatsApp failed.
- Doctors: may live on this module (list + add) and as POS inline modal hitting the same API.

---

## 8. User Stories & Acceptance Criteria

### US-1: Scheduled POS blocked without duty

**Given** no open DutyShift  
**When** POS calls `isPharmacistOnDuty()`  
**Then** `on_duty` is false and POS must not charge a scheduled cart.

**Given** pharmacist R. Iyer (registered in Employees) clocks in  
**When** POS calls again  
**Then** `on_duty` is true and that pharmacist is listed for the register snapshot.

### US-2: Inspector printout is the legal H1 row

**Given** a posted H1 sale with named customer, doctor name **and** registration number, batch, qty, bill no, pharmacist on duty  
**When** staff export H1 PDF for that day  
**Then** the row contains all of those fields and the document states it is the pharmacy legal register.

**Given** POS attempts append with doctor name only  
**When** `appendRegisterEntry` runs  
**Then** the API returns `400 DOCTOR_REG_REQUIRED` and no row is stored.

### US-3: Licence 30-day WhatsApp mandatory-path

**Given** FSSAI expires in 30 days  
**When** the scheduler runs  
**Then** `whatsapp` is asked to send `licence_expiry` to the Owner (no marketing consent).

**Given** that send fails after retries  
**When** any console page loads  
**Then** a banner remains until the Owner acks; the licence row is unchanged.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Clock-in non-pharmacist employee | `400 NOT_REGISTERED_PHARMACIST` |
| Double clock-in same employee | `409 SHIFT_ALREADY_OPEN` |
| Last pharmacist clocks out, scheduled POS cart open | `duty.lapsed`; POS sends WhatsApp; charge blocked until new clock-in |
| Kiosk OTC cart | no duty API required |
| Duplicate bill line append | idempotent 200 |
| Return of H1/X | new register line; running balance up if restock |
| Missing patient name | `400 PATIENT_IDENTITY_REQUIRED` |
| HQ verify of a doctor | does not change shop list |
| Plan Free | paywall; POS scheduled still needs duty legally — if module locked, POS cannot sell H1/X (Starter feature). OTC cash still Free |
| WhatsApp licence fail | banner; no SMS |
| Two H1 lines one bill | two register entries (per line) |
| Running balance concurrent | same transactional stock decrement as POS; balance = qty after that txn |

---

## 10. Open Questions / Assumptions

1. **Single licence store:** licence desk in this module is the record used for alerts. Go-live wizard / Account profile **write the same rows** (or call these APIs). Do not keep a second expiry date.
2. **2-hour Rx SLA** is entirely `prescriptions`.
3. **Duty-lapse WhatsApp** is triggered by POS holding an open scheduled cart when it observes `duty.lapsed` (POS owns cart state). This module emits the event; it does not query open carts.
4. **Returns** snapshot the original pharmacist on the reversing row if nobody is on duty at return time, so FR-6 does not block reversing the legal register.
5. **Walk-in scheduled:** allowed only if POS collects a patient **name** (phone optional). Khata still forbidden for walk-in. If product later forbids walk-in H1/X entirely, that is a POS spec change; this module still requires name + doctor reg + duty.
6. **Running balance** is the batch’s on-hand qty at this location after the movement (not a separate narcotic book qty).
7. **H vs H1:** H (non-H1) scheduled still needs doctor + duty at POS; this **legal print register** is H1 and X tabs only, as in §3.22.
8. **Pharmacist registration** on licence desk is the **shop’s** registered pharmacist licence (go-live field), distinct from each Employee’s registration used at clock-in. Both exist.
9. Eligible clock-in list = Employees with a pharmacist registration number present, status active.
10. Inspector export is not sent to HQ automatically; HQ consumes `register.entry.appended` for audit copy only.
11. Mandatory-path banner is per licence × window (60/30/7), not a single global banner.
