# Requirement Doc: Prescriptions (`prescriptions`)

**Status:** v1  
**Plan gate:** Starter  
**Surface:** Pharmacy Partner Console; live sidebar badge  
**Owner module:** `modules/prescriptions/{ui,api,docs}`  
**Canonical concern:** staff-uploaded Rx queue (no new glossary row; uses Customer, Doctor, Bill, SKU)  
**Stack:** React + TypeScript AWS Lambdas  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.5, §2.3 (2-hour SLA), §2.5 (Rx upload only at counter); `docs/requirements/00-glossary.md`; `docs/requirements/00-decomposition-plan.md`

---

## 1. Summary

Prescriptions is the **clinical queue for paper Rx that staff upload at the counter** (photo or PDF). The product **does not ingest patient WhatsApp media**. If a patient sent an Rx on personal WhatsApp, staff still upload it here.

SLA clock **starts at upload**. Overdue at **2 hours**: banner plus WhatsApp ping to the chemist via `whatsapp`. Status tabs: Pending / Approved / Dispensed / Rejected / All. Source label: **Uploaded at counter**.

Staff verify medicines (stock and price, OOS warnings, estimated bill), then **Reject** (presets or custom; patient asked to re-send via WhatsApp — still a staff upload later), **Approve**, **Dispense**, or **Dispense → billing** (verified basket lands in POS). Allergy and substitute checks run when the basket is in POS (POS owns those prompts). H1/X lines post to the **pharmacy legal register** on dispense/sale (`statutory-registers`). Rejected Rx cannot be dispensed. A line without stock cannot be dispensed.

Dashboard/shell live badge **pending Prescriptions** reads this module’s count API.

---

## 2. Scope (in / out)

### In scope

- Upload photo/PDF at counter; attach patient (named preferred), doctor name + registration number (shop list / inline via `statutory-registers`).
- KPIs: Pending review (with over-SLA count), Awaiting dispense, Dispensed today (count + value), Average turnaround, SLA on-time %.
- Overdue banner at 2 hours; overdue WhatsApp to chemist.
- Status tabs: Pending / Approved / Dispensed / Rejected / All. Source: Uploaded at counter.
- Cards urgent first: patient, doctor (name + reg. no.), verified medicines with stock and price, OOS warnings, estimated bill.
- Actions: Reject (illegible, unverified prescriber, expired, not stocked, or custom) · Approve · Dispense · Dispense → billing.
- Reject reasons logged; WhatsApp ask patient to re-send (via `whatsapp`; media replies are **not** ingested).
- Stock check on dispense; block line without stock.
- `GET` pending count for sidebar badge.
- Link Rx to posted Bill when Dispense → billing completes.
- Call `statutory-registers.appendRegisterEntry` for H1/X when sale posts (POS) and/or when Dispense is recorded with a `bill_id`.
- Starter plan. Tenant + `location_id`. PII (Rx image) tenant-scoped; CA pack never includes Rx images.

### Out of scope

- Ingesting inbound patient WhatsApp images/PDFs.
- Allergy acknowledge UI and substitute confirm UI (POS).
- Legal H1/X printout (statutory-registers).
- Kiosk Rx upload (kiosk has no prescription upload).
- 2-hour SLA for anything except this queue.
- HQ audit queue (`admin-rx-compliance` reads copies; not the chemist workflow).
- Automatic dispense without staff action.
- Customer debit notes.

---

## 3. Dependencies

| Module | Why |
|---|---|
| `tenancy` | Tenant + `location_id`. |
| `plan-gating` | Starter. |
| `customers` | Named patient; Rx tag; allergies stored there — POS checks at billing. |
| `inventory` | SKU stock, price, schedule, OOS. |
| `statutory-registers` | Doctor list + inline; `appendRegisterEntry` for H1/X; duty is POS concern at charge. |
| `pos-billing` | Dispense → billing seeds the cart; bill post marks Dispensed; allergy/substitute. |
| `whatsapp` | Overdue ping chemist; reject “please re-send” to patient phone. |
| `dashboard` / shell | Pending count badge. |
| `audit` | Upload, approve, reject, dispense. |
| `returns` | Not owned here; CN may not reopen a rejected Rx. |

---

## 4. Functional Requirements

**FR-1:** The system shall require Starter (or higher) for prescription routes and APIs; otherwise paywall / `403 PLAN_REQUIRED`. Queue rows are retained if the plan expires.

**FR-2:** The system shall scope every Prescription and Rx image object to tenant + `location_id`. Other tenants shall receive `404` for unknown ids.

**FR-3:** The system shall create a Prescription only when staff upload a photo (jpeg/png/webp) or PDF at the counter. The system shall not create queue rows from inbound WhatsApp media.

**FR-4:** The system shall set `source = uploaded_at_counter` on every v1 row and show that label on cards. SLA `sla_started_at = uploaded_at`. Overdue when `now - sla_started_at > 2 hours` and status is still Pending (review SLA — see §10 for awaiting-dispense).

**FR-5:** The system shall show KPIs: Pending review count and **over-SLA count** among them; Awaiting dispense (Approved not yet Dispensed); Dispensed today count and **value** (linked posted bill totals, else estimated bill at dispense time); Average turnaround (upload → dispensed, completed items); SLA on-time % = dispensed or approved-off-pending within 2 hours / those that left Pending.

**FR-6:** The system shall show an overdue banner when over-SLA pending count > 0.

**FR-7:** The system shall request WhatsApp to the chemist (Owner/shop alert number) when an Rx becomes overdue, template `rx_pending`, shop name in body, dedupe `rx_overdue:{prescription_id}`. Via `whatsapp` only. Transactional; no marketing consent. Retry/fail per `whatsapp`; no SMS.

**FR-8:** The system shall provide tabs **Pending / Approved / Dispensed / Rejected / All** filtering `status`.

**FR-9:** The system shall list cards **urgent first**: overdue pending first, then oldest `uploaded_at`. Card shows: patient, doctor name + registration number, verified medicine lines with stock and price, OOS warnings, estimated bill.

**FR-10:** The system shall allow staff to map/verify lines to SKUs (qty, sku_id, batch optional until POS FEFO) while Pending. Estimated bill = sum of GST-inclusive SP × qty for mapped lines in stock; OOS lines flagged.

**FR-11:** The system shall **Approve** only from Pending, requiring at least one verified line and doctor **name + registration number** (`400 DOCTOR_REG_REQUIRED` if missing). Status → Approved. Pharmacist/Manager/Owner (and granted roles); Cashier default cannot unless permission granted.

**FR-12:** The system shall **Reject** from Pending (or Approved before dispense) with reason: `illegible` | `unverified_prescriber` | `expired` | `not_stocked` | `custom` (custom text required). Log reason, actor, timestamp. Status → Rejected. Rejected Rx **cannot** be dispensed or sent to billing (`409 RX_REJECTED`).

**FR-13:** The system shall, on Reject, offer send WhatsApp to the patient’s phone asking them to re-send / return with a clear Rx. That send uses `whatsapp`; inbound media is **not** attached automatically. No phone: skip send, still reject.

**FR-14:** The system shall **Dispense → billing** from Approved: return a POS cart seed `{ customer_id, doctor_name, doctor_registration_number, prescription_id, lines[] }`. POS opens that cart. Allergy and substitute checks run in POS. Status remains Approved until the bill is posted, then Dispensed (FR-16).

**FR-15:** The system shall **Dispense** (without seed) from Approved only if every verified line has available batch qty ≥ requested (`409 LINE_OUT_OF_STOCK` otherwise). Status → Dispensed. This does **not** post a Bill or decrement stock; stock decrements on POS charge. If any line is H1/X, Dispense without a `bill_id` shall return `400 BILL_REQUIRED_FOR_SCHEDULED` so the legal register has a bill no — staff must use Dispense → billing (see §10).

**FR-16:** The system shall, when `pos-billing` posts a Bill with `prescription_id`, set status Dispensed, store `bill_id` / invoice no / value, and rely on POS to `appendRegisterEntry` for H1/X sale lines. If POS does not, this module may call `appendRegisterEntry` once per H1/X line with that bill no (idempotent `source_line_id`).

**FR-17:** The system shall not allow dispense (either action) of a Rejected Rx or of a line with qty > on-hand stock.

**FR-18:** The system shall expose `GET .../prescriptions/pending-count` for the sidebar live badge: `{ pending_review, overdue }`. Dashboard uses the same.

**FR-19:** The system shall store Rx images privately (object storage), tenant-prefixed keys, not in CA packs, not in logs. Console display for that tenant’s staff only.

**FR-20:** The system shall emit AuditEvent on upload, line verify, approve, reject, dispense, and WhatsApp overdue/reject notify.

**FR-21:** The system shall not start the SLA on POS-only scheduled sales that never entered this queue. Those sales still need duty + doctor at POS.

---

## 5. Non-Functional Requirements

- English UI; i18n-ready (reject reasons, SLA banner).
- Upload max **10 MB** per file (assumption §10). Virus/content type check: PDF or image.
- Pending-count p95 < 200ms (shell poll ≤ 30s).
- SLA evaluator runs often enough to ping within ~1 minute of the 2-hour mark.
- PII: Rx image + patient name/phone tenant-scoped. DPDP: images are clinical records for the shop; not used for marketing campaigns.
- WhatsApp only via `whatsapp`.
- Starter gate; data + images retained on plan expiry (storage still tenant-owned).
- UI `@namma-medmate/api-client`. Persistence `libs/db-services` + blob store.

---

## 6. Data Model / Entities

### Prescription

| Field | Type | Notes |
|---|---|---|
| `prescription_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `source` | enum `uploaded_at_counter` | v1 only |
| `status` | enum `pending\|approved\|dispensed\|rejected` | |
| `customer_id` | UUID | nullable if name-only |
| `patient_name` | string | snapshot |
| `patient_phone` | string | nullable |
| `doctor_name` | string | |
| `doctor_registration_number` | string | required before approve |
| `doctor_id` | UUID | shop Doctor if picked |
| `uploaded_at` | timestamptz | SLA start |
| `sla_due_at` | timestamptz | uploaded_at + 2h |
| `overdue_notified_at` | timestamptz | nullable |
| `approved_at` / `dispensed_at` / `rejected_at` | timestamptz | |
| `reject_reason_code` | enum | nullable |
| `reject_reason_custom` | string | nullable |
| `bill_id` | UUID | nullable |
| `dispensed_value` | decimal | nullable |
| `estimated_bill` | decimal | from lines |
| `actor_upload_user_id` | UUID | |
| `media_key` | string | private object |

### PrescriptionLine

| Field | Type | Notes |
|---|---|---|
| `line_id` | UUID | |
| `prescription_id` | UUID | |
| `sku_id` | UUID | nullable until verified |
| `qty` | decimal | |
| `verified` | boolean | |
| `in_stock` | boolean | snapshot at last refresh |
| `unit_sp` | decimal | GST-inclusive |
| `oos_warning` | boolean | |

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/v1/locations/{location_id}/prescriptions`  
Auth: session Bearer. Multipart for upload.

### 7.1 REST

**GET** `/v1/locations/{location_id}/prescriptions/kpis`

```json
{
  "pending_review": 6,
  "pending_over_sla": 2,
  "awaiting_dispense": 3,
  "dispensed_today_count": 8,
  "dispensed_today_value": 12450.00,
  "avg_turnaround_minutes": 47,
  "sla_on_time_pct": 0.86
}
```

**GET** `/v1/locations/{location_id}/prescriptions/pending-count`

```json
{ "pending_review": 6, "overdue": 2 }
```

Shell badge uses `pending_review` (or overdue highlight if `overdue > 0`).

**GET** `/v1/locations/{location_id}/prescriptions?status=pending|approved|dispensed|rejected|all`

Sort: urgent first (overdue, then `uploaded_at` asc).

```json
{
  "items": [
    {
      "prescription_id": "rx_1",
      "status": "pending",
      "source": "uploaded_at_counter",
      "patient_name": "Anita Sharma",
      "patient_phone": "9876543210",
      "doctor_name": "Dr. Mehta",
      "doctor_registration_number": "KMC-7788",
      "uploaded_at": "2026-08-31T18:00:00+05:30",
      "sla_due_at": "2026-08-31T20:00:00+05:30",
      "overdue": true,
      "estimated_bill": 430.00,
      "lines": [
        {
          "line_id": "ln_1",
          "sku_id": "sku_h1",
          "name": "Drug A",
          "qty": 10,
          "unit_sp": 43.00,
          "in_stock": true,
          "oos_warning": false,
          "verified": true
        }
      ],
      "has_oos": false
    }
  ],
  "banner_overdue": true
}
```

**POST** `/v1/locations/{location_id}/prescriptions`  
`multipart/form-data`: `file`, fields `customer_id?`, `patient_name`, `patient_phone?`, `doctor_id?`, `doctor_name?`, `doctor_registration_number?`.

**201** prescription pending. If `doctor_id` omitted but name+reg provided, call `statutory-registers` doctor upsert.

**GET** `/v1/locations/{location_id}/prescriptions/{prescription_id}`  
Includes media URL (short-lived signed GET).

**PUT** `/v1/locations/{location_id}/prescriptions/{prescription_id}/lines`

```json
{
  "lines": [
    { "sku_id": "sku_h1", "qty": 10, "verified": true }
  ]
}
```

Refreshes stock/price/OOS/estimated bill.

**POST** `/v1/locations/{location_id}/prescriptions/{prescription_id}/approve`

`200` `{ "status": "approved" }`. Errors: `400 NO_VERIFIED_LINES`, `400 DOCTOR_REG_REQUIRED`, `409 INVALID_STATUS`.

**POST** `/v1/locations/{location_id}/prescriptions/{prescription_id}/reject`

```json
{
  "reason_code": "illegible",
  "custom_text": null,
  "notify_patient_whatsapp": true
}
```

`reason_code=custom` requires `custom_text`. WhatsApp to patient if phone and flag true.

**POST** `/v1/locations/{location_id}/prescriptions/{prescription_id}/dispense-to-billing`

```json
{
  "pos_cart_seed": {
    "prescription_id": "rx_1",
    "customer_id": "c_01",
    "doctor_name": "Dr. Mehta",
    "doctor_registration_number": "KMC-7788",
    "lines": [
      { "sku_id": "sku_h1", "qty": 10 }
    ]
  }
}
```

POS navigates to cart with seed. `409 LINE_OUT_OF_STOCK` if any line cannot be fulfilled.

**POST** `/v1/locations/{location_id}/prescriptions/{prescription_id}/dispense`

```json
{ "bill_id": null }
```

OTC-only lines may complete without bill. Any H1/X line requires `bill_id` of a posted sale (`400 BILL_REQUIRED_FOR_SCHEDULED`).

**POST** `/v1/locations/{location_id}/prescriptions/{prescription_id}/mark-dispensed-from-bill`  
POS internal:

```json
{ "bill_id": "b_99", "invoice_no": "INV-2026-0412", "value": 430.00 }
```

Idempotent on `bill_id`.

### 7.2 Events

| Event | Direction |
|---|---|
| `prescription.uploaded` | out — audit, dashboard |
| `prescription.overdue` | out — this module → `whatsapp` chemist |
| `prescription.rejected` | out — optional patient WhatsApp |
| `prescription.approved` | out — `customers` Rx tag |
| `prescription.dispensed` | out — KPIs, customers |
| `bill.posted` with `prescription_id` | in — FR-16 |
| `duty` / register | POS + `statutory-registers`; not SLA |

### 7.3 UI

- Route `/prescriptions`. Sidebar badge from pending-count.
- KPI row + overdue banner.
- Tabs Pending / Approved / Dispensed / Rejected / All. Source chip: Uploaded at counter.
- Card actions: Reject, Approve, Dispense, Dispense → billing.
- Reject modal: four presets + custom; checkbox notify patient WhatsApp.
- Upload control on Pending (camera/file).
- Dispense → billing opens POS cart (staff POS module).

---

## 8. User Stories & Acceptance Criteria

### US-1: Upload starts SLA; overdue pings chemist

**Given** a Starter shop and a Pharmacist  
**When** they upload a PDF Rx at the counter at 18:00  
**Then** a Pending item exists, source is Uploaded at counter, `sla_due_at` is 20:00, and it appears on Pending.

**Given** it is still Pending at 20:01  
**When** the SLA worker runs  
**Then** the overdue banner includes this Rx, `pending-count.overdue >= 1`, and `whatsapp` is asked to send `rx_pending` to the chemist once (`rx_overdue:rx_1`).

### US-2: Reject cannot dispense; patient WhatsApp is not ingest

**Given** a Pending Rx  
**When** staff reject with reason `illegible` and notify the patient  
**Then** status is Rejected, reason is logged, `whatsapp` sends a re-send request to the patient phone, and Dispense / Dispense → billing return `409 RX_REJECTED`.

**Given** the patient replies with an image on WhatsApp  
**When** that media arrives at WABA  
**Then** this module does **not** create a new Prescription; staff must upload at the counter again.

### US-3: Dispense → billing lands in POS; OOS blocked; H1 register on sale

**Given** an Approved Rx with verified in-stock lines and doctor name + reg. no.  
**When** staff choose Dispense → billing  
**Then** POS opens with that customer, doctor, and lines; allergy/substitute run in POS; when the bill posts, Rx is Dispensed and H1/X lines exist on the pharmacy legal register with bill no and pharmacist on duty.

**Given** a verified line with stock 0  
**When** staff Dispense or Dispense → billing  
**Then** the API returns `409 LINE_OUT_OF_STOCK` and status is unchanged.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| File too large / not image or PDF | `400 MEDIA_INVALID` |
| Approve with zero verified lines | `400 NO_VERIFIED_LINES` |
| Approve without doctor reg | `400 DOCTOR_REG_REQUIRED` |
| Rejected then dispense | `409 RX_REJECTED` |
| OOS line | `409 LINE_OUT_OF_STOCK` |
| Double mark-dispensed from bill | idempotent |
| No patient phone on reject notify | reject succeeds; WhatsApp skipped |
| WhatsApp overdue fail | retry via `whatsapp`; badge still overdue; no SMS |
| Walk-in name-only Rx | allowed; POS allergy skip; khata still blocked if they bill credit |
| Plan Free | paywall; badge hidden or locked |
| Concurrent last-pack stock | POS charge is source of stock truth; seed may fail OOS at charge |
| CA share | no Rx images |
| Kiosk | no upload entry point |

---

## 10. Open Questions / Assumptions

1. **SLA 2 hours applies to Pending review** (upload → leave Pending by Approve or Reject). Overdue banner and chemist ping are for pending review. Awaiting dispense after Approve is tracked as a KPI but does not restart a second 2-hour legal SLA unless later specified.
2. **SLA on-time %** uses items that left Pending: approved or rejected with `approved_at|rejected_at <= sla_due_at`.
3. **Average turnaround** is upload → `dispensed_at` for Dispensed items (today or all-time rolling 30 days — **v1: last 30 days**).
4. **Dispensed today value** prefers posted bill total linked by `prescription_id`; if Dispense without bill (OTC-only), use estimated bill snapshot.
5. **H1/X cannot complete Dispense without a posted bill no** so the inspector register is valid. Dispense → billing is the scheduled path.
6. **Upload size cap 10 MB**; one file per Prescription in v1 (additional pages = another upload or a multi-page PDF).
7. **Cashier** default role cannot run the Rx queue; Pharmacist/Manager/Owner can.
8. **Chemist overdue WhatsApp** goes to the Owner’s WhatsApp / shop alert recipient configured in tenancy/account (same as other chemist pings), not to every pharmacist.
9. Reject “re-send via WhatsApp” is an outbound template; **no inbound media consumer** in v1.
10. Doctor add-inline uses `statutory-registers` shop list, not HQ.
11. Allergy/substitute are POS-owned when the seed cart is charged.
12. Live badge count = pending **review** (Pending status), not awaiting dispense.
13. Named customer is optional at upload but required for khata if the POS bill is on credit; scheduled sale still needs patient name + doctor reg + duty at POS.
14. Images are not deleted on marketing-consent revoke (clinical/legal hold with GST/Rx record). Owner does not get an “erase Rx image” control in v1.
