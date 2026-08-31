# Requirement Doc: Sales Ledger (`sales-ledger`)

**Plan gate:** Growth. Locked pages show lock icon + paywall (plan name Growth, monthly ₹1,499 + 18% GST). POS and 7-day Orders remain Free.  
**Surface:** Pharmacy Partner Console — **Sales** (full sales ledger).  
**Owner module:** `modules/sales-ledger/{ui,api,docs}`  
**Does not own Bills.** Reads every posted Bill from day one from `pos-billing`. Does not re-compute GMV. Export is a Growth feature of this module.

---

## 1. Summary

Sales is the **audit ledger of every posted sale from day one**: counter and kiosk, cash and khata, including bills far older than the 7-day Orders board.

Default date range is the **last 365 days**. Staff can change the range, filter by channel and payment mode (Cash / Khata) and paid-status, sort columns, and read a **totals footer**. Summary chips show period, bill count, units, gross, GST, net collected.

Exports: **Excel + formatted PDF**. Row actions: Record repayment (if khata outstanding), History, Share, Invoice — same destinations as Orders, powered by `pos-billing` / `khata` / `customers`.

This is a Growth upsell so a shop can still bill and find today’s invoice on Free (Orders) without unlocking 365-day search and export.

---

## 2. Scope (in / out)

### In scope

- Sales ledger UI gated by Growth (`plan-gating` feature `sales-ledger`).
- Date range picker; **default last 365 civil days IST** including today.
- Filters: channel (All / Counter / Kiosk), payment mode (All / Cash / Khata), paid-status (All / Paid / Outstanding / Partial / Settled).
- Sortable table + sticky totals footer matching filtered rows (not just the page).
- Summary bar: period label, bill count, units, gross, GST, net collected.
- Excel (.xlsx) and formatted PDF export of the **current filter**.
- Row actions: Record repayment, History, Share, Invoice (and Return as a secondary action consistent with Orders — catalogue lists Record repayment, History, Share, Invoice).
- Deep-link target from Orders “older than 7 days”.

### Out of scope

- Posting charges, holds list (Held lives on Orders, not Sales — holds are not sales).
- Credit notes register as the primary view (`reports` / `returns`); a bill that was returned still **appears** as the original sale; net collected may be reduced via linked CNs in summary if we include CN — **v1 assumption: ledger lists original posted Bills; net collected = tender collected minus cash refunds posted by returns in range** (see §10).
- UPI/Card payment-mode filter.
- Editing bills, deleting bills.
- GST return **preparation** (`books-gst` / `reports`).
- Dashboard charts (`dashboard`) — may call the same aggregate API.
- CA pack (`ca-sharing`).

---

## 3. Dependencies (be specific: APIs/events needed from other slugs)

| Other slug    | Need                                                                                  | Contract                                                                                          |
| ------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `plan-gating` | Unlock                                                                                | `GET /plan/features` → `sales-ledger: true` else paywall                                          |
| `pos-billing` | Every posted Bill                                                                     | `GET /bills` with unbounded dates (server still tenant-scoped); `GET /bills/:id`; print/PDF/share |
| `khata`       | paid-status, repayment                                                                | outstanding remaining; `POST /khata/repayments`                                                   |
| `returns`     | optional net-of-CN in summary                                                         | `GET /credit-notes?bill_id=` or aggregated refunds in range                                       |
| `customers`   | History                                                                               | `/customers/:id`                                                                                  |
| `auth`        | permission `sales-ledger` (Owner, Manager default; Pharmacist/Cashier per owner grid) |                                                                                                   |
| `audit`       | Export may log `sales.exported`                                                       | `audit.append`                                                                                    |
| `books-gst`   | Period labels only; not journals                                                      | —                                                                                                 |

---

## 4. Functional Requirements (FR-n: The system shall ... ATOMIC)

- **FR-1:** The system shall hide working ledger data behind Growth; locked state is icon + paywall, not a working preview of rows.
- **FR-2:** The system shall list **every posted Bill** (`status=posted`) from go-live day one for this `location_id` when unlocked.
- **FR-3:** The system shall default `from = today-364d`, `to = today` (365 days inclusive) in `Asia/Kolkata`.
- **FR-4:** The system shall allow a custom `from`/`to` (IST dates) with a maximum span of **36 months** per query (`RANGE_TOO_LONG` if exceeded). Staff reach older history by changing the range or picking an FY preset. Multiple exports cover all-time.
- **FR-5:** The system shall exclude HeldCarts and `draft_irn` bills from the ledger (not sales).
- **FR-6:** The system shall filter `channel` ∈ {all, counter, kiosk}.
- **FR-7:** The system shall filter `payment_mode` ∈ {all, cash, khata} only — no UPI/Card.
- **FR-8:** The system shall filter `paid_status` ∈ {all, paid, outstanding, partial, settled} as defined in Orders.
- **FR-9:** The system shall show summary chips: `period` (from–to IST), `bill_count` (posted bills in filter), `units` (sum of BillLine.qty), `gross_paise` = sum of `invoice_total_paise` (credit notes do not remove the original sale), `gst_paise` = sum of (cgst+sgst+igst), `net_collected_paise` = the same as `gross_paise` with caption **“Invoice totals (khata included)”**. Khata _cash collections_ are a `khata` KPI, not this footer.
- **FR-10:** The system shall show a sortable table: invoice no, date, channel, customer, phone, tender, paid-status, units, taxable, GST, invoice total, actor. Default sort date desc.
- **FR-11:** The system shall show a **totals footer** for the **full filtered set**, not only the current page.
- **FR-12:** The system shall paginate rows (50 default) without changing footer totals.
- **FR-13:** The system shall export the filtered set to **Excel** (.xlsx) with the same columns + summary sheet.
- **FR-14:** The system shall export a **formatted PDF** (letter/A4): shop name, GSTIN, period, summary, table, generated-at IST, page numbers. Not Tally XML.
- **FR-15:** The system shall cap export at 20,000 rows; above that ask to narrow dates (`EXPORT_TOO_LARGE`).
- **FR-16:** The system shall row-action **Record repayment** only if khata outstanding and `khata` unlocked; else hide or paywall Starter.
- **FR-17:** The system shall row-action **History** → customer 360 or bill detail.
- **FR-18:** The system shall row-action **Share** → POS WhatsApp pre-fill (`GET /bills/:id/whatsapp-share`).
- **FR-19:** The system shall row-action **Invoice** → PDF + thermal print (POS).
- **FR-20:** The system shall not allow delete/edit of a sale.
- **FR-21:** The system shall use the same Bill rows as Orders, GST reports, and Dashboard (no second GMV table).
- **FR-22:** The system shall audit export (actor, filter, timestamp).
- **FR-23:** The system shall accept deep-link `/sales?billId=` to open invoice for a bill older than 7 days.
- **FR-24:** The system shall show ₹ formatting with Indian grouping in UI and PDF; Excel values as numbers (paise/100) with 2 decimals.

---

## 5. Non-Functional Requirements

- **NFR-1:** Filter query p95 ≤ 800 ms for 50k bills with indexes on `(tenant, location, bill_date)`.
- **NFR-2:** Export is async if > 5,000 rows: return `job_id`, poll `GET /sales/exports/:jobId` (≤ 60 s typical). Small exports inline.
- **NFR-3:** Growth gate server-side; API 403 `PLAN_LOCKED` if called on Free.
- **NFR-4:** i18n-ready English.
- **NFR-5:** Exports contain shop business data; still tenant-scoped PII (names/phones). Owner/Manager typical; honour permission grid.
- **NFR-6:** No float: aggregates in paise.

---

## 6. Data Model / Entities

No owned money entity. Read `Bill` + `BillLine` + `Payment` from `pos-billing`; `khata` remaining.

### 6.1 `SalesExportJob` (this module)

| Column                       | Type                           |
| ---------------------------- | ------------------------------ |
| `job_id`                     | UUID                           |
| `tenant_id`, `location_id`   |                                |
| `actor_user_id`              |                                |
| `filter_json`                | JSONB                          |
| `format`                     | `xlsx` \| `pdf`                |
| `status`                     | `queued` \| `done` \| `failed` |
| `s3_key`                     | TEXT NULL                      |
| `error`                      | TEXT NULL                      |
| `created_at`, `completed_at` |                                |

TTL: files expire 24 h.

---

## 7. API / Interface Contracts (REST JSON, events, UI props)

### 7.1 `GET /sales/ledger`

Requires feature `sales-ledger`.

Query: `location_id`, `from`, `to` (YYYY-MM-DD IST), `channel`, `payment_mode`, `paid_status`, `q` (invoice/name/phone), `sort` (`bill_date`|`invoice_total_paise`|`invoice_no`), `order` (`asc`|`desc`), `cursor`, `limit`.

Response:

```json
{
  "ok": true,
  "data": {
    "summary": {
      "from": "2025-09-01",
      "to": "2026-08-31",
      "bill_count": 1840,
      "units": 22110,
      "gross_paise": 184000000,
      "gst_paise": 28080000,
      "net_collected_paise": 184000000
    },
    "footer": {
      "bill_count": 1840,
      "units": 22110,
      "taxable_paise": 155920000,
      "gst_paise": 28080000,
      "invoice_total_paise": 184000000
    },
    "items": [
      {
        "bill_id": "uuid",
        "invoice_no": "INV-260010",
        "bill_date": "2026-08-31",
        "channel": "counter",
        "tender": "cash",
        "paid_status": "paid",
        "customer_name": "Walk-in",
        "phone": null,
        "units": 4,
        "taxable_paise": 10000,
        "gst_paise": 1800,
        "invoice_total_paise": 11800,
        "actor_name": "Asha"
      }
    ],
    "next_cursor": null
  }
}
```

403 `{ "code": "PLAN_LOCKED", "required_plan": "growth" }`.

### 7.2 `POST /sales/exports`

```json
{
  "location_id": "uuid",
  "format": "xlsx",
  "filter": {
    "from": "2025-09-01",
    "to": "2026-08-31",
    "channel": "all",
    "payment_mode": "khata",
    "paid_status": "outstanding",
    "q": ""
  }
}
```

Response: `{ "job_id": "uuid", "status": "queued" }` or inline `{ "status": "done", "url": "signed" }` if small.

### 7.3 `GET /sales/exports/:jobId`

`{ status, url, error }`. URL signed, 15 min.

### 7.4 Row actions

Same URLs as Orders §7.3 (`khata` repay, POS print/share, customers, returns optional).

### 7.5 UI props

```ts
type SalesLedgerPageProps = {
  locationId: string;
  unlocked: boolean;
  requiredPlan?: { name: 'Growth'; monthlyPaise: 149900; gstNote: '18% GST' };
  khataUnlocked: boolean;
};
```

Payment mode control: `Cash` | `Khata` only.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Paywall**  
Given Free plan  
When staff opens Sales  
Then lock + Growth paywall; no row data in DOM.

**US-2 Default 365**  
Given Growth and bills in 2024 and yesterday  
When page loads  
Then from/to span 365 days including today; yesterday’s bill is listed.

**US-3 Day-one bill still here**  
Given first posted bill 400 days ago  
When staff sets from = that date  
Then the bill is listed (audit from day one).

**US-4 Channel filter**  
When Kiosk selected  
Then footer bill_count equals kiosk rows only.

**US-5 Cash vs Khata**  
When payment mode Khata  
Then no cash rows; footer totals khata invoices.

**US-6 Sort + footer**  
When sort by invoice total desc  
Then first page is highest bills; footer still full-filter totals.

**US-7 Excel**  
When Export Excel  
Then xlsx downloads with summary + rows matching filter; amounts numeric 2 dp.

**US-8 PDF**  
When Export PDF  
Then formatted PDF has shop name, period, summary, table.

**US-9 Repay from row**  
Given khata outstanding  
When Record repayment succeeds  
Then that row’s paid-status updates without leaving Sales.

**US-10 Invoice**  
When Invoice  
Then same PDF as POS reprint.

**US-11 Holds absent**  
Given two open holds  
When Sales loads  
Then holds are not rows.

**US-12 API on Free**  
When `GET /sales/ledger` as Free  
Then 403 `PLAN_LOCKED`.

**US-13 Deep-link from Orders**  
Given bill 10 days ago  
When `/sales?billId=`  
Then ledger opens (Growth) and invoice modal for that id.

**US-14 No UPI column**  
Then payment mode filter has only Cash and Khata.

---

## 9. Edge Cases & Error Handling (include §10 failure catalogue rows that apply)

| Catalogue event         | Sales behaviour                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Plan expired            | Module locks immediately; data retained; reopen after renew. POS/Orders 7-day stay. |
| Thermal printer offline | Invoice reprint from row; bill stands.                                              |
| Locked period           | Ledger still **reads** locked months (read-only). Cannot edit.                      |
| Wizard / KYC incomplete | No bills yet; empty ledger.                                                         |
| WhatsApp share fail     | `wa.me` only.                                                                       |
| Concurrent last unit    | Not applicable to read path.                                                        |

Additional:

- `from > to` → 400.
- Export > 20k rows → `EXPORT_TOO_LARGE`.
- Khata remaining desync: paid-status from `khata` service, not a stale column on Bill.
- Walk-in names display “Walk-in”.
- FY change at 1 Apr: invoice_no uniqueness is per FY; table still lists both FYs in a 365-day window.
- `draft_irn` never listed (not posted).
- Round-off included in invoice_total; GST summary is tax components only, not round-off.

---

## 10. Open Questions / Assumptions

1. **Gross / net collected (v1):** `gross_paise = sum(invoice_total_paise)` of posted bills in filter; **net collected = same number**, with UI caption “Invoice totals (khata included)”. Khata _collections_ are a khata KPI, not this footer, unless product later splits “collected cash”.
2. Credit notes **do not remove** the original sale row (audit). Linked CN count may show on detail, not subtracted from bill_count.
3. Max query span **36 months**; export cap **20,000** rows.
4. Held carts are **not** sales.
5. No UPI/Card filter even if a future flag exists.
6. Async export above 5,000 rows.
7. Pharmacist access follows permission grid; default Manager+Owner.
8. “Units” = sum of BillLine.qty (tablets for loose).
