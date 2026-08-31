# Requirement Doc: Expenses (`expenses`)

**Slug:** `expenses`  
**Module path:** `modules/expenses/{ui,api,docs}`  
**Plan gate:** **Growth** (`₹1,499 + 18% GST`).  
**Surface:** Pharmacy Partner Console (English UI, i18n-ready).  
**Stack:** React + TypeScript AWS Lambdas. Persistence only through `libs/db-services`. UI talks to API only via `@namma-medmate/api-client`.  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.17, §2.4 (GST on costs / ITC), §3.23 (expense posting). Glossary: `docs/requirements/00-glossary.md`.  
**Canonical entity owned here:** `Expense` (`expense_id`). Journals are owned by `books-gst`.

---

## 1. Summary

`expenses` is the shop’s operational spend register: salaries (manual), rent, utilities, transport, marketing, and similar cash/bank outflows. Recording an expense is **not** a payroll run. Each saved expense posts **one** double-entry journal through `books-gst.postJournal` (Dr expense ± GST input, Cr cash or bank). GST on eligible expenses feeds ITC; category totals feed P&L. The chemist cannot post into a locked period. v1 payment modes are cash, bank, and UPI **recorded as bank** — not Cashfree GMV.

---

## 2. Scope (in / out)

### In scope (v1)

- List expenses with **period**, **category**, and **search** (paid-to, note, amount).
- Categories: salaries, rent, electricity, telephone, stationery, repair, transport, raw material, marketing, bank charges, miscellaneous.
- Create: date, paid-to, category, payment mode, amount incl. GST, GST %, note.
- Live taxable / GST / input-credit breakdown while the form is edited.
- Delete a row (open period only) with reversing journal.
- Export the current filtered list as **Excel + PDF**.
- Feed GST input to books ITC; feed totals to P&L via the same journal.
- Block create/delete when `books-gst.isPeriodLocked(date)` is true.

### Out of scope (v1)

- Payroll run, PF/ESI, payslips, salary posting from `employees` (HR salary-bank fields are master data only).
- Shop-floor Cashfree / UPI GMV collection (UPI here means “paid from the shop bank / UPI app”, recorded as `bank`).
- Recurring expense templates, approvals workflow, cost centres, fixed assets, depreciation.
- Tally XML.
- Editing a posted expense in place (v1: delete + recreate in an open period, or books reversing journal). Date/category corrections after lock = new document in the open period.
- Paying distributors (that is `books-gst` pay-distributor, not this register).
- SaaS subscription fees (chemist paying Namma) — `saas-billing`, not shop expenses.

---

## 3. Dependencies

| Module                  | Why                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tenancy`               | `tenant_id` + `location_id` on every row.                                                                                      |
| `plan-gating`           | Growth gate on routes and APIs.                                                                                                |
| `auth` / `manage-users` | Owner always; Manager if Books/Expenses granted. Pharmacist/Cashier default off.                                               |
| `books-gst`             | `isPeriodLocked(date)`, `postJournal(event)` for `expense` / `expense_delete`. Expense categories map to COA expense accounts. |
| `audit`                 | Create/delete with actor, amount, category, payment mode. No GSTN secrets (this module never sees them).                       |
| `reports`               | Expense Category and Expense Transaction reports read this register + books lines.                                             |
| `account-settings`      | Pharmacy GSTIN state for CGST+SGST vs IGST on expense GST (intra-state default for shop costs).                                |

**Does not depend on:** `employees` (recording salary expense does not clock a payroll), `saas-billing`, `pos-billing`.

**Events emitted:** `ExpensePosted`, `ExpenseDeleted`.  
**Events consumed:** none (period lock is a sync call).

---

## 4. Functional Requirements (FR-n: The system shall ...)

### 4.1 Plan, tenancy, roles

**FR-1:** The system shall require Growth or Pro for every expenses console route and API. Otherwise `403 PLAN_REQUIRED` (`required_plan: "growth"`). Data is retained if the plan later expires.

**FR-2:** The system shall scope every query by `tenant_id` and `location_id`.

**FR-3:** The system shall allow Owner full access. Manager access follows `manage-users` module permission for Expenses. Pharmacist and Cashier shall not see Expenses by default.

**FR-4:** The system shall treat recording an expense as **not** a payroll run: no link to Employee payslips, no PF/ESI, no attendance. Category `salaries` is a manual GL expense only.

### 4.2 Categories (closed set in v1)

**FR-5:** The system shall restrict `category` to this closed enum (UI labels in parentheses):

| `category`      | UI label      | COA `auto_post_key` |
| --------------- | ------------- | ------------------- |
| `salaries`      | Salaries      | `exp_salary`        |
| `rent`          | Rent          | `exp_rent`          |
| `electricity`   | Electricity   | `exp_electricity`   |
| `telephone`     | Telephone     | `exp_telephone`     |
| `stationery`    | Stationery    | `exp_stationery`    |
| `repair`        | Repair        | `exp_repair`        |
| `transport`     | Transport     | `exp_transport`     |
| `raw_material`  | Raw material  | `exp_raw_material`  |
| `marketing`     | Marketing     | `exp_marketing`     |
| `bank_charges`  | Bank charges  | `exp_bank_charges`  |
| `miscellaneous` | Miscellaneous | `exp_misc`          |

**FR-6:** The system shall reject any other category (`422 UNKNOWN_CATEGORY`). Owner-created extra COA children are **not** selectable on the expense form in v1 (manual journal in books covers those).

### 4.3 List, filter, search

**FR-7:** The system shall list expenses for the location with filters:

- **Period:** Day / Month / Year / FY / Custom / All (same period kinds as `reports`).
- **Category:** one of FR-5 or All.
- **Search:** case-insensitive contains on `paid_to`, `note`, `expense_no`.

**FR-8:** The system shall show a totals footer for the current filter: count, amount incl. GST, taxable, GST, input-credit (eligible GST only).

**FR-9:** The system shall sort by `value_date` descending, then `created_at` descending. Pagination: cursor or page, default 50.

### 4.4 Create

**FR-10:** The system shall require on create: `value_date`, `paid_to` (non-empty string, trim), `category`, `payment_mode`, `amount_incl_gst` (> 0, 2 dp), `gst_rate` (0, 5, 12, 18, or 28; default 0), optional `note` (max 500 chars), optional `itc_eligible` (boolean, default `true` when `gst_rate > 0`, else `false`).

**FR-11:** The system shall compute **live** on the form and persist:

- `taxable = amount_incl_gst × 100 / (100 + gst_rate)` (when rate > 0), else `taxable = amount_incl_gst`.
- `gst_amount = amount_incl_gst − taxable`.
- Place of supply for shop expenses is **intra-state** unless `inter_state: true` is set (rare; default false): CGST = SGST = gst_amount / 2, or IGST = gst_amount.
- `input_credit = gst_amount` when `itc_eligible` and `gst_rate > 0`, else `0`.

The UI shall update these three figures as the user types amount and GST % without waiting for save.

**FR-12:** The system shall persist `payment_mode` ∈ `{ cash, bank, upi }`. Mode `upi` shall be stored as `upi` for display but shall post to books **Bank** (`auto_post_key=bank`). Mode `cash` posts to `cash_till`. Mode `bank` posts to `bank`. The system shall **not** call Cashfree and shall **not** treat this as shop-floor GMV.

**FR-13:** The system shall call `isPeriodLocked(value_date)` before insert. If locked, `423 PERIOD_LOCKED` and no row.

**FR-14:** The system shall, after insert, call `postJournal` with `source_type: expense`, `source_id: expense_id`, event kind `expense` containing taxable, gst split, input_credit flag, payment_mode mapped to cash|bank, category → account. If books returns `423` or `422`, the expense insert shall roll back (single transaction / saga compensating delete).

**FR-15:** The system shall assign `expense_no` unique per location per FY (prefix `EXP-` + FY short + sequence). Never reuse.

**FR-16:** The system shall accept an `idempotency_key` header; duplicate create with the same key returns the original expense (`200`).

### 4.5 Delete

**FR-17:** The system shall allow delete of an expense row when `isPeriodLocked(value_date)` is false. Delete shall: mark the row `deleted_at` (soft delete so audit/report of deletions is possible) **or** hard-delete plus reversing journal — **v1: soft delete** + `postJournal` `source_type: expense_delete` reversing the original path in the **open** period using `value_date = today` if original month is still open; if original date is still open, reverse dated the original date. If the original date is locked, delete is refused (`423 PERIOD_LOCKED`) even if today is open — chemist posts a reversing **manual journal** in books instead.

**FR-18:** The system shall not provide in-place edit of amount, GST, category, or date after post. UI copy: “Delete and recreate, or use a books adjustment in an open period.”

**FR-19:** The system shall refuse delete of an already deleted row (`409 ALREADY_DELETED`).

### 4.6 GST → ITC and P&L

**FR-20:** The system shall feed GST input to books: eligible ITC hits `gst_in_cgst` / `gst_in_sgst` / `gst_in_igst`. Ineligible GST remains inside the expense debit (gross). GSTR-2B match is GRN-centric; expense ITC still appears in local books and GSTR-3B prepare as eligible inward GST (books includes expense ITC in 3B ITC eligible when `itc_eligible`).

**FR-21:** The system shall feed P&L solely through the books journal (expense account debit). Reports must not sum the expenses table independently of journals for P&L. The expenses table is the source document; P&L reads COA.

### 4.7 Export

**FR-22:** The system shall export the **current filter** as `.xlsx` and formatted `.pdf` (shop name, GSTIN, period, table, totals footer). No Rx images. No GSTN/IRP secrets.

### 4.8 Audit and WhatsApp

**FR-23:** The system shall emit `AuditEvent` on create and delete (actor, role, tenant, expense_no, amount, category, mode).

**FR-24:** The system shall not send WhatsApp for ordinary expense create/delete. Books-post failure after retries shall surface a console banner `BOOKS_POST_PENDING` with `expense_no` (books module banner); expenses list shows `posting_status: pending | posted | failed`.

---

## 5. Non-Functional Requirements

**NFR-1:** Create p99 < 2s excluding books; the combined create+journal shall be atomic from the user’s point of view (success means journal exists).

**NFR-2:** English UI; i18n-ready labels for categories and payment modes.

**NFR-3:** Amounts INR, 2 decimal places. `qty` is not used.

**NFR-4:** Module layout `modules/expenses/{ui,api,docs}`. API never imports UI.

**NFR-5:** Idempotent create on `Idempotency-Key`.

**NFR-6:** No Cashfree keys, no GSTN/IRP credentials in this module.

---

## 6. Data Model / Entities

### 6.1 `Expense`

| Field                              | Type         | Notes                             |
| ---------------------------------- | ------------ | --------------------------------- |
| `expense_id`                       | uuid         | PK                                |
| `tenant_id`, `location_id`         | uuid         |                                   |
| `expense_no`                       | string       | Unique per location per FY        |
| `fy_key`                           | string       |                                   |
| `value_date`                       | date         | Period lock key                   |
| `paid_to`                          | string       | Payee name                        |
| `category`                         | enum         | FR-5                              |
| `payment_mode`                     | enum         | `cash` \| `bank` \| `upi`         |
| `amount_incl_gst`                  | money        | > 0                               |
| `gst_rate`                         | number       | 0, 5, 12, 18, 28                  |
| `taxable`                          | money        | persisted                         |
| `gst_amount`                       | money        |                                   |
| `gst_cgst`, `gst_sgst`, `gst_igst` | money        |                                   |
| `itc_eligible`                     | boolean      |                                   |
| `input_credit`                     | money        | 0 if not eligible                 |
| `inter_state`                      | boolean      | default false                     |
| `note`                             | string?      |                                   |
| `journal_id`                       | uuid?        | set when posted                   |
| `reverse_journal_id`               | uuid?        | on delete                         |
| `posting_status`                   | enum         | `pending` \| `posted` \| `failed` |
| `idempotency_key`                  | string?      | unique per location               |
| `actor_user_id`                    | uuid         |                                   |
| `deleted_at`                       | timestamptz? |                                   |
| `created_at`, `updated_at`         | timestamptz  |                                   |

Indexes: `(tenant_id, location_id, value_date desc)`, `(category)`, search trigram optional on `paid_to`.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/api/v1/expenses`. Bearer + `X-Location-Id`. Envelope as other modules.

### 7.1 List

`GET /api/v1/expenses?period_kind=month&month=2026-08&category=rent&q=landlord&cursor=&limit=50`

`period_kind`: `day` | `month` | `year` | `fy` | `custom` | `all`.  
Companion params: `date`, `month` (`YYYY-MM`), `year`, `fy` (`FY2026-27`), `from`, `to`.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "expense_id": "uuid",
        "expense_no": "EXP-2627-000041",
        "value_date": "2026-08-05",
        "paid_to": "Sharma Properties",
        "category": "rent",
        "payment_mode": "bank",
        "amount_incl_gst": 11800.0,
        "gst_rate": 18,
        "taxable": 10000.0,
        "gst_amount": 1800.0,
        "input_credit": 1800.0,
        "itc_eligible": true,
        "note": "August rent",
        "posting_status": "posted",
        "journal_id": "uuid"
      }
    ],
    "totals": {
      "count": 1,
      "amount_incl_gst": 11800.0,
      "taxable": 10000.0,
      "gst_amount": 1800.0,
      "input_credit": 1800.0
    },
    "next_cursor": null
  }
}
```

Deleted rows are excluded unless `include_deleted=true` (Owner debug; default false).

### 7.2 Preview breakdown (optional; UI may compute client-side with same formula)

`POST /api/v1/expenses/preview`

```json
{
  "amount_incl_gst": 11800.0,
  "gst_rate": 18,
  "itc_eligible": true,
  "inter_state": false
}
```

```json
{
  "success": true,
  "data": {
    "taxable": 10000.0,
    "gst_amount": 1800.0,
    "gst_cgst": 900.0,
    "gst_sgst": 900.0,
    "gst_igst": 0,
    "input_credit": 1800.0,
    "expense_net_of_itc": 10000.0
  }
}
```

### 7.3 Create

`POST /api/v1/expenses`  
Header: `Idempotency-Key: uuid`

```json
{
  "value_date": "2026-08-05",
  "paid_to": "Sharma Properties",
  "category": "rent",
  "payment_mode": "upi",
  "amount_incl_gst": 11800.0,
  "gst_rate": 18,
  "itc_eligible": true,
  "inter_state": false,
  "note": "August rent"
}
```

`201`:

```json
{
  "success": true,
  "data": {
    "expense_id": "uuid",
    "expense_no": "EXP-2627-000041",
    "payment_mode": "upi",
    "books_credit_account": "bank",
    "taxable": 10000.0,
    "gst_amount": 1800.0,
    "input_credit": 1800.0,
    "journal_id": "uuid",
    "posting_status": "posted"
  }
}
```

Errors: `423 PERIOD_LOCKED` `{ "period_key": "2026-08" }`, `422 VALIDATION`, `403 PLAN_REQUIRED`.

### 7.4 Get / delete / export / categories

`GET /api/v1/expenses/{expenseId}` → one item as list element plus gst split fields.

`DELETE /api/v1/expenses/{expenseId}` → `200` `{ "expense_id", "reverse_journal_id", "deleted_at" }` or `423 PERIOD_LOCKED`.

`GET /api/v1/expenses/export?format=xlsx|&format=pdf` plus the same filter query string as list. `Content-Disposition` attachment. PDF A4, English.

`GET /api/v1/expenses/categories` →

```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": "salaries", "label": "Salaries", "payroll": false },
      { "id": "rent", "label": "Rent", "payroll": false }
    ]
  }
}
```

Every category has `"payroll": false`. Salaries includes copy key `expenses.salaries.notPayroll`.

### 7.5 Events

`ExpensePosted`: `{ expense_id, expense_no, category, amount_incl_gst, value_date, journal_id }`.  
`ExpenseDeleted`: `{ expense_id, reverse_journal_id }`.

`postJournal` body (to books):

```json
{
  "source_type": "expense",
  "source_id": "{expense_id}",
  "value_date": "2026-08-05",
  "event": {
    "kind": "expense",
    "category": "rent",
    "auto_post_key": "exp_rent",
    "taxable": 10000.0,
    "gst": { "cgst": 900.0, "sgst": 900.0, "igst": 0 },
    "itc_eligible": true,
    "credit_account": "bank",
    "amount_incl_gst": 11800.0
  }
}
```

For `upi`, `"credit_account": "bank"`. For `cash`, `"credit_account": "cash_till"`.

### 7.6 UI

Sidebar **Business → Expenses** (Growth).

- Filter bar: period picker, category select, search.
- Table: date, expense no, paid-to, category, mode (Cash / Bank / UPI), amount incl. GST, GST, ITC, note, delete. Totals footer.
- Primary: **Add expense** drawer/modal with live taxable / GST / input-credit. Payment mode help: “UPI is recorded against Bank. This is not a Cashfree shop payment.” Salaries help: “This is not a payroll run.”
- Export Excel, Export PDF.
- Locked period: date picker disables locked months; submit error names the locked period.
- Paywall on Free/Starter.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Create rent with GST**  
Given Growth plan and August unlocked  
When Owner saves rent ₹11,800 incl. 18% GST, paid-to “Sharma Properties”, mode bank  
Then taxable 10,000, GST 1,800, ITC 1,800 show live before save; after save a journal Dr Rent 10,000 Dr GST in 1,800 Cr Bank 11,800 exists; the row appears in the list.

**US-2 UPI records as bank**  
Given mode UPI  
When saved  
Then `payment_mode` is `upi` on the row and the journal credits **Bank**, not Cash in till, and Cashfree is not called.

**US-3 Salaries is not payroll**  
Given category Salaries  
When saved  
Then no Employee / payslip / PF document is created; COA `exp_salary` is debited; UI states it is not a payroll run.

**US-4 Locked period**  
Given July locked  
When create dated 10 Jul  
Then `423 PERIOD_LOCKED` and no row.

**US-5 Delete in open period**  
Given an August expense posted  
When Owner deletes it in August (still open)  
Then the row is gone from the default list and a reversing journal exists; P&L no longer includes that amount.

**US-6 Delete in locked period**  
Given that expense’s date is now locked  
When Owner deletes  
Then refused; row remains.

**US-7 Filter and search**  
Given mixed categories  
When period = this month and category = electricity and search = “BESCOM”  
Then only matching rows and matching totals.

**US-8 Export**  
Given a filtered list  
When Excel or PDF is downloaded  
Then the file contains the same rows and totals, shop name, period; no secrets.

**US-9 ITC ineligible**  
Given GST 18% and `itc_eligible=false`  
When saved  
Then input_credit is 0; journal Dr expense for the **gross** amount; Cr cash/bank gross; no GST input debit.

**US-10 Zero GST**  
Given gst_rate 0 and amount 500  
When saved  
Then taxable 500, gst 0, ITC 0; Dr expense 500 Cr cash/bank 500.

**US-11 Plan gate**  
Given Starter plan  
When opening Expenses  
Then paywall names Growth.

**US-12 Idempotent create**  
Given the same Idempotency-Key twice  
When POST twice  
Then one expense and one journal.

**US-13 P&L identity**  
Given expenses posted in the month  
When P&L is opened in reports/books  
Then expense totals equal the books expense account movements, not a second sum that disagrees.

---

## 9. Edge Cases & Error Handling

| Case                                 | Behaviour                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Amount 0 or negative                 | `422 VALIDATION`                                                             |
| GST rate not in {0,5,12,18,28}       | `422 VALIDATION`                                                             |
| Half-paise after GST split           | Round CGST/SGST so CGST+SGST = gst_amount at 2 dp (first remainder to CGST). |
| Paid-to blank                        | `422`                                                                        |
| Period locked                        | `423 PERIOD_LOCKED`                                                          |
| Books unbalanced (should not happen) | Roll back expense; `500 BOOKS_POST_FAILED`; banner.                          |
| Plan expired                         | `403`; rows retained.                                                        |
| UPI vs cash confusion                | UI copy; still post UPI to bank.                                             |
| Raw material category                | Maps to `exp_raw_material`; still not inventory/GRN.                         |
| Delete twice                         | `409 ALREADY_DELETED`                                                        |
| Inter-state expense                  | IGST input if `inter_state` and eligible.                                    |
| Note > 500 chars                     | `422`                                                                        |
| Concurrent create                    | Two rows if different idempotency keys.                                      |

---

## 10. Open Questions / Assumptions

**Assumptions:**

1. No in-place edit; delete + recreate in open period.
2. Soft delete + reversing journal dated original date if still open.
3. Shop expenses default intra-state CGST+SGST.
4. `itc_eligible` defaults true when GST % > 0.
5. Salaries category never calls `employees`.
6. UPI stored as `upi`, posted as bank.
7. v1 category list is closed; extra COA heads use books manual journals.
8. Recurring rent is entered each month manually.

**Open questions:**

1. Should Cashier record petty-cash miscellaneous? **v1: no, unless granted.**
2. Vendor GSTIN on expense for 2B match of expenses (v1: 2B match is GRN-centric; expense ITC is local books only).
