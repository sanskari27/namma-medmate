# Requirement Doc: Orders (`orders`)

**Plan gate:** Free forever for **today + last 7 days including today**. Bills older than 7 days deep-link to Sales (`sales-ledger`, Growth paywall if not Growth).  
**Surface:** Pharmacy Partner Console — sidebar **Orders**.  
**Owner module:** `modules/orders/{ui,api,docs}`  
**Does not own Bills.** Reads posted Bills and HeldCarts from `pos-billing`. Does not re-compute GMV, GST, or stock.

---

## 1. Summary

Orders is the chemist’s **7-day bill board**: every counter and kiosk bill posted in the last 7 civil days including today (`Asia/Kolkata`), plus an extra **Held** filter for parked carts that are not yet billed.

Staff use it to find today’s invoice by number, name, or phone; resume or discard holds; record khata repayment (delegated to `khata`); share, print, or return a posted bill; and open a detail pane with facts, status timeline, linked prescription, and the itemised bill.

Free shops can bill on day one and still find the invoice. History older than 7 days is not listed here — a row/CTA sends them to **Sales** (`sales-ledger`). If Growth is locked, that navigation shows the Growth paywall; POS and this 7-day board stay usable.

This module never posts a Charge, never deducts stock, never deletes a bill, and never issues a credit note. Those remain `pos-billing`, `inventory`, and `returns`.

---

## 2. Scope (in / out)

### In scope

- Orders list UI: filters **All · Counter · Kiosk · Khata outstanding · Held**.
- Search by invoice number, customer name, or phone (and kiosk token / hold id for Held).
- Date window **fixed**: today and the previous 6 civil days (7 days inclusive). No custom range on Free Orders.
- Row actions by state (see FR-20–FR-24).
- Detail drawer/page: facts, status timeline, linked prescription, itemised lines + GST + tender.
- “Older than 7 days” empty-state / banner linking to Sales (`sales-ledger`) with plan-gating.
- Deep-links: Resume hold → POS; Record repayment → `khata` modal; Return → `returns`; Share/Print → `pos-billing` invoice APIs.
- Live refresh when `BillPosted` / hold mutations occur (poll or websocket; poll 15 s acceptable in v1).

### Out of scope

- Charging, stock, GST calculation, IRN (`pos-billing` / `books-gst`).
- Full date-range ledger, Excel/PDF export of all history (`sales-ledger`, Growth).
- Creating customers, editing khata limits, sending khata reminder campaigns (`customers` / `khata` / `crm`).
- Credit-note capture UI beyond navigating to `returns`.
- UPI/Card filters (v1 tender is cash|khata only).
- Kiosk shopper UI (`kiosk`).
- Dashboard KPIs (`dashboard`) — Orders is the operational board, not the home tiles.
- Deleting or editing posted bills.
- Showing more than 7 days of posted bills **in this module** (even for Pro).

---

## 3. Dependencies (be specific: APIs/events needed from other slugs)

| Other slug | Need | Contract |
|---|---|---|
| `pos-billing` | Posted Bills in window; invoice PDF/thermal/WhatsApp share payload; HeldCart list | `GET /bills?from&to&channel&tender&paid_status`; `GET /bills/:id`; `GET /bills/:id.pdf`; `GET /bills/:id/print`; `GET /bills/:id/whatsapp-share`; `GET /pos/holds`; `POST /pos/holds/:id/resume`; `POST /pos/holds/:id/discard` |
| `plan-gating` | Sales deep-link paywall | `GET /plan/features` → `sales-ledger` |
| `auth` | Session; permission `orders` (defaults: Owner, Manager, Pharmacist, Cashier) | Bearer token |
| `tenancy` | `location_id` | header |
| `khata` | Outstanding flag; Record repayment modal | `GET /khata/bills/:billId/outstanding`; `POST /khata/repayments` (idempotent `client_repayment_id`) — Orders **hosts** the button, khata **owns** the POST |
| `returns` | Return action | Navigate `/returns/new?billId=` |
| `customers` | Name/phone already on bill snapshot; 360 History | Navigate `/customers/:id` |
| `prescriptions` | Linked Rx on bill | `GET /prescriptions/:id` summary for timeline |
| `audit` | Timeline facts may include charge actor | Read via bill payload / `GET /audit?entity=bill&id=` |
| `whatsapp` | Not auto-send; share uses POS `wa.me` | — |

Events consumed (read-model optional): `BillPosted`, hold expired/discarded/charged. If no projector, list queries `pos-billing` tables directly via `libs/db-services` **read** APIs owned by POS (Orders must not write Bill rows).

---

## 4. Functional Requirements (FR-n: The system shall ... ATOMIC)

### 4.1 Access and window

- **FR-1:** The system shall expose Orders on every plan including Free and expired-paid-as-Free.
- **FR-2:** The system shall scope the board to `tenant_id` + `location_id`.
- **FR-3:** The system shall include a posted bill iff `bill_date` (IST civil date) ∈ `[today-6d, today]` OR `posted_at` in that window — **canonical: `bill_date` IST**. Held rows use `created_at` still open.
- **FR-4:** The system shall **not** provide a date-range picker that extends beyond those 7 days on this page.
- **FR-5:** The system shall, when search matches a bill older than 7 days, **not** list it; it shall show “Older bills live in Sales” with a button to `sales-ledger` (Growth paywall if locked).
- **FR-6:** The system shall require permission `orders` (Cashier included).

### 4.2 Filters and search

- **FR-7:** The system shall provide filters **All · Counter · Kiosk · Khata outstanding · Held** as mutually exclusive tabs (All = posted counter+kiosk in window, excluding holds). **Held** shows HeldCarts only.
- **FR-8:** The system shall interpret **Counter** as `channel=counter` posted bills.
- **FR-9:** The system shall interpret **Kiosk** as `channel=kiosk` posted bills (staff-cashed tokens).
- **FR-10:** The system shall interpret **Khata outstanding** as posted `tender=khata` bills whose remaining receivable > 0 (not fully repaid). Fully repaid khata bills appear under All/Counter/Kiosk but not this tab.
- **FR-11:** The system shall interpret **Held** as `HeldCart.status=open` and not expired (server expires on read).
- **FR-12:** The system shall search by invoice number (prefix/contains), customer name, phone (last 10 digits), and when Held: kiosk token id. Search is case-insensitive.
- **FR-13:** The system shall not offer payment-mode UPI/Card filters.

### 4.3 List rows

- **FR-14:** The system shall show each posted row with: invoice no, bill_date/time, channel badge (Counter/Kiosk), customer name or “Walk-in”, phone if any, tender Cash|Khata, invoice total, paid-status (`Paid` for cash; `Outstanding` / `Partial` / `Settled` for khata), line count, actor.
- **FR-15:** The system shall show each held row with: hold time, expires-in countdown, channel, customer if attached, line count, cart total preview (from snapshot), kiosk token if any. **No invoice number.**
- **FR-16:** The system shall sort posted rows by `posted_at` desc default. Held by `expires_at` asc (soonest first).
- **FR-17:** The system shall paginate (default 25).
- **FR-18:** The system shall show an empty state on All: “No bills in the last 7 days — New sale” linking to POS.
- **FR-19:** The system shall badge Khata outstanding count on the tab (query `khata` / bills remaining).

### 4.4 Row actions (state machine)

- **FR-20:** The system shall, for **Khata outstanding**, show **Record repayment** which opens the `khata` repayment modal (cash chips ₹500 / ₹1000 / ₹2000 / Half / Full) against that bill/customer. Success refreshes the row paid-status.
- **FR-21:** The system shall, for **any posted** bill, show **History** (customer 360 if named; else bill-only timeline), **Share bill** (POS WhatsApp pre-fill), **Print invoice** (thermal/PDF), **Return** (navigate to returns with `billId`).
- **FR-22:** The system shall, for **Held**, show **Resume** (POST resume then navigate to POS cart) and **Discard** (confirm; no stock movement).
- **FR-23:** The system shall not show Charge, UPI collect, or Delete on any row.
- **FR-24:** The system shall disable Resume if the hold expired between render and click; toast `HOLD_EXPIRED`.

### 4.5 Detail

- **FR-25:** The system shall open a detail pane with **facts**: invoice no, status, channel, tender, totals, GST breakup, round-off, IRN if any, doctor, pharmacist on duty, actor, timestamps.
- **FR-26:** The system shall show a **status timeline** in order: cart held (if any) → charged/posted → IRN (if B2B) → khata repayments (if any) → credit notes (if any, from `returns` list-by-bill).
- **FR-27:** The system shall show **linked prescription** when `prescription_id` is set (patient, doctor, status) with a link to `prescriptions`; omit section if null.
- **FR-28:** The system shall show the **itemised bill** (SKU, batch, qty, GST %, line SP, schedule tag) using POS `GET /bills/:id` — not a separate calculator.
- **FR-29:** The system shall show kiosk token id on kiosk-channel bills.

### 4.6 Integrity

- **FR-30:** The system shall never update `Bill` amounts or stock.
- **FR-31:** The system shall treat Cancel as Return (credit note), never DELETE.
- **FR-32:** The system shall hide Held carts that expired; they do not become unpaid bills.

---

## 5. Non-Functional Requirements

- **NFR-1:** List p95 ≤ 400 ms for 7-day window up to 2,000 bills.
- **NFR-2:** English UI, i18n keys.
- **NFR-3:** Tenant isolation; Cashier cannot see other locations (none sold anyway).
- **NFR-4:** Poll every 15 s or invalidate on focus; no stale “outstanding” after repayment without refresh.
- **NFR-5:** Share/print failures do not change bill state (catalogue: printer fail → reprint).
- **NFR-6:** Repayment idempotency is `khata`’s `client_repayment_id`; Orders must generate a UUID per click and reuse on retry.

---

## 6. Data Model / Entities

Orders **owns no durable money entities**. Optional read cache:

### 6.1 `OrdersListProjection` (optional)

| Column | Notes |
|---|---|
| `tenant_id, location_id, bill_id` | PK for posted |
| `bill_date`, `posted_at`, `channel`, `tender`, `invoice_no`, `customer_name`, `phone`, `total_paise`, `khata_remaining_paise`, `prescription_id` | denorm from Bill + khata |

If omitted, `GET /orders` queries `pos-billing` + `khata` remaining.

Held rows are `HeldCart` from POS.

---

## 7. API / Interface Contracts (REST JSON, events, UI props)

### 7.1 `GET /orders`

Query:

| Param | Values |
|---|---|
| `location_id` | required |
| `tab` | `all` \| `counter` \| `kiosk` \| `khata_outstanding` \| `held` |
| `q` | optional search |
| `cursor`, `limit` | default 25 |

Server applies 7-day `bill_date` filter for posted tabs. **Does not accept `from`/`to` that exceed the window** (ignore or 400 `WINDOW_FIXED`).

Response:

```json
{
  "ok": true,
  "data": {
    "window": { "from": "2026-08-25", "to": "2026-08-31", "tz": "Asia/Kolkata" },
    "tab_counts": { "all": 40, "counter": 32, "kiosk": 8, "khata_outstanding": 5, "held": 2 },
    "items": [
      {
        "kind": "bill",
        "bill_id": "uuid",
        "invoice_no": "INV-260010",
        "bill_date": "2026-08-31",
        "posted_at": "2026-08-31T10:00:00.000Z",
        "channel": "counter",
        "tender": "khata",
        "paid_status": "outstanding",
        "khata_remaining_paise": 50000,
        "customer_id": "uuid",
        "customer_name": "Ravi",
        "phone": "9876543210",
        "invoice_total_paise": 50000,
        "line_count": 3,
        "actor_name": "Cashier 1",
        "actions": ["repay", "history", "share", "print", "return"]
      },
      {
        "kind": "hold",
        "hold_id": "uuid",
        "kiosk_token_id": null,
        "channel": "counter",
        "expires_at": "2026-08-31T16:20:00.000Z",
        "cart_total_paise": 11800,
        "line_count": 2,
        "customer_name": null,
        "actions": ["resume", "discard"]
      }
    ],
    "next_cursor": null
  }
}
```

`paid_status`: `paid` (cash posted), `outstanding`, `partial`, `settled` (khata remaining 0).

### 7.2 `GET /orders/:billId`

Same as POS `GET /bills/:id` plus:

```json
{
  "timeline": [
    { "at": "...", "type": "held", "hold_id": "..." },
    { "at": "...", "type": "posted", "actor_user_id": "..." },
    { "at": "...", "type": "khata_repayment", "payment_id": "...", "amount_paise": 10000 },
    { "at": "...", "type": "credit_note", "cn_id": "...", "cn_no": "CN-26-001" }
  ],
  "prescription": { "prescription_id": "uuid", "status": "dispensed" },
  "credit_notes": [],
  "khata": { "remaining_paise": 40000, "limit_paise": 100000 }
}
```

404 if bill not in tenant. **Still returned if older than 7 days** (detail by id is allowed so deep-links from notifications work) but the **list** does not include it. UI that opened from the board will be in-window; if opened via id older than 7 days, show banner “This bill is outside the 7-day board — open in Sales”.

### 7.3 Actions (proxy / navigate)

Orders UI calls:

- Share: `GET /api/v1/bills/:billId/whatsapp-share` → open `wa_me_url`.
- Print: `GET /api/v1/bills/:billId/print?fmt=thermal`.
- PDF: `GET /api/v1/bills/:billId.pdf`.
- Resume: `POST /api/v1/pos/holds/:holdId/resume` then route `/pos?holdId=`.
- Discard: `POST /api/v1/pos/holds/:holdId/discard`.
- Repay: `POST /api/v1/khata/repayments` body `{ customer_id, bill_id, amount_paise, method: "cash", client_repayment_id }` — **owned by khata**, idempotent.
- Return: client route `/returns/new?billId=`.
- History: `/customers/:id` or bill timeline only.

### 7.4 Events

Orders does not emit money events. It may emit UI analytics later (out of v1).

Consumes `BillPosted` to bump tab counts.

### 7.5 UI props

```ts
type OrdersPageProps = {
  locationId: string;
  salesLedgerUnlocked: boolean; // Growth
  khataUnlocked: boolean;       // Starter; hide repay if false and none outstanding
};

type OrdersTab = "all" | "counter" | "kiosk" | "khata_outstanding" | "held";
```

No UPI/Card columns.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Free 7-day board**  
Given a Free shop posted 3 cash bills today and 1 last week (8 days ago)  
When Owner opens Orders  
Then the 3 today appear; the 8-day-old does not; a link to Sales is visible.

**US-2 Growth paywall for old bills**  
Given US-1 and Growth locked  
When staff taps Sales  
Then paywall names Growth + price; Orders remains usable.

**US-3 Counter vs Kiosk**  
Given mixed channels  
When staff taps Kiosk  
Then only `channel=kiosk` posted bills in window appear.

**US-4 Khata outstanding**  
Given a khata bill unpaid and a cash bill  
When tab Khata outstanding  
Then only the unpaid khata bill; Record repayment is shown.

**US-5 Repayment refreshes**  
Given outstanding ₹500  
When staff records cash ₹500 via the Orders button  
Then paid_status becomes `settled` and the row leaves the outstanding tab.

**US-6 Held resume**  
Given an open hold  
When Resume  
Then POS cart is restored and hold is not listed as open.

**US-7 Held discard**  
Given an open hold with the last unit of a SKU still in inventory  
When Discard  
Then hold gone; stock unchanged.

**US-8 Search phone**  
Given named customer phone 9876543210  
When q=43210  
Then matching in-window bills appear.

**US-9 Detail itemised**  
Given a posted bill  
When row opened  
Then lines match POS invoice; GST totals match; no recomputation drift.

**US-10 Linked Rx**  
Given `prescription_id` set  
When detail opens  
Then prescription summary and link shown.

**US-11 Printer fail from Orders**  
Given print dialog cancelled  
Then bill unchanged; staff can print again.

**US-12 Expired hold**  
Given hold TTL passed  
When Held tab  
Then the hold is absent; it is not an unpaid bill.

**US-13 Cashier access**  
Given Cashier role  
When Orders opens  
Then list and print/share work; Manage Users is not implied.

**US-14 No delete**  
Given any row  
Then there is no Delete control.

---

## 9. Edge Cases & Error Handling (include §10 failure catalogue rows that apply)

| Catalogue event | Orders behaviour |
|---|---|
| Thermal printer offline | Reprint; bill stands. |
| WhatsApp send fail | Share is `wa.me` pre-fill; if WhatsApp missing, URL still copies; no SMS. |
| Plan expired | 7-day Orders stay; Sales link paywalls. |
| Hold expired (30 min) | Disappears from Held; no stock. |
| Walk-in + khata | Cannot exist if POS invariants hold; if remaining data, still list. |
| Locked period | Orders still **displays** historical bills; does not post. Return action may fail in `returns` if period locked — show that error from returns. |
| Concurrent last unit | Irrelevant to list; holds may resume into `STOCK_INSUFFICIENT` at Charge — POS error. |
| Network drop during Charge | Incomplete charges appear as **Held**, not as bills (POS FR-81). |

Additional:

- Khata module locked but historical outstanding exists (plan expired): show the row; **Record repayment** paywalls Starter; staff cannot silently write khata.
- Search matches > 7 days only: empty list + Sales CTA, not a ghost row.
- Partial khata: `paid_status=partial`; still in outstanding tab.
- Credit note after full return: bill remains on board (history never deleted); outstanding 0; Return may be blocked by returns (already fully returned).
- Timezone: bill at 00:30 IST belongs to that civil date, not UTC date.

---

## 10. Open Questions / Assumptions

1. **Canonical window field is `bill_date` IST**, not UTC `posted_at`.
2. Detail-by-id **may** load older bills with a Sales banner; the **list** never includes them.
3. Orders **does not** write repayment itself; it calls `khata`.
4. Optional projection table is not required if POS queries are fast enough.
5. No export on Orders (export is Sales).
6. Tab “All” excludes holds; Held is a separate tab (catalogue: extra filter Held).
7. v1 poll 15 s is acceptable; websocket optional.
8. Channel filter does not include a third channel.
