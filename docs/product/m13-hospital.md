# Module 13: Hospital Pharmacy — Questionnaire and locked behavior

Observed from the City Care Hospital Pharmacy partner console on
[namma-medmate-live.netlify.app/namma-pharmacy](https://namma-medmate-live.netlify.app/namma-pharmacy)
and adapted to Namma MedMate invariants (tenant/branch isolation, `/api/v1`,
`ApiResponse`, INR paise, UTC persist / IST display, no HIS/EMR, no doctor or
patient login).

This is a **pharmacy-inside-a-hospital** module on the dispensary dashboard, not
a hospital information system. The pharmacy bills either the **hospital
institution** (ward supply on credit) or the **in-patient / casualty** (POS
bills settled at the counter). The hospital may later bill the patient at MRP;
that patient-hospital settlement is outside this product.

## A. Entitlement and placement

1. Where does Hospital live? A **HOSPITAL** group on the pharmacy (dispensary)
   sidebar, after CRM: IPD · Wards, Hospital Billing, Active Patients, Sales
   Register, Ward Indents, Departments, Doctors.
2. Which plan? **Pro only**, plan-gated like Kiosk. Free / Starter / Growth
   attempting HOSPITAL APIs get `422 PLAN_LIMIT` and an upgrade reason. MASTER
   may still override plan.
3. Which roles? OWNER sees all hospital screens. Pharmacist and Inventory issue
   stock and process indents. Cashier / Pharmacist run POS hospital sale
   sources. Accountant / OWNER record hospital account payments and statements.
   Custom roles are capped by plan + creator permissions (M1-S05).
4. Branch scope? Wards, beds, admissions, indents, ward stock, and hospital
   invoices are **branch-owned**. The hospital credit account is **one per
   tenant** (the institution the pharmacy supplies), with statement lines still
   stamped with the issuing branch.
5. Out of scope: HIS/EMR integration, hospital-staff or doctor login, claim
   filing / TPA APIs, ABDM, nursing charting, OT scheduling, lab results.

## B. Hospital credit account (institutional bill-to)

The pharmacy keeps a single **hospital credit account** (bill-to: hospital
central stores).

- Fields: institution name, GSTIN, stores contact, billing phone, billing
  email, credit terms (`ON_DEMAND` / `NET_15` / `NET_30` / `NET_45`), credit
  limit (INR paise), institutional discount (uniform % off MRP, with optional
  per-product override).
- Every **ward / emergency-floor / refill issue** is billed to this account at
  the **institutional credit price**, GST-inclusive, terms as configured. The
  hospital settles with patients on its own.
- Credit position: supplied (debit), returns + payments (credit), closing
  balance, available credit, ageing buckets 0–30 / 31–60 / 61–90 / 90+ days
  IST, overdue amount and oldest days past due.
- Breach of credit limit blocks a new ward issue (`422 CREDIT_LIMIT`) and
  leaves stock and the indent unchanged.
- Payments: OWNER / Accountant records receipt (mode, reference, amount paise)
  against the account. Reminder is an in-app + routed notification (M10), not
  SMS.

## C. Institutional price list

- Default: one uniform **% off MRP** applied to every product without its own
  rule. Credit price = MRP − discount (paise, GST-inclusive display).
- Per-product override: % off MRP **or** flat ₹ off MRP.
- Invoices show MRP (so the hospital can bill the patient), credit price,
  effective discount %, line amount, MRP-value total, billed-to-hospital total,
  and implied hospital margin if the hospital bills MRP.
- Changing the uniform discount or any product rule requires OWNER (or an
  approval the tenant already configured under M1-S07). The reference console
  used an admin OTP lock; Namma MedMate uses existing PIN/approval, not a new
  OTP factor.
- Price-list edits do not rewrite posted hospital invoices.

## D. Wards, beds, occupancy

- Ward master (per branch): name, code / bed prefix, floor, category
  (`GENERAL` / `ICU` / `PEDIATRIC` / `MATERNITY` / `SURGICAL` / `PRIVATE`),
  bed capacity, nurse in-charge.
- Adding a ward creates sequential free beds `{CODE}-1` … `{CODE}-N`.
- Occupancy KPIs: ward count, total / occupied / free beds, occupancy %,
  admitted count.
- Bed map groups beds by ward; a free bed is selectable for admit; an occupied
  bed opens the admission + medicine-bills drawer.
- Occupied bed cannot be double-booked (`409 STALE_STATE` / `422 BED_OCCUPIED`).

## E. Departments and doctors

Hospital directory is staff-managed and has **no doctor login** (M1 / M3).

- Department: name, type (`OPD` / `IPD` / `DIAGNOSTIC`), head doctor.
- Doctor: full name (required), photo optional, qualification, specialty,
  department, medical registration no., gender, experience years, phone,
  email, OPD room, consulting days/hours, consultation fee (paise), status
  (`AVAILABLE` / `ON_LEAVE` / `VISITING`), languages, about/notes.
- Doctors may be linked from IPD admission (attending) and OPD Rx POS
  (prescriber). This directory extends M3 doctor references for hospital
  pharmacies; it does not create a second unlinked doctor universe when a
  registration number already matches.

## F. IPD admission

Admit (OWNER / Pharmacist):

- Required: patient name, Patient ID / UHID (tenant-unique; system suggests
  next `UHID-…`), ward, free bed.
- Optional: phone, age, gender, attending doctor, diagnosis/reason, payer
  `SELF_PAY` or `INSURANCE_TPA` (insurer name + policy number when TPA).
- On admit: bed becomes occupied, admission `ACTIVE`, admitted-at UTC.
- UHID collision in-tenant is `409`; foreign tenant UHID is undisclosed 404.
- Phone, when present, may bind to an existing M3 customer; IPD does not
  require a CRM profile (casualty walk-in is valid).
- Patients and doctors have no login.

## G. Ward indents (requisitions)

Wards request medicines. Pharmacy staff do not invent HIS messaging; indents
are created in this console (by pharmacy staff recording a ward request) and
then approved/issued.

- Status: `PENDING` → `APPROVED` | `REJECTED`; `APPROVED` → `ISSUED` (on ward
  issue). Counts: pending, approved, issued today, total.
- Header: indent no. `IND-…`, ward, bed, patient name or note, requested-by
  (doctor or sister), requested-at.
- Lines: product + requested qty; after issue, issued qty.
- Approve / reject from Pending. Approved shows **Issue & bill to hospital**.
  Issued shows the hospital invoice ref, amount, reason, timestamp, and
  View / re-bill (re-bill is display of the existing invoice, not a second
  stock issue).

## H. Issue to ward (hospital tax invoice)

- Optional link to an open approved indent (linking bills and closes the
  requisition). Ad-hoc issue is allowed.
- Ward required. Reference (indent / doc) optional.
- Reason is informational; **the bill always goes to the hospital account**:
  `FLOOR_STOCK` (ward floor stock), `CONSUMPTION` (patient consumption),
  `PATIENT_REFILL` (requires UHID / admitted patient).
- Lines: scan or pick product + qty from **pharmacy branch stock** (FEFO
  suggestion, M4). Completing an issue is one transaction: `STOCK_OUT` from
  the pharmacy branch, increment ward-held stock, debit hospital AR, write
  tax invoice `WS-…`.
- Tax invoice: supplied-by pharmacy (name, address, GSTIN, drug licence) vs
  bill-to hospital account; ward, reason, indent ref, patient (refill);
  batch, expiry, HSN, GST %, qty, MRP, credit price, disc %, amount; MRP
  value vs billed-to-hospital (GST incl.); authorised signatory; print/PDF.
- Filters: ward, All / Issues / Refills / Returns, search ref/ward/patient/
  medicine.

## I. Ward stock and returns

- Ward stock is quantity currently held in each ward, valued at credit price.
- Record return: unused ward stock returns to pharmacy branch (`STOCK_IN` /
  `SALES_RETURN`-style hospital credit), credits the hospital account, does
  not silently delete the original issue.

## J. Dual billing (do not collapse)

Two money paths stay distinct:

1. **Hospital AR** — ward issues at credit price. The institution owes the
   pharmacy.
2. **Patient IPD / casualty bills** — POS invoices with sale source Ward or
   Emergency, billed to the patient (or Insurance/TPA snapshot), settled at
   the pharmacy. These do **not** debit the hospital credit account.

POS copy: sale source “ward / emergency → Hospital Billing” applies only when
the till **issues to ward** (path 1). Patient “Bill medicines” from an occupied
bed opens POS with source **Ward**, customer/UHID/ward prefilled, and creates
a **patient** invoice (path 2).

## K. POS sale sources

Existing till (M6) gains sale sources:

- `COUNTER` — current retail till (unchanged).
- `OPD_RX` — OPD prescription sale; optional prescriber from hospital doctors.
- `WARD` — in-patient; requires UHID + ward when the patient is admitted;
  prefill from occupied-bed “Bill medicines”.
- `EMERGENCY` — casualty; UHID required, ward optional (Rahul-style).

Payment modes for these invoices: Cash, UPI, Card, Khata (M6-S03), plus
**Insurance / TPA** as a staff-selected mode with insurer name + policy
snapshot. No insurer portal, claim file, or TPA API (Module 11 exclusion
stands).

Unpaid Ward/Emergency invoices remain on the admission until settled or the
admission is discharged with outstanding handled in M13-S09.

## L. Active patients, settlement, discharge

- Lists ACTIVE admissions with outstanding patient bills (and an All
  in-patients view). Search by UHID, name, ward.
- Drawer: bills, total, settled, outstanding; invoice table (number, date,
  source, items, payment, status, amount).
- Settle N unpaid bills in one action with Cash / UPI / Card / Insurance/TPA.
- **Final bill & discharge** (from occupied bed): settle outstanding then free
  the bed; admission becomes `DISCHARGED`. Cannot discharge while a concurrent
  issue or POS complete is in flight (`409`).
- Emergency/casualty without a bed still appears as an active patient with
  outstanding POS bills.

## M. Sales register

Hospital-aware sales register (patient invoices, not WS hospital issues):

- Source tiles: OPD Prescription, Pharmacy Counter, Ward / IPD, Emergency /
  Casualty, Online (Online remains Phase 2 empty/omitted per D-008).
- Filters: period, source, payment mode (including Insurance/TPA), paid/
  unpaid, insurer, ward, search invoice/patient/phone.
- Totals: sales count, revenue, paid, unpaid, insurance amount.
- Export Excel/CSV and PDF. Rows are tenant+branch scoped.

## N. Notifications

Reuse M10 routing; do not add SMS.

- Indent pending beyond a shift → Pharmacist / Inventory / OWNER.
- Hospital credit overdue → Accountant / OWNER.
- Credit-limit approaching → OWNER.

## O. Isolation and money

- All hospital queries include `tenant_id`; branch-owned rows also `branch_id`.
- Cross-tenant UHID, ward, indent, or invoice is 404 with no disclosure.
- Money is integer paise; invoice numbering is financial-year + branch
  sequential (`WS/{FY}/{branchCode}/00001` for hospital issues; patient bills
  keep M6 `INV/…`).
- Writes are transactional and idempotent. Stock, AR, indent status, and
  invoice rows commit together or not at all.
