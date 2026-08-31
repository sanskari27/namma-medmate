# Requirement Doc: Distributors & Reorder (`distributors-reorder`)

## 1. Summary

`distributors-reorder` is the Growth module for the shop’s **distributor directory**, per-distributor **supply list**, **price compare**, **reorder** suggestions, and **PurchaseOrder** documents. Suggested orders are grouped by cheapest distributor (including free-goods schemes). Sending an order raises a **PurchaseOrder**. Record GRN invokes `purchases` (does not re-own **GRN**). Outstanding payable is a **display** of accounts payable owned by `books-gst`; **Pay distributor** is `books-gst`. On Free, `purchases` may already have created name+GSTIN stubs; this module enriches the same `distributor_id`.

Module layout: `modules/distributors-reorder/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.

## 2. Scope (in / out)

### In

- Tenant + `location_id` on every query and mutation.
- Plan gate: Growth (Pro included).
- Reorder KPIs: items below reorder level, distributors to order from, estimated savings vs priciest source, open POs.
- Suggested orders grouped by cheapest distributor (landed cost including free-goods schemes).
- Row: in-stock, reorder level, landed price with **Best price** badge, savings/pack, switch to cheaper distributor, qty stepper.
- **Send order** raises a **PurchaseOrder**.
- PO table: Draft / Sent / Received, **Record GRN** (opens `purchases`), **Mark received**.
- Distributors directory: firm, contact, GSTIN, drug licence, address, payment terms, outstanding (read from books), active toggle; add / edit / remove.
- Supply list: SKUs supplied, purchase price, scheme, landed cost, MRP, margin, price rank, preferred-source star.
- Price compare: side-by-side quotes, best price, saving/pack, “only multi-source” toggle.
- Display AP outstanding; do not post payments.

### Out

- GRN capture, CSV inward, duplicate invoice, labels (`purchases`).
- Inventory qty, FEFO decrement, opening CSV (`inventory`).
- Pay distributor, journals, period lock posting (`books-gst`). This module **reads** lock only if it ever posted books documents — it does not post GRNs or payments.
- Purchase/expiry returns UI (`purchase-returns`) except that return window on the distributor record is stored here for that module to read.
- Offers markdown (`offers`).
- WhatsApp campaign send of POs (not in catalogue — see §10).
- Negative stock, branches, wholesale marketplace.

## 3. Dependencies

| Module                  | Why                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `purchases`             | Historical PTR/scheme from **GRN** lines to seed supply list; Record GRN navigation; Free stubs share `distributor_id`. |
| `inventory`             | On-hand, reorder_level, MRP, SKU identity for suggestions.                                                              |
| `plan-gating`           | Growth.                                                                                                                 |
| `tenancy`               | Tenant + `location_id`.                                                                                                 |
| `auth` / `manage-users` | Owner / Manager default; Pharmacist/Cashier default no.                                                                 |
| `audit`                 | **AuditEvent** on PO send, directory add/edit/remove, preferred-source change.                                          |
| `books-gst`             | Read AP outstanding per `distributor_id`; Pay distributor lives there.                                                  |
| `purchase-returns`      | Reads `return_window_days` from distributor (later).                                                                    |

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall scope every read and write to tenant + `location_id`.

**FR-2:** The system shall refuse the module UI and mutating APIs when Growth is locked (`FORBIDDEN` + paywall). Posted Free stubs remain readable to `purchases` on Free.

**FR-3:** The system shall show reorder KPIs: count of SKUs with `0 < on_hand ≤ reorder_level` or on_hand = 0 with reorder_level > 0 (items below reorder — see §10); count of distinct cheapest distributors in the suggestion set; estimated savings vs priciest source for suggested qtys; count of **PurchaseOrder** in Draft or Sent (open POs).

**FR-4:** The system shall group suggested order lines by the cheapest distributor for that SKU, where cheapest is lowest **landed cost per pack** including free-goods scheme (effective cost = `(paid_qty × price) / (paid_qty + free_qty)` using the supply-list scheme).

**FR-5:** The system shall show on each suggested row: in-stock, reorder level, landed price, **Best price** badge when that source is rank 1, savings/pack vs the priciest active source, control to switch to another cheaper-or-listed distributor, quantity stepper (default suggested qty — §10).

**FR-6:** The system shall, on **Send order** for a group, create a **PurchaseOrder** with status **Sent** (or Draft then send — FR-7) containing the selected SKUs and qtys for that `distributor_id`.

**FR-7:** The system shall persist PO status ∈ `{Draft, Sent, Received}`. Saving without send creates **Draft**. Send moves Draft → Sent. Mark received moves Sent → Received.

**FR-8:** The system shall list POs with status, distributor, dates, line count, and actions Record GRN and Mark received.

**FR-9:** The system shall on **Record GRN** navigate/invoke `purchases` new GRN with `po_id` so the chemist enters invoice/batch/expiry; this module shall not post stock.

**FR-10:** The system shall on **Mark received** set PO status Received without implying a **GRN** exists.

**FR-11:** The system shall provide a Distributors directory with: firm name, contact, GSTIN, drug licence, address, payment terms, outstanding (display), active toggle.

**FR-12:** The system shall allow add, edit, and remove of distributors. Remove of a distributor with GRNs or POs shall deactivate (`active=false`) rather than hard-delete if history exists (`CONFLICT` on hard delete — §10).

**FR-13:** The system shall show outstanding payable from `books-gst` AP balance for that `distributor_id` (shop AP view). This module shall not accept a payment.

**FR-14:** The system shall maintain a supply list per distributor: which **SKU**s they supply, purchase price, scheme (paid+free), landed cost, MRP (from inventory), margin, price rank among active suppliers of that SKU, preferred-source star.

**FR-15:** The system shall allow the chemist to add/edit/remove supply-list rows and to star exactly one preferred source per SKU (or one star among suppliers — changing star moves it).

**FR-16:** The system shall provide price compare: side-by-side quotes for a SKU (or the compare tab), best price highlighted, saving/pack vs others, toggle **only multi-source** (hide SKUs with a single supplier).

**FR-17:** The system shall compute estimated savings KPI as sum over suggested lines of `(priciest_landed − chosen_landed) × suggested_packs` (pack = shop pack).

**FR-18:** The system shall default the suggestion’s distributor to the cheapest; preferred-source star shall not override cheapest grouping unless the user switches (catalogue: grouped by cheapest). Star is for supply-list display and optional switch target.

**FR-19:** The system shall enrich Free `purchases` stubs: same `distributor_id`, additional fields editable here.

**FR-20:** The system shall store `return_window_days` on the distributor for **ExpiryReturn** calendar consumers (not shown as a separate product tab here if not in 3.13 — see §10).

**FR-21:** The system shall keep English UI i18n-ready.

**FR-22:** The system shall append **AuditEvent** on Send order, directory remove/deactivate, GSTIN change.

**FR-23:** The system shall not decrement inventory; Hold is irrelevant; PO is not stock.

**FR-24:** The system shall not post into AP; books posts AP on **GRN**.

**FR-25:** The system shall exclude inactive distributors from cheapest grouping and from “distributors to order from” unless they already have an open PO.

**FR-26:** The system shall require Growth for directory/supply/reorder/PO mutations.

## 5. Non-Functional Requirements

- **Plan:** Growth. Data retained on expiry; UI paywalled.
- **Tenancy:** `location_id` on every call.
- **Money:** INR, 2 dp. Landed cost from supply list; MRP from inventory (GST-inclusive).
- **i18n:** English ships.
- **Outstanding:** Eventual consistency with books AP acceptable within the same read-after-GRN refresh (GET outstanding at page load).
- **Audit:** PO send and directory money-adjacent fields (GSTIN).
- **No negative stock:** this module does not change qty.

## 6. Data Model / Entities

### Distributor (`distributors-reorder` owns; stubs created by `purchases`)

| Field                | Type          | Notes                 |
| -------------------- | ------------- | --------------------- |
| `distributor_id`     | string        | PK                    |
| `name`               | string        | Firm                  |
| `contact_name`       | string, null  |                       |
| `contact_phone`      | string, null  |                       |
| `contact_email`      | string, null  |                       |
| `gstin`              | string, null  |                       |
| `drug_licence`       | string, null  |                       |
| `address`            | string, null  |                       |
| `payment_terms`      | string, null  |                       |
| `return_window_days` | integer, null | For expiry returns    |
| `active`             | boolean       |                       |
| `source`             | enum          | `stub` \| `directory` |

Outstanding is **not** stored here; read from books.

### SupplyListRow

| Field             | Type    | Notes                                                           |
| ----------------- | ------- | --------------------------------------------------------------- |
| `supply_id`       | string  | PK                                                              |
| `distributor_id`  | string  |                                                                 |
| `sku_id`          | string  |                                                                 |
| `purchase_price`  | number  | Per pack or per base unit — §10: per **pack** as chemist quotes |
| `scheme_paid_qty` | integer | e.g. 10                                                         |
| `scheme_free_qty` | integer | e.g. 1                                                          |
| `preferred`       | boolean | Star; at most one true per sku_id among active distributors     |

Landed per pack = `purchase_price * scheme_paid_qty / (scheme_paid_qty + scheme_free_qty)` when scheme_free > 0; else `purchase_price`.  
Price rank: rank of landed among active supply rows for that `sku_id` (1 = best).  
Margin: `(SKU.mrp − landed) / SKU.mrp` when MRP > 0 (MRP is pack MRP GST-inclusive — §10).

### PurchaseOrder (`distributors-reorder` owns)

| Field            | Type           | Notes                           |
| ---------------- | -------------- | ------------------------------- |
| `po_id`          | string         | PK                              |
| `distributor_id` | string         |                                 |
| `status`         | enum           | `draft` \| `sent` \| `received` |
| `sent_at`        | datetime, null |                                 |
| `received_at`    | datetime, null |                                 |
| `actor_user_id`  | string         |                                 |

### PurchaseOrderLine

| Field             | Type   | Notes                  |
| ----------------- | ------ | ---------------------- |
| `po_line_id`      | string |                        |
| `po_id`           | string |                        |
| `sku_id`          | string |                        |
| `qty`             | number | Order qty in **packs** |
| `landed_snapshot` | number | At send time           |

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/distributors-reorder`. Bearer + `location_id`. Growth on mutations. Standard envelopes.

### UI

- Business/Catalogue: **Reorder** (suggestions + PO table + KPIs) and **Distributors** (directory, supply list, price compare). One module, two routes allowed.
- Send order on a cheapest group.
- Record GRN → `purchases` with `po_id`.
- Outstanding column; “Pay” control if shown must deep-link to `books-gst` Pay distributor, not post here.

### REST

**GET `/distributors-reorder/reorder/kpis?location_id=`**  
`{ items_below_reorder, distributors_to_order, estimated_savings, open_po_count }`.

**GET `/distributors-reorder/reorder/suggestions?location_id=`**  
`data[]` groups: `{ distributor_id, distributor_name, lines: [{ sku_id, name, on_hand, reorder_level, landed, best_price, savings_per_pack, qty_suggested, qty, alternate_distributors[] }] }`.

**PATCH `/distributors-reorder/reorder/suggestions/qty`**  
Session/draft quantities before send: `{ sku_id, distributor_id, qty }` (or include in Send body only — Send body is source of truth).

**POST `/distributors-reorder/purchase-orders?location_id=`**  
Create Draft or Sent: `{ "distributor_id", "status": "draft"|"sent", "lines": [{ "sku_id", "qty" }] }`. Send order uses `status: sent`.

**GET `/distributors-reorder/purchase-orders?location_id=&status=`**  
PO table.

**GET `/distributors-reorder/purchase-orders/{po_id}?location_id=`**  
Detail for Record GRN prefill (purchases may GET this).

**POST `/distributors-reorder/purchase-orders/{po_id}/send?location_id=`**  
Draft → Sent.

**POST `/distributors-reorder/purchase-orders/{po_id}/mark-received?location_id=`**  
→ Received.

**GET `/distributors-reorder/distributors?location_id=&q=`**  
Directory + `outstanding` (from books) + `active`.

**POST `/distributors-reorder/distributors?location_id=`**  
Add firm.

**PATCH `/distributors-reorder/distributors/{distributor_id}?location_id=`**  
Edit including `active`, `return_window_days`.

**DELETE `/distributors-reorder/distributors/{distributor_id}?location_id=`**  
Deactivate if history; else delete.

**GET `/distributors-reorder/distributors/{distributor_id}/outstanding?location_id=`**  
Proxy/read `{ amount }` from books.

**GET `/distributors-reorder/supply?location_id=&distributor_id=&sku_id=`**  
Supply list with computed landed, margin, price_rank, preferred, mrp.

**PUT `/distributors-reorder/supply?location_id=`**  
Upsert row `{ distributor_id, sku_id, purchase_price, scheme_paid_qty, scheme_free_qty, preferred }`.

**DELETE `/distributors-reorder/supply/{supply_id}?location_id=`**

**GET `/distributors-reorder/price-compare?location_id=&sku_id=&multi_source_only=false`**  
Side-by-side quotes. If `sku_id` omitted, list SKUs (filtered by multi-source toggle).

### Events published

| Event                                      | Payload                                                            |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `distributors-reorder.po.raised`           | `{ tenant_id, location_id, po_id, distributor_id, status, lines }` |
| `distributors-reorder.po.status.changed`   | `{ tenant_id, location_id, po_id, status }`                        |
| `distributors-reorder.distributor.updated` | `{ tenant_id, location_id, distributor_id, active }`               |

### Events / APIs consumed

- `GET` inventory SKUs (on_hand, reorder_level, mrp).
- `GET` books AP outstanding.
- `GET` purchases GRN history optional to **suggest** supply-list seed (not required for v1 if chemist keys prices) — see §10.

### purchases

`GET /distributors-reorder/purchase-orders/{po_id}` for prefill. No circular UI import.

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 — Cheapest group**  
Given SKU S supplied by A landed ₹10 and B landed ₹8 (scheme 10+1)  
When suggestions load  
Then S appears under B with Best price badge.

**US-2 — Switch distributor**  
Given the row under B  
When the Manager switches to A  
Then the line moves to A’s group with A’s landed and badge updated.

**US-3 — Send order**  
When they Send order on B’s group with stepper qty 5  
Then a **PurchaseOrder** exists status Sent, lines qty 5, open PO KPI increments.

**US-4 — Record GRN**  
Given that PO  
When Record GRN  
Then Purchases new GRN opens with `po_id` and distributor B; no stock moves until GRN save.

**US-5 — Mark received**  
When they Mark received without a GRN  
Then PO status is Received.

**US-6 — Directory**  
When Owner adds firm, GSTIN, licence, address, payment terms, active on  
Then the row appears and Purchases picker can select it.

**US-7 — Outstanding display**  
Given books AP ₹ 5000 for that distributor  
When directory loads  
Then outstanding shows ₹ 5000; Pay is not posted by this API.

**US-8 — Price compare**  
Given two sources  
When only multi-source is on  
Then SKUs with one supplier are hidden; saving/pack matches priciest − best.

**US-9 — Preferred star**  
When they star distributor A for SKU S  
Then A’s supply row shows star and B’s does not.

**US-10 — Paywall**  
Given Free  
When they open Reorder  
Then Growth paywall; Purchases stubs still work on Purchases.

**US-11 — Inactive**  
Given distributor inactive  
When suggestions compute  
Then they are not used as cheapest source.

**US-12 — Savings KPI**  
Given suggested qty 2 packs, priciest ₹10, chosen ₹8  
Then estimated savings includes ₹4 for that line.

**US-13 — Stub enrich**  
Given Free stub name+GSTIN  
When Growth edits address  
Then `distributor_id` is unchanged and GRNs still link.

## 9. Edge Cases & Error Handling

| Case                                     | Behaviour                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| No supply list for a low SKU             | SKU omitted from grouped suggestions (cannot choose a distributor)          |
| All suppliers inactive                   | SKU omitted                                                                 |
| Send with qty ≤ 0                        | `VALIDATION_ERROR`                                                          |
| Mark received on Draft                   | `CONFLICT` (must be Sent)                                                   |
| Send on Received                         | `CONFLICT`                                                                  |
| Plan not Growth                          | `FORBIDDEN`                                                                 |
| Delete distributor with GRNs             | Deactivate only                                                             |
| Books outstanding fail                   | Show “—” / `DEPENDENCY_FAILURE` on outstanding field; directory still loads |
| Duplicate GSTIN same location            | `CONFLICT` (assumption §10)                                                 |
| Switch to distributor without supply row | `VALIDATION_ERROR`                                                          |
| `location_id` missing                    | `VALIDATION_ERROR`                                                          |
| Cashier                                  | `FORBIDDEN`                                                                 |
| PO Record GRN after plan expiry          | Purchases still Free; PO GET may be Growth-gated — see §10                  |

## 10. Open Questions / Assumptions

1. **Send order** creates a **PurchaseOrder** with status Sent. The chemist shares it outside the product (print/export PO). v1 has **no** WhatsApp PO send (catalogue does not specify a WABA template for orders). Export/print of PO is allowed as UI on the PO table (PDF/Excel of lines) — assumed in so Send is useful; not a separate sold module.
2. **Suggested qty** default = `max(0, reorder_level − on_hand)` in **packs** (convert base units using pack_size). If on_hand already ≥ reorder, SKU is not “below reorder”.
3. **Items below reorder** includes Out of stock when `reorder_level > 0`. If reorder_level is null/0, SKU is not in the suggestion set (same as inventory Low stock).
4. **Purchase price on supply list is per shop pack** (not split tablet). Landed and savings/pack use that pack.
5. **Margin** uses SKU MRP (GST-inclusive) vs landed (ex-GST price). Approximate; not a tax-true margin.
6. **Preferred star** does not change cheapest grouping; it is supply-list + compare UX and a switch target.
7. **Supply list is chemist-maintained.** GRN PTR may later seed a suggestion; v1 does not auto-overwrite supply price on every GRN (avoid silent rank jumps). Assumption: no auto-update from GRN.
8. **return_window_days** is stored on Distributor here so `purchase-returns` can build the expiry calendar. Directory UI should include “Return window (days)” even though 3.13 bullet list omitted it — required by 3.21. Logged as assumption.
9. **Remove** = deactivate when any GRN or PO exists; hard delete only if no documents.
10. **Duplicate GSTIN** per location blocked when GSTIN is non-null.
11. **Open POs** = Draft + Sent, not Received.
12. **Mark received** does not create a GRN and does not increment stock.
13. **Pay distributor** is never implemented in this module.
14. **Record GRN after plan expiry:** `po_id` prefill GET is Growth-gated; chemist can still create a GRN manually on Free without PO link.
15. **Free stub** and Growth directory are one entity; `source` flips to `directory` on first Growth save of extra fields.
16. **Scheme 0+0** invalid; `scheme_paid_qty ≥ 1`, `scheme_free_qty ≥ 0`.
17. **Books lock** does not block PO send (PO is not a books document). GRN post still lock-checked in purchases.
