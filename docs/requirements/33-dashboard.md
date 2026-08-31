# Requirement Doc: Dashboard (`dashboard`)

**Plan gate:** Always on (Free and all paid). Individual **quick actions** and panels honour the owning module’s gate (Reorder → Growth paywall; Prescriptions → Starter; New purchase always Free).  
**Surface:** Pharmacy Partner Console — home. Sidebar live badge for pending Prescriptions is fed by this module’s shell + `prescriptions` count API.  
**Owner module:** `modules/dashboard/{ui,api,docs}`  
**Does not own Bills or stock.** Aggregates the same sales (`pos-billing`) and stock (`inventory`) as the rest of the console.

---

## 1. Summary

Dashboard is the chemist’s **home**: a time-aware greeting plus operational KPIs so the owner knows today’s trade, what is waiting, and what is about to stock-out.

It shows month-to-date revenue, average bill today, items sold today, and **Dues to collect** when khata is outstanding. KPI cards cover today’s sales (counter vs kiosk, day-over-day %, 7-day sparkline), bills today, prescriptions pending review, and stock alerts (low + expiring).

Quick actions: **New sale · New purchase · Prescriptions · Reorder** (Reorder gated Growth). Sales analytics: metric Revenue/Orders, window 7D/30D/12M, chart Donut/Grouped bars/Line, legend Counter and Kiosk. Breakdown: channel split, payment-mode mix **Cash vs Khata**, top categories.

**Needs your attention:** prescriptions to Verify, low-stock to Restock. Also: expiring-soon list, top sellers (7 days), recent transactions that open the bill.

Numbers are not a second ledger — they are `SUM`/`COUNT` of posted Bills and live inventory already used by Orders, Sales, and Inventory.

---

## 2. Scope (in / out)

### In scope

- Dashboard route always registered; no plan lock on the page itself.
- Greeting (morning/afternoon/evening IST) + owner/staff first name.
- Hero stats: MTD revenue, avg bill today, items sold today, Dues to collect (hide or ₹0 when khata module locked **or** outstanding = 0 — show when outstanding > 0).
- KPI cards listed in §4.
- Quick actions with plan-aware navigation/paywall.
- Sales analytics controls + charts.
- Breakdown lists: channel, Cash vs Khata, top categories.
- Needs your attention + expiring-soon + top sellers 7d + recent bills.
- Sidebar badge payload: pending prescriptions count (API consumed by app shell).
- Deep-links: bill → POS invoice/Orders detail; low stock → inventory; Rx → prescriptions; Reorder → distributors-reorder or paywall.

### Out of scope

- Posting sales, GRN, or reorder POs.
- Full reports catalogue (`reports`).
- SaaS MRR / HQ command center (`admin-*`).
- Editing stock or bills.
- UPI/Card mix (v1 Cash vs Khata only).
- Custom dashboard builder / drag widgets.
- Real-time websocket required (poll 60 s OK).

---

## 3. Dependencies (be specific: APIs/events needed from other slugs)

| Other slug             | Need                                                                               | Contract                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pos-billing`          | Posted bills today/MTD/windows, recent txns, channel split, category via lines→SKU | Aggregates: `GET /dashboard/sales` implemented here querying Bill tables **or** POS read APIs `GET /bills?from&to` |
| `inventory`            | Low stock count, expiring ≤ 4 months (match inventory KPI), units                  | `GET /inventory/alerts/summary` `{ low, expiring, expiring_list }`                                                 |
| `prescriptions`        | Pending review count, Verify list                                                  | `GET /prescriptions/counts` `{ pending_review, overdue_sla }`; `GET /prescriptions?status=pending&limit=5`         |
| `khata`                | Outstanding total                                                                  | `GET /khata/summary` `{ outstanding_paise }` Starter                                                               |
| `plan-gating`          | Reorder, Prescriptions, Khata, Kiosk presence in charts                            | features map                                                                                                       |
| `distributors-reorder` | Reorder action                                                                     | navigate; 403 paywall Growth                                                                                       |
| `purchases`            | New purchase                                                                       | `/purchases/new`                                                                                                   |
| `pos-billing` UI       | New sale                                                                           | `/pos`                                                                                                             |
| `auth`                 | Greeting name, permission `dashboard` (all roles with console)                     |                                                                                                                    |
| `tenancy`              | location                                                                           |                                                                                                                    |

Dashboard **may** subscribe to `BillPosted` to invalidate cache. It must not write GMV.

---

## 4. Functional Requirements (FR-n: The system shall ... ATOMIC)

### 4.1 Greeting and hero

- **FR-1:** The system shall greet `Good morning` 05:00–11:59, `Good afternoon` 12:00–16:59, `Good evening` 17:00–04:59 `Asia/Kolkata`, plus staff display name.
- **FR-2:** The system shall show **MTD revenue** = sum of `invoice_total_paise` for posted bills with `bill_date` in current IST month.
- **FR-3:** The system shall show **average bill today** = today revenue / today bill_count (₹0 if 0 bills).
- **FR-4:** The system shall show **items sold today** = sum of BillLine.qty for today’s posted bills.
- **FR-5:** The system shall show **Dues to collect** when `khata.outstanding_paise > 0`; hide the chip when khata locked or outstanding = 0.
- **FR-6:** The system shall use the same Bill set as Orders/Sales (posted only; no holds; no draft_irn).

### 4.2 KPI cards

- **FR-7:** The system shall card **Today’s sales**: total ₹, split counter vs kiosk, **DoD %** vs yesterday same civil day, **7-day sparkline** of daily revenue.
- **FR-8:** The system shall card **Bills today**: count of posted bills `bill_date=today`.
- **FR-9:** The system shall card **Prescriptions pending review**: count from `prescriptions` (0 + lock/paywall CTA if Starter locked rather than a fake number).
- **FR-10:** The system shall card **Stock alerts**: `low_count + expiring_count` (low = sellable ≤ reorder; expiring = earliest batch expiry ≤ 4 months, inventory definition). Click filters Inventory.

### 4.3 Quick actions

- **FR-11:** The system shall offer **New sale** → POS (always).
- **FR-12:** The system shall offer **New purchase** → purchases new GRN (always).
- **FR-13:** The system shall offer **Prescriptions** → prescriptions queue (Starter paywall if locked).
- **FR-14:** The system shall offer **Reorder** → reorder module (**Growth paywall if locked**). No silent empty reorder.
- **FR-15:** The system shall not offer UPI settlement or kiosk launch as a fourth unlabeled action (kiosk is Pro elsewhere).

### 4.4 Sales analytics

- **FR-16:** The system shall metric toggle **Revenue** | **Orders** (orders = bill count).
- **FR-17:** The system shall window toggle **7D** | **30D** | **12M** (IST civil).
- **FR-18:** The system shall chart toggle **Donut** | **Grouped bars** | **Line**.
- **FR-19:** The system shall legend **Counter** and **Kiosk** (channel). Donut = channel share; grouped bars = per-period counter vs kiosk; line = two series.
- **FR-20:** The system shall not include a UPI series.

### 4.5 Breakdown

- **FR-21:** The system shall show channel split % and ₹ for the selected analytics window.
- **FR-22:** The system shall show payment-mode mix **Cash vs Khata** (count + ₹) for that window. Omit Khata slice only if 0; still no UPI.
- **FR-23:** The system shall show **top categories** (from SKU category / chip mapping) by revenue in the window, max 8.

### 4.6 Attention lists

- **FR-24:** The system shall list **Needs your attention**: prescriptions to **Verify** (pending, urgent/SLA first, max 5) and low-stock to **Restock** (max 5). Empty sections omitted or “You’re clear”.
- **FR-25:** The system shall list **expiring-soon** batches (≤ 4 months, highest ₹ at risk first, max 5) linking to Inventory Expiring.
- **FR-26:** The system shall list **top sellers 7 days** (SKU name, units, revenue) from posted lines last 7 days.
- **FR-27:** The system shall list **recent transactions** (last 10 posted bills) with invoice no, total, tender, channel; click opens the bill (Orders detail or POS invoice modal).
- **FR-28:** The system shall keep sidebar **Prescriptions** live badge = pending review count; `GET /dashboard/badges` used by shell. Badge 0 hides or shows empty.
- **FR-29:** The system shall show kiosk revenue as 0 if Pro never used; still keep legend.
- **FR-30:** The system shall not show draft holds as sales.
- **FR-31:** The system shall refresh on interval 60 s and on window focus.
- **FR-32:** The system shall format money in ₹ Indian grouping; DoD +green / −red; 0 bills DoD = “—” not +∞.

---

## 5. Non-Functional Requirements

- **NFR-1:** `GET /dashboard/summary` p95 ≤ 500 ms (pre-aggregate daily rollups acceptable).
- **NFR-2:** Cache 30 s per location.
- **NFR-3:** Always-on route; sub-widgets fail independently (Rx API down → card error, sales still show).
- **NFR-4:** i18n English greeting keys.
- **NFR-5:** Cashier sees POS-relevant tiles; hide Reorder if permission missing (still paywall if Growth locked and they have permission).
- **NFR-6:** Same paise math as POS; no float.

---

## 6. Data Model / Entities

Optional rollup (this module):

### 6.1 `DashboardDailySales`

| Column                                         | Notes                    |
| ---------------------------------------------- | ------------------------ |
| `tenant_id, location_id, bill_date`            | PK                       |
| `revenue_counter_paise`, `revenue_kiosk_paise` |                          |
| `bills_counter`, `bills_kiosk`                 |                          |
| `units`                                        |                          |
| `cash_paise`, `khata_paise`                    | invoice totals by tender |
| `gst_paise`                                    |                          |

Maintained by `BillPosted` / `CreditNotePosted` projector **or** computed live. Credit notes: **assumption v1 dashboard revenue is gross posted bills, not net of CN** (same as Sales ledger assumption) unless product later switches to net. Document in UI? Keep gross for “today’s sales” to match bill count; CN is returns.

If no rollup table, aggregate on read with indexes.

---

## 7. API / Interface Contracts (REST JSON, events, UI props)

### 7.1 `GET /dashboard/summary`

Query: `location_id`.

```json
{
  "ok": true,
  "data": {
    "greeting": { "key": "good_evening", "name": "Priya" },
    "mtd_revenue_paise": 4500000,
    "avg_bill_today_paise": 11800,
    "items_sold_today": 42,
    "dues_to_collect_paise": 80000,
    "show_dues": true,
    "today": {
      "revenue_paise": 23600,
      "revenue_counter_paise": 20000,
      "revenue_kiosk_paise": 3600,
      "dod_percent": 12.5,
      "sparkline_7d": [1000, 1200, 900, 1500, 800, 1100, 23600],
      "bills_count": 2
    },
    "prescriptions_pending_review": 3,
    "stock_alerts": { "low": 4, "expiring": 2, "total": 6 }
  }
}
```

`sparkline_7d`: last 7 civil days ending today, daily **revenue** paise.  
`dod_percent`: `(today - yesterday) / yesterday * 100` one decimal; null if yesterday 0 and today 0; if yesterday 0 and today > 0 → `null` with `dod_label: "n/a"`.

### 7.2 `GET /dashboard/analytics`

Query: `metric=revenue|orders`, `window=7d|30d|12m`, `location_id`.

```json
{
  "ok": true,
  "data": {
    "series": [{ "bucket": "2026-08-31", "counter": 20000, "kiosk": 3600 }],
    "channel_split": {
      "counter_paise": 20000,
      "kiosk_paise": 3600,
      "counter_pct": 84.7,
      "kiosk_pct": 15.3
    },
    "payment_mix": { "cash_paise": 18000, "khata_paise": 5600, "cash_bills": 1, "khata_bills": 1 },
    "top_categories": [{ "id": "fever", "label": "Fever", "revenue_paise": 9000 }]
  }
}
```

`bucket`: day for 7D/30D; month `YYYY-MM` for 12M. Values are paise if metric=revenue else integer counts.

### 7.3 `GET /dashboard/attention`

```json
{
  "prescriptions_to_verify": [
    { "prescription_id": "uuid", "patient_name": "...", "overdue": true }
  ],
  "low_stock": [{ "sku_id": "uuid", "name": "...", "sellable_qty": 2, "reorder_level": 10 }],
  "expiring_soon": [
    {
      "sku_id": "uuid",
      "batch_no": "...",
      "expiry": "2026-11-30",
      "qty": 8,
      "mrp_value_paise": 40000
    }
  ],
  "top_sellers_7d": [{ "sku_id": "uuid", "name": "...", "units": 40, "revenue_paise": 50000 }],
  "recent": [
    {
      "bill_id": "uuid",
      "invoice_no": "INV-260011",
      "invoice_total_paise": 11800,
      "tender": "cash",
      "channel": "counter",
      "posted_at": "..."
    }
  ]
}
```

Recent click: client opens `/orders` detail or invoice modal via `GET /bills/:id`.

### 7.4 `GET /dashboard/badges`

```json
{ "prescriptions_pending": 3 }
```

App shell polls this for the sidebar. If prescriptions module locked, return `{ "prescriptions_pending": 0 }` **or** omit badge — **assumption: return 0 and do not show a lock badge; the Prescriptions nav item has its own lock icon via plan-gating.**

### 7.5 Events

None emitted. Consumes `BillPosted`, `CreditNotePosted` (invalidate), inventory alert changes optional.

### 7.6 UI props

```ts
type DashboardPageProps = {
  locationId: string;
  features: {
    prescriptions: boolean;
    khata: boolean;
    reorder: boolean; // Growth
    kiosk: boolean;
  };
};

type PaymentMix = { cash: number; khata: number }; // no upi
type ChannelLegend = 'Counter' | 'Kiosk';
```

Charts: Donut/Grouped bars/Line — implement with a single analytics response.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Greeting**  
Given 21:00 IST named Priya  
When Dashboard loads  
Then “Good evening, Priya”.

**US-2 MTD matches Sales**  
Given Growth, same month filter  
When staff compares MTD tile to Sales ledger month totals  
Then invoice_total sums match.

**US-3 DoD**  
Given yesterday ₹100 today ₹112  
Then DoD +12%.

**US-4 Dues**  
Given khata outstanding ₹800  
Then Dues to collect ₹800; if 0, chip hidden.

**US-5 Counter vs kiosk card**  
Given both channels today  
Then today’s sales card shows both amounts.

**US-6 Reorder paywall**  
Given Free  
When Reorder  
Then Growth paywall; POS New sale still works.

**US-7 Prescriptions pending**  
Given 2 pending Rx Starter  
Then KPI 2; sidebar badge 2; attention Verify lists them.

**US-8 Analytics toggles**  
When metric Orders, window 7D, chart Line  
Then line series are bill **counts** per day for Counter and Kiosk.

**US-9 Payment mix**  
Then only Cash and Khata; no Card slice.

**US-10 Recent opens bill**  
When staff taps a recent row  
Then invoice/bill detail for that `bill_id`.

**US-11 Holds excluded**  
Given 3 holds and 1 posted  
Then bills today = 1.

**US-12 Stock alerts**  
Given 2 low and 1 expiring  
Then stock alert card 3; lists match Inventory.

**US-13 Module failure**  
Given prescriptions API 500  
Then Rx card shows retry; sales KPIs still render.

**US-14 Always on Free**  
Given Free  
Then Dashboard route 200 with sales from POS; Prescriptions/Reorder actions paywall.

---

## 9. Edge Cases & Error Handling (include §10 failure catalogue rows that apply)

| Catalogue event         | Dashboard behaviour                                                       |
| ----------------------- | ------------------------------------------------------------------------- |
| Plan expired            | Dashboard stays; Growth Reorder paywalls; kiosk series may be historical. |
| Wizard / KYC incomplete | All zeros; greeting still shows; New sale may fail at Charge (POS).       |
| WhatsApp send fail      | N/A.                                                                      |
| Locked period           | Historical months still in 12M chart (read-only).                         |
| Concurrent last unit    | N/A.                                                                      |
| Hold expired            | Never counted as a bill.                                                  |

Additional:

- Timezone: “today” is IST, not UTC.
- Division by zero avg bill / DoD handled (FR-32).
- Khata locked: `show_dues=false`; payment mix is 100% cash if only cash bills.
- No kiosk bills ever: kiosk series zeros; legend still present.
- Top categories unknown SKU category → bucket “Other”.
- Sparkline includes today as last point.
- Credit notes do not reduce `bills today` count (original sale remains).
- Large 12M: use monthly buckets.

---

## 10. Open Questions / Assumptions

1. Revenue tiles = sum of posted `invoice_total_paise` (gross, khata included), **not** net of credit notes in v1.
2. Dues chip hidden at ₹0 or khata locked.
3. Expiring window **≤ 4 months** to match Inventory KPI.
4. Sidebar badge uses `GET /dashboard/badges` → prescriptions pending; 0 if module locked.
5. Reorder is the only quick action hard-gated Growth; Prescriptions gated Starter.
6. Poll 60 s; optional `BillPosted` cache bust.
7. Payment mix Cash vs Khata only.
8. Chart legend exactly Counter, Kiosk.
9. Greeting bounds as FR-1.
10. Dashboard never writes stock or bills.
11. Average bill today uses bill_count of **posted** bills today, not holds.
12. Sparkline values are revenue paise even when analytics metric is Orders (card sparkline is always revenue).
