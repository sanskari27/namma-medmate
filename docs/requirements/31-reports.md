# Requirement Doc: Reports & analytics (`reports`)

**Slug:** `reports`  
**Module path:** `modules/reports/{ui,api,docs}`  
**Plan gate:** **Growth** (`₹1,499 + 18% GST`).  
**Surface:** Pharmacy Partner Console (English UI, i18n-ready).  
**Stack:** React + TypeScript AWS Lambdas. Persistence only through `libs/db-services`. UI talks to API only via `@namma-medmate/api-client`.  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.16, §2.8 (Audit Trail), §2.4 (TDS/TCS stubs), §5 (same bill → reports). Glossary: `docs/requirements/00-glossary.md`.  
**Canonical entities:** none owned. This module **reads** journals from `books-gst`, operational documents from POS/inventory/purchases/returns/expenses/khata, and `AuditEvent` from `audit`. It must **not** recompute a second ledger.

---

## 1. Summary

`reports` is the Growth report catalogue and analytics dashboard. Money figures are the journals `books-gst` already posted. Quantity, HSN, party, batch, and audit fields come from the source modules. Every named report has a period picker (Day / Month / Year / FY / Custom / All), a table with totals, and **Excel + PDF**. TDS Payable, TDS Receivable, and TCS Payable are **stubs** in v1 (always empty unless a later spec fills them). The Audit Trail report reads the `audit` module log. Favourite reports are a UI grouping, not a second engine.

---

## 2. Scope (in / out)

### In scope (v1) — every named report

**Favourite:** Balance Sheet · Trial Balance · GSTR-1 (Sales) · Profit And Loss · Sales Summary

**GST:** GSTR-2 (Purchase) · GSTR-2B match · GSTR-3B · GST Purchase (with HSN) · GST Sales (with HSN) · HSN-wise Sales Summary · TDS Payable · TDS Receivable · TCS Payable _(stubs)_

**Transaction:** Audit Trail · Bill-wise Profit · Cash and Bank · Daybook · Expense Category · Expense Transaction · Purchase Summary · Credit notes · Purchase / expiry returns · Stock take variance

**Item:** Item Report by Party · Item Sales and Purchase Summary · Low Stock Summary · Rate List · Stock Detail (batch & expiry) · Stock Summary

**Party:** Receivable Ageing · Party Report by Item · Party Statement (Ledger) · Party-wise Outstanding · Sales Summary – Category Wise

**Analytics dashboard:** Overview · Sales register · Products · Accounts & GST.

Each report: period kinds above, totals footer, Excel + PDF.

### Out of scope (v1)

- A second general ledger or “management vs statutory” books.
- Filling TDS/TCS (stubs only; no auto-withhold).
- Tally XML.
- HQ SaaS analytics (`admin-analytics`).
- Scheduled email of pharmacy reports (HQ has scheduled CSV; pharmacy is on-demand).
- Editing source documents from a report row (row may **link** to the source screen).
- CA pack zip (owned by `ca-sharing`); this module supplies report table payloads and export blobs that CA sharing may reuse.
- Shop-floor UPI/Card mix as a working payment series (v1 mix is Cash vs Khata only).

---

## 3. Dependencies

| Module                         | Why                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `plan-gating`                  | Growth.                                                                                                                         |
| `tenancy`                      | `location_id`.                                                                                                                  |
| `books-gst`                    | Trial balance, P&L, BS, daybook, cash & bank, GST money, GSTR-1/3B/2B figures, expense totals. **Do not re-sum bills for P&L.** |
| `pos-billing` / `sales-ledger` | Bill lines for HSN, qty, channel, tender, bill-wise profit (COGS from the bill’s journal / batch cost already used in books).   |
| `purchases`                    | GRN lines for purchase reports.                                                                                                 |
| `returns`                      | Credit notes report.                                                                                                            |
| `purchase-returns`             | Purchase / expiry returns report.                                                                                               |
| `inventory`                    | Stock summary, stock detail, low stock, rate list, dead-stock flag.                                                             |
| `stock-take`                   | Variance report.                                                                                                                |
| `expenses`                     | Expense category / transaction reports (display); P&L still from books.                                                         |
| `khata` / `customers`          | Ageing, party outstanding, party statement (party subledger aligned with books `khata_recv` / AP).                              |
| `distributors-reorder`         | Party = distributor on purchase side.                                                                                           |
| `audit`                        | Audit Trail report reads `AuditEvent` only.                                                                                     |
| `crm`                          | Loyalty not a named report; ignore except as already in journals.                                                               |
| `ca-sharing`                   | Downstream consumer of export APIs.                                                                                             |
| `account-settings`             | Shop name, GSTIN, logo on PDF; TDS/TCS **flags** do not fill stub reports.                                                      |

---

## 4. Functional Requirements (FR-n: The system shall ...)

### 4.1 Cross-cutting

**FR-1:** The system shall require Growth or Pro for every reports route and API (`403 PLAN_REQUIRED`).

**FR-2:** The system shall scope every run by `tenant_id` and `location_id`.

**FR-3:** The system shall offer period kinds `day` | `month` | `year` | `fy` | `custom` | `all` on every report. FY = 1 April – 31 March (`FY2026-27`). `year` is calendar year. `all` has no date lower bound (still tenant-scoped). Default period for catalogue open: **month = current month**. Analytics default: month-to-date.

**FR-4:** The system shall render each report as a table with a **totals footer** (numeric columns summed or netted as specified per report). Empty result: empty table + zeros, not an error.

**FR-5:** The system shall export the current report (same period and filters) as **Excel (`.xlsx`)** and **formatted PDF**. PDF header: shop name, GSTIN, report title, period label, generated-at IST. No Rx images. No GSTN/IRP secrets.

**FR-6:** The system shall take **money** for books-native reports (Balance Sheet, Trial Balance, P&L, Daybook, Cash and Bank, GSTR-1/2/3B money, Expense totals that hit P&L) **only from `books-gst` journals / COA**. The system shall **not** recompute a second ledger from bills.

**FR-7:** The system shall take **quantities, HSN, batch, party names, channels** from source documents, joined by `source_id` to journals where a money column is shown.

**FR-8:** The system shall group the catalogue in the UI as Favourite / GST / Transaction / Item / Party, searchable by report name.

**FR-9:** The system shall let Owner and Manager (if Reports granted) run all reports. Pharmacist/Cashier default off.

**FR-10:** The system shall make report generation **read-only**. No period lock is required to _view_ a locked month; lock only blocks posting.

**FR-11:** The system shall use report `slug` values listed in §6 as the stable API id (for CA sharing and favourites).

**FR-12:** The system shall stub **TDS Payable**, **TDS Receivable**, and **TCS Payable**: table with the specified columns, **zero rows**, totals ₹0, banner “TDS/TCS is not auto-withheld in v1. Profile flags do not fill this report.” `account-settings` TDS/TCS flags shall not populate rows.

### 4.2 Favourite reports

**FR-13 Balance Sheet (`balance-sheet`):** The system shall show COA assets, liabilities, equity (including current-period P&L) as of the period **end**. Source: `books-gst` Balance Sheet API. Columns: account code, name, amount. Totals: total assets, total liabilities + equity (must equal). If they do not, show error state from books (`TRIAL_BALANCE_BROKEN` / BS imbalance) rather than a “fixed” number.

**FR-14 Trial Balance (`trial-balance`):** The system shall show each COA account: opening Dr/Cr, period Dr/Cr, closing Dr/Cr. Totals row must tie (closing Dr = closing Cr). Source: `books-gst` TB only.

**FR-15 GSTR-1 (Sales) (`gstr-1`):** The system shall show the prepared/preparable GSTR-1 register: invoice no, date, GSTIN (blank if B2C), taxable, CGST, SGST, IGST, invoice total, IRN present (Y/N), type B2B/B2C, place of supply. Credit notes listed or sectioned. Totals: taxable, GST, invoice count. Money from books/output GST; invoice list from bills+CNs that posted those journals. Optional “include JSON summary” is a link to books prepare, not a second compute.

**FR-16 Profit And Loss (`profit-and-loss`):** The system shall show Income (Sales net of loyalty contra), COGS, Gross profit, each Expense control (+ raw material), Net profit. Source: books P&L. Columns: account, amount. Totals: gross profit, net profit, net margin % = net / sales net when sales ≠ 0.

**FR-17 Sales Summary (`sales-summary`):** The system shall show bill count, units, gross (GST-incl. rounded totals), GST, net collected (cash + khata recognised), tender split cash vs khata, channel counter vs kiosk. One row or a small KPI+table of daily/monthly buckets inside the period (v1: **one totals row plus optional daily rows** when period is month/custom). Money: sum of cash/khata Dr on **bill** journals in period, not a parallel bill sum that can diverge; if a display qty is needed, count bill lines.

### 4.3 GST reports

**FR-18 GSTR-2 (Purchase) (`gstr-2`):** The system shall show a **local purchase GST register** (not a GSTN file): GRN no, distributor, GSTIN, supplier invoice no, date, taxable, CGST, SGST, IGST, total, journal_id. Totals taxable + GST. This is **not** GSTR-2B. No GSTN submit.

**FR-19 GSTR-2B match (`gstr-2b-match`):** The system shall show books 2B match rows: supplier GSTIN, 2B invoice no, 2B date, 2B taxable, 2B GST, GRN no (if any), status `matched` | `mismatch` | `missing_in_books` | `missing_in_2b`, ITC mark, mismatch fields. Totals by status count and GST amounts. Banner if 2B stale. Source: `books-gst` match table, not a rescoring of GRNs.

**FR-20 GSTR-3B (`gstr-3b`):** The system shall show outward taxable/GST (from output GST journals), ITC claimed, net GST payable, expense ITC note, `two_b_stale` flag. Figures from `prepareGstr3b` / books; UI may call prepare-if-missing. Chemist does not file from this screen (download JSON is books/CA).

**FR-21 GST Purchase with HSN (`gst-purchase-hsn`):** The system shall group GRN lines by HSN: HSN, GST rate, qty, taxable, CGST, SGST, IGST. Totals footer. Qty from GRN; tax from GRN/journal input GST allocated by line.

**FR-22 GST Sales with HSN (`gst-sales-hsn`):** The system shall group posted bill (and CN as negative) lines by HSN: HSN, rate, qty, taxable, CGST, SGST, IGST. Totals footer.

**FR-23 HSN-wise Sales Summary (`hsn-sales-summary`):** The system shall show HSN, description (from SKU), qty, taxable, total GST, invoice value, unique invoice count. CN subtracted.

**FR-24 TDS Payable (`tds-payable`):** Stub. Columns: date, party, section, taxable, TDS rate, TDS amount. Always empty. Totals 0.

**FR-25 TDS Receivable (`tds-receivable`):** Stub. Columns: date, party, section, taxable, TDS rate, TDS amount. Always empty.

**FR-26 TCS Payable (`tcs-payable`):** Stub. Columns: date, party, TCS rate, TCS amount. Always empty.

### 4.4 Transaction reports

**FR-27 Audit Trail (`audit-trail`):** The system shall read `audit` `AuditEvent` for this tenant+location: timestamp, actor, role, action, target type/id, money/stock before/after summary. Filters: period, action family (bills, GRN, lock, IRN, credentials **redacted**). The report shall **not** invent events. Credential edits show “credentials changed” without secret values.

**FR-28 Bill-wise Profit (`bill-wise-profit`):** The system shall list posted bills: invoice no, date, channel, tender, taxable, GST, invoice total, COGS (from that bill’s COGS journal lines), gross profit = taxable − COGS (v1: profit on taxable vs cost; GST is not profit). Totals: sales, COGS, profit, margin %. Credit notes: negative rows or net column; v1 include CN as negative profit rows linked to original invoice.

**FR-29 Cash and Bank (`cash-and-bank`):** The system shall list journals that touch `cash_till` or `bank`: date, journal no, source, description, cash Dr, cash Cr, bank Dr, bank Cr, running balance per account. Opening row from books. Totals: net cash movement, net bank movement. No SaaS Cashfree lines.

**FR-30 Daybook (`daybook`):** The system shall list every journal in the period (all source types) with lines rolled into debit/credit totals per journal, plus a detail expand. Totals: total debit = total credit. Source: books journals only.

**FR-31 Expense Category (`expense-category`):** The system shall group expenses by category: category, count, amount incl. GST, taxable, GST, ITC. Totals footer. Display may read `expenses` table; P&L identity still books. If a row exists in expenses but journal failed, show posting_status and exclude from “posted” total.

**FR-32 Expense Transaction (`expense-transaction`):** The system shall list each expense: date, no, paid-to, category, mode, amount, GST, ITC, note. Totals as list totals.

**FR-33 Purchase Summary (`purchase-summary`):** The system shall list GRNs: date, GRN, distributor, invoice no, lines, taxable, GST, total, stocked. Totals: GRN count, taxable, GST, total.

**FR-34 Credit notes (`credit-notes`):** The system shall list customer CNs: CN no, date, original invoice, reason (GST), restock vs write-off, taxable, GST, total, refund mode cash/khata. Totals count + value.

**FR-35 Purchase / expiry returns (`purchase-expiry-returns`):** The system shall list purchase returns and expiry returns: debit note no, type, GRN, distributor, qty, value, status (claimed/accepted/credit received as stored by `purchase-returns`). Totals: count, stock value out.

**FR-36 Stock take variance (`stock-take-variance`):** The system shall list posted take lines: date, take id, SKU, batch, system qty, counted qty, qty delta, cost delta, journal id. Totals: net qty delta, net value. Unposted takes excluded.

### 4.5 Item reports

**FR-37 Item Report by Party (`item-by-party`):** The system shall list, for a required `party_type` (`customer` | `distributor`) and `party_id`, SKU rows: sku, qty sold or purchased in period, taxable, returns qty. Totals qty + taxable.

**FR-38 Item Sales and Purchase Summary (`item-sales-purchase-summary`):** The system shall list SKUs: qty sold, qty purchased (GRN), qty returned (customer + purchase), closing qty (inventory now, not period-end snapshot in v1 — closing is **current** stock; period columns are movements in period). Revenue (taxable sales), purchase value (GRN cost), margin when both present. Totals footer.

**FR-39 Low Stock Summary (`low-stock-summary`):** The system shall list SKUs at or below reorder level (or out of stock): sku, qty, reorder level, days of cover if known, rack. Period filter applies to “as of” = period end if `day/custom` else **current** for `all`. v1: always **current** stock vs reorder (period ignored except PDF label “as of generated date”). Totals: SKU count, units, stock value at cost.

**FR-40 Rate List (`rate-list`):** The system shall list active SKUs: name, HSN, GST %, MRP (incl.), PTR/cost if present, schedule tag. Period unused except header. Totals: SKU count.

**FR-41 Stock Detail (`stock-detail`):** The system shall list batches: SKU, batch no, expiry, qty, cost, MRP, scheme flag, rack. Totals: batch count, units, cost value, MRP value.

**FR-42 Stock Summary (`stock-summary`):** The system shall list SKUs aggregated: qty, cost value, MRP value, earliest expiry, batch count. Totals: SKUs, units, values.

### 4.6 Party reports

**FR-43 Receivable Ageing (`receivable-ageing`):** The system shall list named customers with khata balance: current / 30–60 / 60+ / total outstanding as `khata` ageing (same buckets as Credit module). Totals per bucket. Period: ageing **as of** period end (v1: as of today if period is `all`). Money should equal books `khata_recv` **in total**; if a customer subledger vs GL difference exists, show a reconciling note, do not silently change khata.

**FR-44 Party Report by Item (`party-by-item`):** The system shall require `sku_id` and list parties (customers for sales, distributors for purchases — tab or `party_type`): party name, qty, taxable, last date. Totals qty + taxable.

**FR-45 Party Statement / Ledger (`party-statement`):** The system shall require `party_type` + `party_id`. Customer: bills (Dr khata), repayments (Cr), CNs, running balance. Distributor: GRNs (Cr AP), payments (Dr AP), purchase returns, running balance. Opening + movements in period + closing. Running balance from those documents; GL control account total is the books check.

**FR-46 Party-wise Outstanding (`party-outstanding`):** The system shall list customers with khata ≠ 0 and distributors with AP ≠ 0 (two sections or `party_type` filter): party, outstanding, last movement date. Totals receivables, payables.

**FR-47 Sales Summary – Category Wise (`sales-summary-category`):** The system shall group posted bill lines by inventory category (Fever, Cough, … as on SKU): category, qty, taxable, GST, invoice value, bill count (distinct). Totals footer.

### 4.7 Analytics dashboard

**FR-48 Overview tab:** The system shall show for the selected period: **net revenue** (books sales net), **gross profit** (sales net − COGS), **margin %**, **units** (bill lines qty net of CN), **net GST** (output − input posted), **top items** (by revenue, top 10), **channel mix** (counter vs kiosk %), **payment mix** (cash vs khata %). v1 shall not show UPI/Card as working series.

**FR-49 Sales register tab:** The system shall show a bill register table (invoice, date, channel, tender, taxable, GST, total) with totals — same money as GSTR-1/sales journals.

**FR-50 Products tab:** The system shall list SKUs: units, revenue (taxable), COGS, profit, margin %, **dead-stock flag** (no sale > 90 days and qty > 0, same idea as inventory dead stock). Totals footer.

**FR-51 Accounts & GST tab:** The system shall show a **P&L card** (sales, COGS, expenses, net), **GST by slab** (5/12/18/28) with output, ITC, net payable per slab, **cash & collections** (cash Dr from bills + khata repayments), **purchases** (GRN totals), **day book** (embedded latest daybook rows or link). All money from books journals.

**FR-52:** The system shall use the same period control on analytics as reports.

**FR-53:** The system shall export each analytics tab as Excel + PDF (the visible table/cards flattened to a table).

### 4.8 CA and performance

**FR-54:** The system shall expose a machine-readable table API (`GET /reports/{slug}/run`) that `ca-sharing` can call server-side with tenant context (not the CA token). Same columns as the console.

**FR-55:** The system shall not run reports that scan all-time without pagination/limits: `all` on high-volume reports (daybook, audit, sales register) shall paginate (default 200, max 1000) and export may stream. PDF for huge `all` may cap with a notice “First 5,000 rows”.

---

## 5. Non-Functional Requirements

**NFR-1:** Interactive run p99 < 3s for month-to-date on a shop with ≤ 10k bills/year; exports may take longer (60s timeout, streamed).

**NFR-2:** Read replicas allowed; never write journals.

**NFR-3:** English; i18n-ready titles.

**NFR-4:** PDF/Excel contain no Rx images and no secrets.

**NFR-5:** Module `modules/reports/{ui,api,docs}`.

**NFR-6:** Figures reconcile: P&L net from reports = P&L from books for the same period (automated test).

---

## 6. Data Model / Entities

No owned ledger. Optional cache:

### 6.1 `ReportFavourite` (optional UI)

`user_id`, `slug` — if unimplemented, Favourite is a **fixed** catalogue group (preferred v1: **fixed group**, not per-user stars).

### 6.2 Report slugs (stable)

`balance-sheet`, `trial-balance`, `gstr-1`, `profit-and-loss`, `sales-summary`, `gstr-2`, `gstr-2b-match`, `gstr-3b`, `gst-purchase-hsn`, `gst-sales-hsn`, `hsn-sales-summary`, `tds-payable`, `tds-receivable`, `tcs-payable`, `audit-trail`, `bill-wise-profit`, `cash-and-bank`, `daybook`, `expense-category`, `expense-transaction`, `purchase-summary`, `credit-notes`, `purchase-expiry-returns`, `stock-take-variance`, `item-by-party`, `item-sales-purchase-summary`, `low-stock-summary`, `rate-list`, `stock-detail`, `stock-summary`, `receivable-ageing`, `party-by-item`, `party-statement`, `party-outstanding`, `sales-summary-category`.

Analytics slugs: `analytics-overview`, `analytics-sales-register`, `analytics-products`, `analytics-accounts-gst`.

### 6.3 Run request (not persisted)

`slug`, `period_kind`, `date?`, `month?`, `year?`, `fy?`, `from?`, `to?`, `filters` (party_id, sku_id, category, party_type).

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/api/v1/reports`. Bearer + `X-Location-Id`.

### 7.1 Catalogue

`GET /api/v1/reports/catalogue?q=`

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "favourite",
        "label": "Favourite",
        "reports": [
          { "slug": "balance-sheet", "name": "Balance Sheet", "stub": false },
          { "slug": "trial-balance", "name": "Trial Balance", "stub": false },
          { "slug": "gstr-1", "name": "GSTR-1 (Sales)", "stub": false },
          { "slug": "profit-and-loss", "name": "Profit And Loss", "stub": false },
          { "slug": "sales-summary", "name": "Sales Summary", "stub": false }
        ]
      },
      {
        "id": "gst",
        "label": "GST",
        "reports": [
          { "slug": "gstr-2", "name": "GSTR-2 (Purchase)", "stub": false },
          { "slug": "gstr-2b-match", "name": "GSTR-2B match", "stub": false },
          { "slug": "gstr-3b", "name": "GSTR-3B", "stub": false },
          { "slug": "gst-purchase-hsn", "name": "GST Purchase (with HSN)", "stub": false },
          { "slug": "gst-sales-hsn", "name": "GST Sales (with HSN)", "stub": false },
          { "slug": "hsn-sales-summary", "name": "HSN-wise Sales Summary", "stub": false },
          { "slug": "tds-payable", "name": "TDS Payable", "stub": true },
          { "slug": "tds-receivable", "name": "TDS Receivable", "stub": true },
          { "slug": "tcs-payable", "name": "TCS Payable", "stub": true }
        ]
      },
      {
        "id": "transaction",
        "label": "Transaction",
        "reports": [
          { "slug": "audit-trail", "name": "Audit Trail", "stub": false },
          { "slug": "bill-wise-profit", "name": "Bill-wise Profit", "stub": false },
          { "slug": "cash-and-bank", "name": "Cash and Bank", "stub": false },
          { "slug": "daybook", "name": "Daybook", "stub": false },
          { "slug": "expense-category", "name": "Expense Category", "stub": false },
          { "slug": "expense-transaction", "name": "Expense Transaction", "stub": false },
          { "slug": "purchase-summary", "name": "Purchase Summary", "stub": false },
          { "slug": "credit-notes", "name": "Credit notes", "stub": false },
          { "slug": "purchase-expiry-returns", "name": "Purchase / expiry returns", "stub": false },
          { "slug": "stock-take-variance", "name": "Stock take variance", "stub": false }
        ]
      },
      {
        "id": "item",
        "label": "Item",
        "reports": [
          {
            "slug": "item-by-party",
            "name": "Item Report by Party",
            "stub": false,
            "requires": ["party_type", "party_id"]
          },
          {
            "slug": "item-sales-purchase-summary",
            "name": "Item Sales and Purchase Summary",
            "stub": false
          },
          { "slug": "low-stock-summary", "name": "Low Stock Summary", "stub": false },
          { "slug": "rate-list", "name": "Rate List", "stub": false },
          { "slug": "stock-detail", "name": "Stock Detail (batch & expiry)", "stub": false },
          { "slug": "stock-summary", "name": "Stock Summary", "stub": false }
        ]
      },
      {
        "id": "party",
        "label": "Party",
        "reports": [
          { "slug": "receivable-ageing", "name": "Receivable Ageing", "stub": false },
          {
            "slug": "party-by-item",
            "name": "Party Report by Item",
            "stub": false,
            "requires": ["sku_id"]
          },
          {
            "slug": "party-statement",
            "name": "Party Statement (Ledger)",
            "stub": false,
            "requires": ["party_type", "party_id"]
          },
          { "slug": "party-outstanding", "name": "Party-wise Outstanding", "stub": false },
          {
            "slug": "sales-summary-category",
            "name": "Sales Summary – Category Wise",
            "stub": false
          }
        ]
      }
    ]
  }
}
```

### 7.2 Run

`GET /api/v1/reports/{slug}/run?period_kind=month&month=2026-08&party_type=customer&party_id=&sku_id=&cursor=&limit=200`

`422 REPORT_FILTER_REQUIRED` if `requires` missing.

Response:

```json
{
  "success": true,
  "data": {
    "slug": "profit-and-loss",
    "title": "Profit And Loss",
    "stub": false,
    "stub_message": null,
    "period_label": "August 2026",
    "columns": [
      { "key": "account", "label": "Account", "type": "string" },
      { "key": "amount", "label": "Amount", "type": "money" }
    ],
    "rows": [
      { "account": "Sales", "amount": 450000.0 },
      { "account": "COGS", "amount": -280000.0 }
    ],
    "totals": { "gross_profit": 170000.0, "net_profit": 121000.0, "net_margin_pct": 26.89 },
    "banners": [],
    "next_cursor": null
  }
}
```

Stub example:

```json
{
  "slug": "tds-payable",
  "stub": true,
  "stub_message": "TDS/TCS is not auto-withheld in v1. Profile flags do not fill this report.",
  "columns": [
    { "key": "date", "label": "Date", "type": "date" },
    { "key": "party", "label": "Party", "type": "string" },
    { "key": "section", "label": "Section", "type": "string" },
    { "key": "taxable", "label": "Taxable", "type": "money" },
    { "key": "rate", "label": "TDS %", "type": "number" },
    { "key": "tds", "label": "TDS amount", "type": "money" }
  ],
  "rows": [],
  "totals": { "taxable": 0, "tds": 0 }
}
```

`gstr-2b-match` may include `"banners": [{ "kind": "two_b_stale", "message": "GSTR-2B is stale. Last pull …" }]`.

### 7.3 Export

`GET /api/v1/reports/{slug}/export?format=xlsx|pdf` + same query as run.  
`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `application/pdf`.

### 7.4 Analytics

`GET /api/v1/reports/analytics/overview?period_kind=month&month=2026-08`

```json
{
  "success": true,
  "data": {
    "net_revenue": 450000.0,
    "gross_profit": 170000.0,
    "margin_pct": 37.78,
    "units": 8120,
    "net_gst": 18500.0,
    "top_items": [{ "sku_id": "uuid", "name": "Dolo 650", "revenue": 22000.0, "units": 400 }],
    "channel_mix": { "counter_pct": 92.0, "kiosk_pct": 8.0 },
    "payment_mix": { "cash_pct": 71.0, "khata_pct": 29.0 }
  }
}
```

`GET /api/v1/reports/analytics/sales-register?…` → table like FR-49.  
`GET /api/v1/reports/analytics/products?…` → `{ "rows": [{ "sku_id", "name", "units", "revenue", "cogs", "profit", "margin_pct", "dead_stock": false }] }`.  
`GET /api/v1/reports/analytics/accounts-gst?…`:

```json
{
  "success": true,
  "data": {
    "pnl": { "sales": 450000.0, "cogs": 280000.0, "expenses": 49000.0, "net": 121000.0 },
    "gst_by_slab": [{ "rate": 12, "output": 30000.0, "itc": 18000.0, "net_payable": 12000.0 }],
    "cash_and_collections": { "cash_sales": 320000.0, "khata_repayments": 40000.0 },
    "purchases": { "grn_total": 210000.0, "input_gst": 25200.0 },
    "daybook_preview": { "journal_count": 86, "debit_total": 900000.0, "credit_total": 900000.0 }
  }
}
```

Export: `GET /api/v1/reports/analytics/{tab}/export?format=xlsx|pdf`.

### 7.5 Internal (CA sharing)

`POST /internal/v1/reports/run`

```json
{
  "tenant_id": "uuid",
  "location_id": "uuid",
  "slug": "trial-balance",
  "period_kind": "month",
  "month": "2026-08"
}
```

Same `data` shape as 7.2. Service auth. Used to build CA Excel. Must still exclude secrets.

### 7.6 UI

Sidebar **Business → Reports**. Search box + group headings. Click report → period bar + table + Excel + PDF. Analytics: sub-nav Overview / Sales register / Products / Accounts & GST. Stub reports visible with empty table + banner (not hidden). Row click: bill/GRN/CN opens the owning module if permitted. Paywall Free/Starter.

No events emitted except optional `AuditEvent` `report.exported` (slug, period, format) — recommended for GST JSON-adjacent exports; required for CA? CA module audits share. Reports export audit is **should**.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Catalogue complete**  
Given Growth  
When Owner opens Reports  
Then every report named in §2 appears exactly once under the stated group, including three TDS/TCS stubs.

**US-2 TB ties from books**  
Given posted journals that books TB says tie  
When Trial Balance is run for that month  
Then closing Dr = closing Cr and numbers equal books TB API.

**US-3 P&L not a second ledger**  
Given Sales journal credits 100,000 and expenses 10,000  
When P&L is run  
Then sales 100,000 and expenses 10,000; summing POS bills independently is not used if it would differ.

**US-4 GSTR-1 table**  
Given B2B and B2C bills in August  
When GSTR-1 (Sales) is run  
Then both appear; B2C GSTIN blank; totals match output GST journals.

**US-5 2B stale banner**  
Given last 2B pull failed  
When GSTR-2B match is opened  
Then stale banner is shown; rows from last pull if any.

**US-6 TDS stub**  
Given any period  
When TDS Payable is run  
Then zero rows, totals 0, stub message visible; Excel still downloads the empty table.

**US-7 Audit trail**  
Given an IRN reject audit event  
When Audit Trail is run  
Then the event appears **without** IRP passwords; bill number may appear.

**US-8 Bill-wise profit**  
Given a bill taxable 100 COGS 70  
When Bill-wise Profit is run  
Then profit 30; footer sums.

**US-9 Daybook balances**  
Given all journals in a day  
When Daybook is run  
Then sum debit = sum credit.

**US-10 Low stock**  
Given SKU below reorder  
When Low Stock Summary is run  
Then that SKU is listed with qty and reorder level.

**US-11 Party statement**  
Given customer khata bills and a repayment  
When Party Statement is run for that customer  
Then opening, Drs, Crs, closing match khata movements for the period.

**US-12 Analytics mix v1**  
Given cash and khata only  
When Overview is opened  
Then payment mix is Cash vs Khata; no UPI slice.

**US-13 Dead stock flag**  
Given SKU unsold 91 days with qty > 0  
When Products analytics is opened  
Then `dead_stock` is true.

**US-14 Export**  
Given any live report with rows  
When PDF and Excel are requested  
Then files open with title, GSTIN, period, totals; no Rx; no secrets.

**US-15 Required filters**  
Given Item Report by Party without party  
When run  
Then `422 REPORT_FILTER_REQUIRED`.

**US-16 Plan gate**  
Given Free  
When Reports is opened  
Then Growth paywall.

**US-17 CA reuse**  
Given internal run for `trial-balance`  
When `ca-sharing` calls it  
Then the same columns/rows as the console run for that period.

---

## 9. Edge Cases & Error Handling

| Case                     | Behaviour                                                     |
| ------------------------ | ------------------------------------------------------------- |
| Books TB broken          | Report shows error banner; do not display a forced-tie table. |
| Empty period             | Zero rows, zero totals, success.                              |
| Stub reports             | Always empty; never copy TDS flags into rows.                 |
| `all` huge daybook       | Paginate; PDF cap 5,000 rows with notice.                     |
| Missing party/sku filter | `422 REPORT_FILTER_REQUIRED`                                  |
| 2B never pulled          | GSTR-2B match empty + “never pulled” banner.                  |
| CN in sales HSN          | Negative qty/taxable.                                         |
| Kiosk vs counter         | Channel mix uses bill.channel; kiosk still cash at POS.       |
| SaaS in cash report      | Excluded.                                                     |
| Expired plan             | `403`; no data leak of other tenants.                         |
| Audit credential event   | Redact secret values.                                         |
| Rate list banned SKU     | Unmapped SKUs do not appear (inventory already unmapped).     |
| Party outstanding ₹0     | Omitted from outstanding report.                              |
| FY vs calendar year      | Labels distinguish “FY 2026-27” vs “Calendar 2026”.           |

---

## 10. Open Questions / Assumptions

**Assumptions:**

1. Favourite is a **fixed** group, not user starring.
2. Low stock / rate list / stock reports use **current** stock except PDF “as of generated”.
3. Bill-wise profit = taxable − COGS (GST not in profit).
4. Ageing buckets match khata: current / 30–60 / 60+.
5. TDS/TCS never auto-filled from profile flags in v1.
6. Analytics payment mix is cash vs khata only.
7. GSTR-2 is local purchase register, not a GSTN return JSON (JSON prepare is GSTR-1 and GSTR-3B in books).
8. Closing stock on item sales/purchase summary is current on-hand.

**Open questions:**

1. Per-user favourite stars (v1: no).
2. Period-end stock snapshot tables (v1: current on-hand).
3. Whether bill-wise profit should use GST-inclusive revenue (v1: taxable vs COGS).
