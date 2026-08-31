# Requirement Doc: Purchase Returns (`purchase-returns`)

## 1. Summary

`purchase-returns` lets the chemist return stock **to the distributor**. It is **Free**, tied to Purchases (usable whenever Purchases is usable). Two flows: **PurchaseReturn** against a **GRN** (wrong / excess / damaged) — debit note, stock out, AP reduced; and **ExpiryReturn** from a calendar of Batches still inside the distributor’s return window — raise return and track **claimed / accepted / credit received**. Near-expiry may go to **Offers** (markdown) instead; that choice is the chemist’s, and Offers is a Growth module. Cannot return more than remaining Batch qty. Cannot post into a locked period (`books-gst` owns the lock; this module checks). No negative stock.

Module layout: `modules/purchase-returns/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.

## 2. Scope (in / out)

### In

- Tenant + `location_id` on every query and mutation.
- **PurchaseReturn** against a posted **GRN**: reason wrong / excess / damaged; line qty ≤ remaining Batch qty; debit note; inventory decrement; event for AP reverse.
- **ExpiryReturn** calendar: Batches with expiry inside `return_window_days` on the distributor; raise return; statuses claimed → accepted → credit received.
- Shortcut to Offers for near-expiry markdown (paywall if not Growth).
- Period-lock check on document date.
- Idempotent post (`client_return_id`).
- Print/download debit note (GST-facing document for the distributor — shop copy).
- List of purchase and expiry returns.

### Out

- Customer credit notes (`returns`).
- GRN create (`purchases`).
- Pay distributor / journal UI (`books-gst` posts from events).
- Offers coupon CRUD (`offers`) — this module only deep-links.
- POS Hold, FEFO picker (`pos-billing`).
- Stock take (`stock-take`).
- Creating SKUs.
- Customer debit notes (out of v1 globally).
- Returning more than remaining qty; posting into a locked period.

## 3. Dependencies

| Module | Why |
|---|---|
| `purchases` | Original **GRN** and lines; distributor on the GRN. |
| `inventory` | Batch remaining qty; decrement (`type=purchase_return` / `expiry_return`); no negative qty. |
| `distributors-reorder` | `return_window_days` and distributor identity (Free stub may have null window). |
| `plan-gating` | Free (tied to Purchases). Offers shortcut Growth. |
| `tenancy` | Tenant + `location_id`. |
| `auth` / `manage-users` | Owner / Manager default (same as Purchases). |
| `audit` | **AuditEvent** on post and status change. |
| `books-gst` | Period lock; journal reverse GRN path on posted return; AP display updates. |
| `offers` | Optional markdown instead of return (Growth). |
| `account-settings` | Debit note prefix if invoice settings expose one; else module prefix (see §10). |

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall scope every return read and write to tenant + `location_id`.

**FR-2:** The system shall create a **PurchaseReturn** only against a posted **GRN** at this Location.

**FR-3:** The system shall require a reason ∈ `{wrong, excess, damaged}` on **PurchaseReturn**.

**FR-4:** The system shall allow full or partial line qty per GRN line / Batch; qty must be > 0 and ≤ remaining Batch qty at post time.

**FR-5:** The system shall not return more units than remain on that Batch (`CONFLICT`); concurrent returns compete transactionally like POS last unit.

**FR-6:** The system shall on **PurchaseReturn** post: issue a debit note number unique per tenant per FY, decrement inventory, emit `purchase-returns.purchase_return.posted` so books reverse the GRN path (Cr Inventory / GST input as applicable, Dr AP).

**FR-7:** The system shall list batches on the **ExpiryReturn** calendar when: Batch.qty > 0, `expiry_date` is on or before `today + return_window_days`, and the Batch’s source GRN has a `distributor_id` whose `return_window_days` is non-null.

**FR-8:** The system shall omit distributors with null `return_window_days` from the expiry calendar (Free stubs often unset).

**FR-9:** The system shall raise an **ExpiryReturn** (status **claimed**) for selected calendar rows with qty ≤ remaining; same stock-out and debit-note rules as FR-6 with event `purchase-returns.expiry_return.raised`.

**FR-10:** The system shall track **ExpiryReturn** status **claimed → accepted → credit received**; staff may advance status only forward; **AuditEvent** on each change.

**FR-11:** The system shall offer a choice on near-expiry calendar rows: raise **ExpiryReturn** or go to **Offers** (markdown). Offers route is Growth-paywalled when locked; return remains available on Free.

**FR-12:** The system shall reject post when `document_date` is in a locked period (`FORBIDDEN`).

**FR-13:** The system shall reject edits to a posted return in a locked period; corrections are a new document in an open period (no silent un-return in the locked month).

**FR-14:** The system shall make post idempotent on `client_return_id` per tenant.

**FR-15:** The system shall never leave Batch.qty negative.

**FR-16:** The system shall not decrement on Hold (POS); this module only decrements on posted returns.

**FR-17:** The system shall show remaining qty from inventory at form time and re-check at post.

**FR-18:** The system shall keep English UI i18n-ready.

**FR-19:** The system shall not allow return of a Batch that was never on the source GRN for **PurchaseReturn** (line must reference GRNLine/batch from that GRN).

**FR-20:** The system shall allow **ExpiryReturn** against remaining Batch qty even if the original GRN is in a locked period, provided the **return’s** `document_date` is in an open period (reversal in the open period).

**FR-21:** The system shall compute debit note taxable/GST from original GRN line PTR and GST % × returned paid-equivalent qty (scheme units: see §10).

**FR-22:** The system shall append **AuditEvent** on post (actor, qty, amounts, ids).

**FR-23:** The system shall expose list + detail of PurchaseReturn and ExpiryReturn with debit note no, distributor, status, amounts, dates.

**FR-24:** The system shall call inventory decrement with `client_mutation_id = client_return_id` so retries do not double-decrement.

## 5. Non-Functional Requirements

- **Plan:** Free (tied to Purchases). Offers shortcut Growth.
- **Idempotency:** `client_return_id`.
- **Atomicity:** debit note + stock out succeed together; books journal is async from the event (same pattern as GRN). If inventory fails, no debit note.
- **Lock:** Check books before post.
- **Concurrency:** Conditional qty update on Batch.
- **Tenancy:** `location_id` required.
- **Money:** INR, 2 dp.
- **Timezone:** IST for calendar windows and FY debit note numbering.
- **i18n:** English ships.
- **Audit:** Append-only.

## 6. Data Model / Entities

### PurchaseReturn (`purchase-returns` owns)

| Field | Type | Notes |
|---|---|---|
| `purchase_return_id` | string | PK |
| `client_return_id` | string | Idempotency |
| `grn_id` | string | Original **GRN** |
| `distributor_id` | string | |
| `debit_note_no` | string | Unique per tenant+FY |
| `fy` | string | |
| `document_date` | date | Lock-checked |
| `reason` | enum | `wrong` \| `excess` \| `damaged` |
| `taxable` | number | |
| `gst_amount` | number | |
| `total` | number | |
| `actor_user_id` | string | |
| `posted_at` | datetime | |

### PurchaseReturnLine

| Field | Type | Notes |
|---|---|---|
| `line_id` | string | |
| `purchase_return_id` | string | |
| `grn_line_id` | string | |
| `sku_id` | string | |
| `batch_id` | string | |
| `qty` | number | Base units returned |

### ExpiryReturn (`purchase-returns` owns)

| Field | Type | Notes |
|---|---|---|
| `expiry_return_id` | string | PK |
| `client_return_id` | string | |
| `distributor_id` | string | |
| `debit_note_no` | string | Issued at claimed |
| `fy` | string | |
| `document_date` | date | |
| `status` | enum | `claimed` \| `accepted` \| `credit_received` |
| `taxable` | number | |
| `gst_amount` | number | |
| `total` | number | |
| `actor_user_id` | string | |

### ExpiryReturnLine

| Field | Type | Notes |
|---|---|---|
| `line_id` | string | |
| `expiry_return_id` | string | |
| `sku_id` | string | |
| `batch_id` | string | |
| `qty` | number | |
| `expiry_date` | date | Snapshot |
| `grn_id` | string, null | Source GRN if known |

Debit note numbers: separate series from customer CreditNote and from GRN (prefix from settings or `DN-`).

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/purchase-returns`. Bearer + `location_id`. Standard envelopes.

### UI

- Tied to Purchases: nav **Purchase & expiry returns** (or tabs on Purchases). Free.
- Tab Purchase return: pick GRN → lines → qty/reason → Post.
- Tab Expiry calendar: table of eligible batches, raise return, status chips, **Markdown in Offers** action.
- Detail: debit note print/PDF.

### REST

**GET `/purchase-returns/kpis?location_id=`**  
Optional summary `{ purchase_returns_this_month, expiry_claimed_open }` — not in catalogue KPIs; list is enough. Omit dedicated KPI cards if not in §3.21; calendar is the expiry UX.

**GET `/purchase-returns/grns/{grn_id}/returnable?location_id=`**  
Lines with `qty_remaining` per Batch (original GRN qty+free minus prior purchase/expiry returns against that batch from this GRN).

**POST `/purchase-returns/purchase-returns?location_id=`**  
```json
{
  "client_return_id": "uuid",
  "grn_id": "grn-...",
  "document_date": "2026-08-31",
  "reason": "damaged",
  "lines": [{ "grn_line_id": "...", "batch_id": "...", "qty": 2 }]
}
```
`403` locked; `409` over qty / idempotency body mismatch; `200` `{ purchase_return_id, debit_note_no }`.

**GET `/purchase-returns/purchase-returns?location_id=&page=`**  
List.

**GET `/purchase-returns/purchase-returns/{id}?location_id=`**  
Detail.

**GET `/purchase-returns/expiry-calendar?location_id=`**  
`data[]`: `{ sku_id, name, batch_id, batch_no, expiry_date, qty, distributor_id, distributor_name, return_window_days, grn_id, mrp }`.

**POST `/purchase-returns/expiry-returns?location_id=`**  
```json
{
  "client_return_id": "uuid",
  "distributor_id": "dist-...",
  "document_date": "2026-08-31",
  "lines": [{ "batch_id": "...", "qty": 5 }]
}
```
Creates **ExpiryReturn** `claimed`, stock out, debit note.

**GET `/purchase-returns/expiry-returns?location_id=&status=`**

**POST `/purchase-returns/expiry-returns/{id}/status?location_id=`**  
`{ "status": "accepted"|"credit_received" }` forward-only.

**GET `/purchase-returns/debit-notes/{debit_note_no}/pdf?location_id=`**  
Shop copy PDF.

### Inventory

`POST /inventory/batches/decrement` with `type: purchase_return` or `expiry_return`, `document_date`, `client_mutation_id`.

### Events published

| Event | Payload |
|---|---|
| `purchase-returns.purchase_return.posted` | `{ tenant_id, location_id, purchase_return_id, grn_id, distributor_id, document_date, debit_note_no, taxable, gst_amount, total, lines }` |
| `purchase-returns.expiry_return.raised` | `{ tenant_id, location_id, expiry_return_id, distributor_id, document_date, debit_note_no, taxable, gst_amount, total, lines, status: "claimed" }` |
| `purchase-returns.expiry_return.status.changed` | `{ tenant_id, location_id, expiry_return_id, status }` |

Books: reverse GRN path on posted/raised (stock+AP). Status accepted/credit_received do **not** post a second AP reversal (see §10).

### Offers

UI link: `/offers/new?sku_id=` (Growth). No offers API owned here.

### Lock

`books-gst` lock on `document_date` before post.

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 — Purchase return**  
Given GRN with Batch qty 10 remaining  
When Manager posts damaged qty 3 in an open period  
Then debit note exists, Batch qty is 7, AP event fired, AuditEvent stored.

**US-2 — Over qty**  
Given remaining 3  
When they post 4  
Then `CONFLICT`, qty stays 3, no debit note.

**US-3 — Concurrent**  
Given remaining 1  
When two posts of 1 run  
Then one succeeds, one `CONFLICT`, final qty 0.

**US-4 — Locked period**  
Given July locked  
When `document_date` is in July  
Then post blocked.

**US-5 — Reverse in open period**  
Given original GRN in locked July  
When return dated August (open) qty 1  
Then post succeeds (FR-20).

**US-6 — Expiry calendar**  
Given distributor window 60 days, Batch expires in 30 days, qty > 0  
When calendar loads  
Then the Batch is listed.

**US-7 — No window**  
Given stub with null `return_window_days`  
When calendar loads  
Then that distributor’s batches are absent.

**US-8 — Raise expiry return**  
When they raise claimed qty 2  
Then status claimed, stock −2, debit note issued.

**US-9 — Status track**  
When they mark accepted then credit received  
Then status is credit_received and stock is not decremented again.

**US-10 — Offers choice**  
Given Growth  
When they choose markdown  
Then Offers create opens with sku_id. Given Free, paywall shows; they can still raise ExpiryReturn.

**US-11 — Idempotent**  
When the same `client_return_id` is posted twice  
Then one debit note and one decrement.

**US-12 — Wrong GRN batch**  
When `batch_id` is not on that GRN  
Then `VALIDATION_ERROR`.

**US-13 — Cashier**  
Given default Cashier  
Then module is forbidden.

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| qty > remaining | `CONFLICT` |
| qty ≤ 0 | `VALIDATION_ERROR` |
| Locked period | `FORBIDDEN` |
| Lock down | `DEPENDENCY_FAILURE` |
| Unknown GRN | `NOT_FOUND` |
| Batch already 0 | `CONFLICT` |
| Status skip claimed → credit_received | Allowed forward skip or require sequential — §10 sequential |
| Status backward | `CONFLICT` |
| Idempotent retry | Replay |
| Printer/PDF fail | Return posted; reprint |
| Scheme-only remaining | Returnable; value 0 taxable if entire remainder is free — §10 |
| Banned SKU still in stock | Return allowed (disposal) |
| Offers module locked | Paywall; return still works |
| `location_id` missing | `VALIDATION_ERROR` |

## 10. Open Questions / Assumptions

1. **PurchaseReturn** posts immediately: debit note + stock out + AP event. No extra workflow statuses.
2. **ExpiryReturn** stock out and debit note + AP event happen at **claimed**. **Accepted** and **credit received** are tracking only (distributor response). Books does not reverse AP twice.
3. If the distributor **rejects** a claimed expiry return, v1 has no “unclaim/restock” button. Chemist uses **stock-take** (Growth) or a books wastage/adjustment path in an open period. Logged as a gap; do not invent reverse-expiry in v1.
4. **Status advances** are sequential: claimed → accepted → credit_received; skipping is `CONFLICT`.
5. **return_window_days** lives on Distributor (`distributors-reorder`). Null → excluded from calendar. Free stub can be patched with window only on Growth directory — on Free, Owner cannot set window unless we allow a field on stub. **Assumption:** Purchases stub POST/PATCH may include optional `return_window_days` so Free shops can use the expiry calendar without Growth. Purchases §10 did not include this; **this module assumes** a PATCH on stub `return_window_days` via `POST /purchases/distributors/stub` optional field **or** a small field on stub edit in this module. To avoid inventing a third directory, **assume** `return_window_days` is optional on stub create in `purchases` and editable on `GET/PATCH` stub from purchase-returns: `PATCH /purchase-returns/distributors/{id}/return-window` `{ days }` on Free. That is a minimal field, not Growth directory. Logged.
6. **Calendar “inside window”:** a Batch is eligible when `today <= expiry_date <= today + return_window_days` (near-expiry, not yet expired), qty > 0, and the distributor has `return_window_days` set. Already-expired Batches are not on this calendar; use **PurchaseReturn** (damaged) if the chemist still ships them back.
7. **Debit note prefix** `DN-` + FY sequence if Invoice Settings has no purchase-return prefix.
8. **Taxable on return:** PTR × returned_qty for units that were paid on the GRN. If returning mixed paid+free, allocate returned qty to paid first then free (free reduces stock, ₹ 0). If only free remains, taxable 0, stock still out, AP 0.
9. **Near-expiry Offers** is a navigation choice, not an auto-markdown.
10. **Cannot return more than remaining Batch qty** is global remaining, not only remaining-from-this-GRN, but PurchaseReturn lines still must be that GRN’s batches. If sales already consumed some, remaining < original.
11. **FY** Apr–Mar IST for debit_note_no uniqueness.
12. **No customer debit notes.**
13. **Hold** never involved.
14. **Idempotency** same-key different body → `CONFLICT`.
15. **PDF** is shop record; not IRN (purchase debit notes to distributor are not the retail IRN product).
