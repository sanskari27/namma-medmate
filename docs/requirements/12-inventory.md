# Requirement Doc: Inventory (`inventory`)

## 1. Summary

`inventory` is the pharmacy’s live catalogue of **SKU** and **Batch** records for one Location. It is **Free forever**. The Pharmacy Partner Console lists stock with clickable KPIs, filter tabs, product 360, and SKU edit. New SKUs are **not** created on this screen — they enter through **Purchases** (`purchases`) GRNs or the go-live **opening stock** Excel/CSV. This module **owns** on-hand quantity and expiry on every Batch. POS (`pos-billing`) owns the FEFO picker UI (including pharmacist PIN + reason override). Inventory exposes FEFO-ordered batch lists and **transactional** decrement/increment so a bill cannot take more than available qty and two cashiers cannot take the last unit twice. Hold never calls decrement. Banned **PlatformMasterSku** events un-map shop SKUs; until un-map completes, inventory still stores the mapping, and POS must still refuse to bill a banned master.

Module layout: `modules/inventory/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.

## 2. Scope (in / out)

### In

- Tenant + `location_id` on every query and mutation.
- Inventory home: KPI cards, tabs, search, Excel/PDF export, row actions, shortcuts to Rack map and Add-stock-via-purchase.
- Product 360 (stock, cost/MRP, margin, units sold 30/90d, days of cover, last sold, batch table, recent movement).
- SKU edit (name, composition, manufacturer, pack, category, form, schedule, HSN, GST %, racks, reorder level, photo, loose-selling toggle).
- Opening stock Excel/CSV import (go-live and re-run); emit domain event so `books-gst` can journal if needed.
- Batch quantity ledger: purchases in, sales out, customer returns restock/write-off, purchase/expiry returns out, stock-take adjustment, opening.
- FEFO-ordered `listBatchesForSku`; transactional decrement and increment; no negative `qty`.
- Thermal print of batch/barcode labels (SKU, batch, expiry, MRP) after GRN or on demand.
- Schedule tags **OTC / H / H1 / X** on every SKU.
- Loose selling: POS may sell per tablet when the SKU toggle is on.
- MRP is GST-inclusive and must not exceed the **PlatformMasterSku** DPCO ceiling.
- Listen to master ban; un-map the SKU on this Location; keep the shop SKU row for disposal until un-mapped.
- Search and stock-status APIs consumed by POS and kiosk (name, salt, brand, rack, barcode; OK / Low / Out; schedule tag).
- Check period lock before opening-stock post that would land in a locked period (`books-gst` owns the lock).

### Out

- Creating SKUs from an “Add product” button on this screen (Purchases / opening CSV only).
- Rack map UI, rack create/delete, cut-and-stick rack labels (`racks`, Growth). Inventory **stores** rack codes on the SKU and **searches** by them on Free.
- GRN capture UI and duplicate-invoice rules (`purchases`).
- Stock take count sheet and variance post (`stock-take`).
- POS cart, Hold, Charge, FEFO PIN override UI (`pos-billing`). Hold must not call decrement.
- Customer credit notes (`returns`); purchase/expiry returns UI (`purchase-returns`).
- Journal posting, GSTR, Pay distributor (`books-gst`).
- Offers / markdown (`offers`).
- Platform master CRUD, ban button, DPCO set (`master-catalogue`).
- Kiosk chrome (`kiosk`); kiosk only **calls** inventory search (OTC filter is kiosk/POS).
- Branches, stock transfer, wholesale, negative stock, offline queue.

## 3. Dependencies

| Module                                                              | Why                                                                                                                                           |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenancy`                                                           | Pharmacy tenant and `location_id`.                                                                                                            |
| `master-catalogue`                                                  | **PlatformMasterSku** map, DPCO ceiling, ban/un-ban events, salt/brand/composition for search.                                                |
| `plan-gating`                                                       | Inventory route is Free forever; Rack map shortcut may paywall Growth.                                                                        |
| `auth` / `manage-users`                                             | Session; Owner / Manager / Pharmacist (default) may open Inventory; Cashier default cannot.                                                   |
| `audit`                                                             | Append **AuditEvent** on opening import, SKU edit that changes sellable fields, every stock qty mutation, un-map on ban, label print request. |
| `books-gst`                                                         | Read-only period/FY lock. Opening stock may require a journal — inventory emits the event; books posts.                                       |
| `account-settings`                                                  | Thermal label template (batch sticker). Inventory supplies print payload.                                                                     |
| `purchases`                                                         | After GRN, purchases calls inventory stock-in and may request label print. (Caller; not a compile-time API import of UI.)                     |
| `pos-billing`, `kiosk`, `returns`, `purchase-returns`, `stock-take` | Call inventory contracts in §7; they do not own Batch qty.                                                                                    |

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall scope every inventory read and write to the authenticated pharmacy tenant and the requested `location_id`; a token for tenant A shall not read tenant B’s SKUs or Batches.

**FR-2:** The system shall persist `qty` on every Batch as a number ≥ 0 and shall reject any mutation that would make `qty` negative (`CONFLICT`, no partial apply).

**FR-3:** The system shall not decrement Batch qty when a cart is held; only Charge/posted-bill callers (and other posted stock documents) may call decrement.

**FR-4:** The system shall expose `GET` batches for a SKU ordered FEFO (earliest expiry first, then earliest received) for POS/kiosk pickers.

**FR-5:** The system shall, on default FEFO list, omit Batches whose expiry date is before today (shop calendar `Asia/Kolkata`); an explicit `include_expired=true` query shall return expired Batches for pharmacist override. Inventory shall not enforce PIN; POS shall.

**FR-6:** The system shall decrement Batch qty in a single database transaction using a conditional update (`qty >= requested`); if two requests compete for the last units, exactly one shall succeed and the other shall receive `CONFLICT` / out of stock.

**FR-7:** The system shall treat decrement and increment as idempotent when the caller sends the same `client_mutation_id` (or `Idempotency-Key`) within the tenant; a retry shall return the original result and shall not apply qty twice.

**FR-8:** The system shall increment Batch qty only via posted documents: GRN, opening stock, customer return restock, stock-take increase, or sale reversal — never from Hold.

**FR-9:** The system shall refuse POS-facing search hits for a SKU whose mapped **PlatformMasterSku** is banned, even if un-map has not finished; after un-map, the SKU shall remain in inventory lists for Owner/Manager/Pharmacist disposal but shall not appear in POS/kiosk search.

**FR-10:** The system shall, on `master-catalogue` ban event for a **PlatformMasterSku**, un-map every shop SKU on every Location that points at that master (clear mapping, set `unmapped_at`) and emit **AuditEvent**; the SKU row and remaining Batch qty shall not be deleted.

**FR-11:** The system shall cap shop MRP (GST-inclusive) at the **PlatformMasterSku** DPCO ceiling; GRN/opening/edit that would set MRP above ceiling shall fail `VALIDATION_ERROR`.

**FR-12:** The system shall store a schedule tag on every SKU in `{OTC, H, H1, X}` and return it on list, 360, and POS/kiosk search.

**FR-13:** The system shall store a loose-selling boolean on every SKU; when true, POS may sell in base units (per tablet); when false, sale qty is in packs (base units = pack size × packs). Batch `qty` is always stored in **base units**.

**FR-14:** The system shall not provide a “create SKU” action on the Inventory UI; SKU insert is allowed only from opening-stock import or from `purchases` GRN new-product lines.

**FR-15:** The system shall render Inventory KPI cards for the Location: total SKUs and total units (base units), stock value at cost with margin %, retail value at MRP, low-on-stock count, expiring ≤ 4 months with ₹ at risk, dead stock > 90 days count.

**FR-16:** The system shall, when a user clicks a KPI card, apply the corresponding list filter (same as the matching tab or a dedicated filter) without leaving Inventory.

**FR-17:** The system shall provide tabs **All · Alerts · Low stock · Expiring · Rx-only · Out of stock · Unallocated** that filter the SKU list as defined in §6 (computed fields).

**FR-18:** The system shall search SKUs by name, salt, brand, or rack code (and barcode via the POS search API).

**FR-19:** The system shall export the current filtered SKU list as Excel and as formatted PDF.

**FR-20:** The system shall show shortcuts **Rack map** (route into `racks`; Growth paywall if plan is not Growth/Pro) and **Add-stock-via-purchase** (route into `purchases` new GRN).

**FR-21:** The system shall show on each SKU row: schedule tag, rack chip(s), batch count and earliest expiry, stock pill (OK / Low / Out), MRP, stock value at cost, loose-selling toggle, Edit.

**FR-22:** The system shall persist a loose-selling toggle change from the row without opening Edit, with **AuditEvent**.

**FR-23:** The system shall open Product 360 with: in-stock (base units), cost, MRP, margin %, units sold 30d and 90d, days of cover, last sold at, batch table (batch no, expiry, qty, cost, MRP, scheme flag), recent stock movements.

**FR-24:** The system shall allow Edit of: name, composition, manufacturer, pack (size + unit), category, form, schedule, HSN, GST %, racks (codes stored here; map UI is `racks`), reorder level, photo, loose toggle — all tenant+location scoped.

**FR-25:** The system shall accept opening-stock Excel/CSV (template download); rows may be zero; the import may create SKUs and Batches; it shall match existing SKUs when identity matches; it shall not post into a locked period.

**FR-26:** The system shall apply GRN stock-in by topping up a Batch with the same SKU + batch number or creating a new Batch, and shall refresh SKU MRP and Batch cost from the GRN line when purchases calls stock-in.

**FR-27:** The system shall, after a successful GRN stock-in (and on demand from 360/batch table), offer **Print batch/barcode labels** for each new or updated Batch: SKU name/id, batch no, expiry, MRP, for the thermal label template.

**FR-28:** The system shall record a stock movement row for every qty change (type, qty signed, actor, source document id, timestamp) so 360 “recent movement” and days-sold KPIs are consistent with POS/GRN/returns.

**FR-29:** The system shall compute low-on-stock as `0 < on_hand_base <= reorder_level` when `reorder_level` is a positive integer; SKUs with null/0 reorder_level shall not appear on Low stock (Out of stock still catches zero).

**FR-30:** The system shall compute expiring ≤ 4 months as Batches with `expiry_date` in `[today, today+120 days]` and qty > 0; ₹ at risk is the sum of those Batches’ qty × cost.

**FR-31:** The system shall compute dead stock as SKUs with on_hand > 0 and no sale movement in the last 90 days (never-sold SKUs with on_hand > 0 count as dead).

**FR-32:** The system shall compute Unallocated as SKUs with no rack code assigned.

**FR-33:** The system shall compute Rx-only as schedule ∈ `{H, H1, X}`.

**FR-34:** The system shall compute Alerts as the union of Low stock, Expiring (any qualifying batch), and Out of stock.

**FR-35:** The system shall compute stock pill **Out** when on_hand = 0; **Low** when FR-29 holds; **OK** otherwise.

**FR-36:** The system shall expose POS/kiosk search returning product cards: pack, rack, GST-inclusive MRP, stock pill OK/Low/Out, schedule tag, loose flag, `sku_id`, barcode hits.

**FR-37:** The system shall reject increment/decrement/opening/GRN stock-in when `books-gst` reports the document date in a locked period (`FORBIDDEN` / locked period). Inventory does not own the lock.

**FR-38:** The system shall emit domain events listed in §7 after successful stock or mapping changes so `books-gst` and `audit` can post without inventory writing journals.

**FR-39:** The system shall keep English copy in v1 and mark all UI strings i18n-ready.

**FR-40:** The system shall allow barcode/HID input to hit the same search as typed name (scanner types into the search box).

## 5. Non-Functional Requirements

- **Plan:** Free forever; data retained if a paid plan expires.
- **Tenancy:** Every table keyed by tenant + `location_id`. No cross-tenant search.
- **Consistency:** Batch qty updates are serializable (or equivalent row lock) per Batch. No negative qty under concurrency.
- **Idempotency:** Stock mutations with `client_mutation_id` are safe under at-least-once HTTP.
- **Audit:** Append-only **AuditEvent** for qty, opening import, un-map, sellable field edits (MRP, schedule, GST, HSN, loose).
- **PII:** SKU photo is shop data; no patient PII in this module.
- **i18n:** English ships; catalogues and labels are i18n-ready.
- **Timezone:** Shop calendar and “today” / 4 months / 90 days use `Asia/Kolkata`.
- **Money:** INR, 2 decimal places. MRP GST-inclusive. Cost on Batch is PTR (GST-exclusive) for paid units; scheme units cost 0.
- **Latency:** List+KPI p95 < 1s for ≤ 20k SKUs with indexes on tenant+location, name, barcode, rack code.
- **Print:** Label print failure does not roll back stock; staff reprints.
- **Reliability:** Network retry of decrement with the same `client_mutation_id` does not double-deduct (POS Charge invariant).

## 6. Data Model / Entities

All entities: `tenant_id`, `location_id`, `created_at`, `updated_at`.

### SKU (`inventory` owns)

| Field                    | Type           | Notes                                                              |
| ------------------------ | -------------- | ------------------------------------------------------------------ |
| `sku_id`                 | string         | PK                                                                 |
| `platform_master_sku_id` | string, null   | Map to **PlatformMasterSku**; null after un-map or if never mapped |
| `unmapped_at`            | datetime, null | Set on ban un-map                                                  |
| `name`                   | string         |                                                                    |
| `composition`            | string, null   | salt / composition                                                 |
| `manufacturer`           | string, null   |                                                                    |
| `brand`                  | string, null   | Searchable; may copy from master                                   |
| `pack_size`              | integer ≥ 1    | Base units per pack                                                |
| `pack_unit`              | string         | e.g. tablet, ml                                                    |
| `pack_label`             | string         | Display e.g. “10 tablets”                                          |
| `category`               | string, null   | Fever, Cough, … as used on POS chips                               |
| `form`                   | string, null   | tablet, syrup, …                                                   |
| `schedule`               | enum           | `OTC` \| `H` \| `H1` \| `X`                                        |
| `hsn`                    | string, null   |                                                                    |
| `gst_pct`                | number         | Invoice default                                                    |
| `mrp`                    | number         | GST-inclusive; ≤ DPCO when mapped                                  |
| `reorder_level`          | integer, null  | Base units; null/0 = not “low”                                     |
| `loose`                  | boolean        | Per-tablet sell                                                    |
| `photo_url`              | string, null   |                                                                    |
| `rack_codes`             | string[]       | Stored here; `racks` map UI edits via API                          |
| `barcodes`               | string[]       | SKU-level barcodes if any                                          |

Computed (not stored, or denormalized with refresh): `on_hand` (sum Batch.qty), `batch_count`, `earliest_expiry`, `stock_value_cost`, `stock_value_mrp`, `stock_pill`, `units_sold_30d`, `units_sold_90d`, `days_of_cover`, `last_sold_at`, `is_dead`, `is_unallocated`.

### Batch (`inventory` owns)

| Field         | Type         | Notes                                                                   |
| ------------- | ------------ | ----------------------------------------------------------------------- |
| `batch_id`    | string       | PK                                                                      |
| `sku_id`      | string       |                                                                         |
| `batch_no`    | string       | Unique per sku_id + location                                            |
| `expiry_date` | date         |                                                                         |
| `qty`         | number ≥ 0   | **Base units**                                                          |
| `cost`        | number       | PTR per base unit; 0 for scheme-only remainder tracking — see movements |
| `mrp`         | number       | GST-inclusive at receipt; SKU MRP may refresh                           |
| `scheme`      | boolean      | True if this Batch (or a slice) entered as free qty                     |
| `received_at` | datetime     | FEFO tie-break                                                          |
| `barcode`     | string, null | Printed on label                                                        |
| `source`      | enum         | `opening` \| `grn` \| `stock_take` \| `return_restock`                  |
| `source_id`   | string, null | **GRN** id, take_id, etc.                                               |

Identity: sku + batch no (glossary). Scheme free qty may share batch_no with paid qty on the same GRN: one Batch row; cost is weighted (paid PTR × paid qty + 0 × free) / total qty.

### StockMovement

| Field                | Type         | Notes                                                                                                                                        |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `movement_id`        | string       | PK                                                                                                                                           |
| `sku_id`             | string       |                                                                                                                                              |
| `batch_id`           | string       |                                                                                                                                              |
| `qty_delta`          | number       | Signed base units; after-apply Batch.qty ≥ 0                                                                                                 |
| `type`               | enum         | `opening` \| `grn` \| `sale` \| `sale_reversal` \| `customer_restock` \| `write_off` \| `purchase_return` \| `expiry_return` \| `stock_take` |
| `source_id`          | string       | Bill / **GRN** / **StockTake** / **PurchaseReturn** / **ExpiryReturn** / import id                                                           |
| `client_mutation_id` | string, null | Idempotency                                                                                                                                  |
| `actor_user_id`      | string       |                                                                                                                                              |
| `occurred_at`        | datetime     | Document date (lock-checked)                                                                                                                 |

### OpeningStockImport

| Field                | Type    | Notes                             |
| -------------------- | ------- | --------------------------------- |
| `import_id`          | string  | PK                                |
| `status`             | enum    | `pending` \| `posted` \| `failed` |
| `row_count`          | integer |                                   |
| `client_mutation_id` | string  | Idempotent post                   |
| `document_date`      | date    | Lock-checked                      |
| `actor_user_id`      | string  |                                   |

### KPI definitions (Location)

| KPI                           | Formula                                                |
| ----------------------------- | ------------------------------------------------------ |
| Total SKUs                    | Count of SKU rows                                      |
| Total units                   | Sum of Batch.qty (base units)                          |
| Stock value at cost           | Sum(Batch.qty × Batch.cost)                            |
| Retail value at MRP           | Sum(Batch.qty × SKU.mrp)                               |
| Margin %                      | `(retail − cost) / retail × 100` if retail > 0; else 0 |
| Low-on-stock                  | Count SKUs matching FR-29                              |
| Expiring ≤ 4 months ₹ at risk | FR-30                                                  |
| Dead stock > 90 days          | Count SKUs matching FR-31                              |

### Days of cover

`on_hand / (units_sold_30d / 30)` when `units_sold_30d > 0`; otherwise `null` (UI: “—”).

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/inventory`. All routes: `Authorization: Bearer`, required query `location_id`. Success: `{ "success": true, "data": ..., "meta": { "page", "page_size", "total" } }`. Error: `{ "success": false, "error": { "code", "message", "details?" } }`. Codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`, `DEPENDENCY_FAILURE` (lock service down).

### UI (Pharmacy Partner Console)

- Route: Inventory (Catalogue). Free.
- Layout: KPI row → tabs → search + Export Excel + Export PDF + shortcuts → table.
- Product 360 drawer/page; Edit form; Opening stock import (also launched from go-live wizard).
- Label print uses browser print to thermal via Invoice Settings template.
- English; i18n-ready.

### REST

**GET `/inventory/kpis?location_id=`**  
Response `data`: `{ total_skus, total_units, stock_value_cost, margin_pct, retail_value_mrp, low_on_stock_count, expiring_at_risk_amount, expiring_batch_count, dead_stock_count }`.

**GET `/inventory/skus?location_id=&tab=&q=&page=&page_size=`**  
`tab`: `all` \| `alerts` \| `low_stock` \| `expiring` \| `rx_only` \| `out_of_stock` \| `unallocated`.  
`q`: name, salt, brand, rack code.  
`data[]`: `{ sku_id, name, schedule, rack_codes, batch_count, earliest_expiry, on_hand, stock_pill, mrp, stock_value_cost, loose, photo_url }`.

**GET `/inventory/skus/{sku_id}?location_id=`**  
Product 360 payload including `batches[]`, `movements[]` (latest 50), `units_sold_30d`, `units_sold_90d`, `days_of_cover`, `last_sold_at`, `cost` (weighted), `margin_pct`, `platform_master_sku_id`, `unmapped_at`.

**PATCH `/inventory/skus/{sku_id}?location_id=`**  
Body: editable fields in FR-24. Loose-only patch allowed. Validates DPCO if `mrp` sent. `403` if role cannot edit.

**PATCH `/inventory/skus/{sku_id}/loose?location_id=`**  
Body: `{ "loose": true }`. Row toggle.

**GET `/inventory/skus/{sku_id}/batches?location_id=&fefo=true&include_expired=false`**  
`listBatchesForSku`. `data[]`: `{ batch_id, batch_no, expiry_date, qty, cost, mrp, scheme, barcode }`. Order: expiry ASC, `received_at` ASC when `fefo=true`.

**POST `/inventory/batches/decrement?location_id=`**  
Body: `{ "client_mutation_id": "charge-...", "source_id": "bill-...", "type": "sale", "document_date": "2026-08-31", "lines": [ { "batch_id", "qty" } ] }`.  
Transactional all-or-nothing. `CONFLICT` if any line would go negative or Batch not found. Idempotent on `client_mutation_id`. Period lock on `document_date`.

**POST `/inventory/batches/increment?location_id=`**  
Same shape; `type`: `sale_reversal` \| `customer_restock` \| `grn` \| `opening` \| `stock_take`. GRN path typically uses bulk stock-in below.

**POST `/inventory/stock-in?location_id=`**  
Called by `purchases` / opening import. Body: `{ "client_mutation_id", "source": "grn"|"opening", "source_id", "document_date", "lines": [ { "sku_id"?, "new_sku"?, "batch_no", "expiry_date", "qty", "free_qty", "ptr", "mrp", "gst_pct", "scheme_on_free": true } ] }`.  
Tops up matching Batch (sku_id + batch_no) or creates Batch. Refreshes SKU MRP from line MRP (ceiling-checked). Free qty cost 0, still adds to `qty`. Rejects `expiry_date` < today (`VALIDATION_ERROR`). Period lock. Idempotent.

**POST `/inventory/stock-adjust?location_id=`**  
Called by `stock-take`. Body: `{ "client_mutation_id", "source_id": "take_id", "document_date", "lines": [ { "batch_id", "counted_qty" } ] }`. Sets qty to `counted_qty` (≥ 0). Period lock. Idempotent.

**GET `/inventory/search?location_id=&q=&otc_only=false`**  
POS/kiosk. `q` matches name, salt, brand, rack code, SKU barcode, Batch barcode. `otc_only=true` for kiosk. Excludes banned masters and unmapped-banned.  
`data[]`: `{ sku_id, name, pack_label, rack_codes, mrp, stock_pill, schedule, loose, on_hand }`.

**GET `/inventory/opening-stock/template?location_id=`**  
Downloads Excel/CSV template.

**POST `/inventory/opening-stock/import?location_id=`**  
Multipart or JSON rows. `client_mutation_id`, `document_date`. May create SKUs (mapped when master match succeeds). Posts via `stock-in` source `opening`. Lock check. Idempotent. May be all-zero.

**GET `/inventory/export?location_id=&tab=&q=&format=xlsx|pdf`**  
Same filter as list.

**POST `/inventory/labels/print?location_id=`**  
Body: `{ "batch_ids": [] }`. Returns print payload `{ lines: [ { sku_name, sku_id, batch_no, expiry_date, mrp, barcode } ] }` for the thermal template. Does not change stock.

### Events (this module publishes)

| Event                            | Payload (serializable)                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `inventory.stock.changed`        | `{ tenant_id, location_id, sku_id, batch_id, qty_after, type, source_id, document_date }` |
| `inventory.sku.created`          | `{ tenant_id, location_id, sku_id, platform_master_sku_id }`                              |
| `inventory.sku.updated`          | `{ tenant_id, location_id, sku_id }`                                                      |
| `inventory.sku.unmapped`         | `{ tenant_id, location_id, sku_id, platform_master_sku_id }`                              |
| `inventory.opening_stock.posted` | `{ tenant_id, location_id, import_id, document_date, inventory_value_cost }`              |

### Events (this module consumes)

| Event                           | Behaviour                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `master-catalogue.sku.banned`   | Un-map all shop SKUs with that **PlatformMasterSku** (FR-10).                           |
| `master-catalogue.sku.unbanned` | Do **not** auto-remap (see §10).                                                        |
| `master-catalogue.dpco.updated` | Do not rewrite historical Batches; subsequent MRP set/refresh must respect new ceiling. |

Callers (`purchases`, `pos-billing`, `returns`, `purchase-returns`, `stock-take`) use REST in this section rather than writing Batch rows.

### `books-gst` lock check

`GET` lock status is owned by `books-gst`. Inventory shall call that contract before post; on `DEPENDENCY_FAILURE`, inventory shall not post stock.

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 — KPI filter**  
Given a Location with mixed stock  
When the Owner clicks “low-on-stock”  
Then the list equals the Low stock tab and the KPI count matches visible rows.

**US-2 — Search rack**  
Given SKU “Dolo 650” assigned rack `A-12`  
When the Pharmacist types `A-12`  
Then that SKU is in the results (Free, even if Rack map is paywalled).

**US-3 — No add product**  
Given Inventory home  
When the Pharmacist looks for Add product  
Then no create-SKU action exists; shortcut to purchase is visible.

**US-4 — Edit SKU**  
Given a SKU  
When the Manager sets reorder_level 10, loose on, rack `B-1`, photo, HSN, GST %  
Then 360 and POS search show the new values and an **AuditEvent** exists.

**US-5 — Product 360**  
Given sales in the last 30 days  
When 360 opens  
Then in-stock, cost, MRP, margin, units 30/90d, days of cover, last sold, batches, and movements match the ledger.

**US-6 — Opening CSV**  
Given a valid template file and an open period  
When the Owner imports  
Then Batches exist with qty ≥ 0, SKUs created or matched, `inventory.opening_stock.posted` fired, and retry with same `client_mutation_id` does not double qty.

**US-7 — Opening locked period**  
Given month 2026-07 is locked  
When import `document_date` is 2026-07-15  
Then the API returns locked-period error and qty is unchanged.

**US-8 — FEFO list**  
Given batches expiring 2026-10 and 2027-01  
When POS calls `listBatchesForSku` with `fefo=true`  
Then 2026-10 is first; expired-before-today batches are absent unless `include_expired=true`.

**US-9 — Concurrent last unit**  
Given Batch qty = 1  
When two Charge decrements of 1 run together  
Then one response is success with qty 0 and the other is `CONFLICT`; final qty is 0.

**US-10 — Hold**  
Given a HeldCart  
When staff parks the bill  
Then no decrement ran and Batch qty is unchanged.

**US-11 — Cannot oversell**  
Given Batch qty = 2  
When decrement qty = 3  
Then `CONFLICT`, qty remains 2.

**US-12 — GRN labels**  
Given a posted GRN that created/updated Batches  
When staff chooses Print labels  
Then each new/updated Batch prints SKU, batch no, expiry, MRP.

**US-13 — DPCO**  
Given ceiling ₹ 20  
When a refresh would set MRP ₹ 21  
Then `VALIDATION_ERROR` and SKU MRP unchanged.

**US-14 — Ban**  
Given mapped SKU  
When the master is banned  
Then mapping is cleared, POS search omits the SKU, Inventory list still shows it for staff, qty unchanged.

**US-15 — Banned before un-map**  
Given mapping still present and master already banned  
When POS search runs  
Then the SKU is not returned (FR-9).

**US-16 — Scheme qty**  
Given GRN stock-in paid 10 + free 2 same batch_no  
When posted  
Then Batch.qty increases by 12 and weighted cost reflects cost 0 on free units.

**US-17 — Export**  
Given Low stock tab  
When Export Excel  
Then the file contains the filtered rows only.

**US-18 — Cashier**  
Given Cashier role defaults  
When they open Inventory  
Then `FORBIDDEN` / module hidden.

**US-19 — Idempotent decrement**  
Given a successful decrement with `client_mutation_id=abc`  
When the same body is posted again  
Then qty is not reduced again and the success payload matches the first.

**US-20 — Kiosk OTC**  
Given `otc_only=true`  
When search runs  
Then H/H1/X SKUs are omitted.

## 9. Edge Cases & Error Handling

| Case                                             | Behaviour                                                      |
| ------------------------------------------------ | -------------------------------------------------------------- |
| Negative or zero decrement qty                   | `VALIDATION_ERROR`                                             |
| Unknown `batch_id`                               | `NOT_FOUND`                                                    |
| Concurrent last unit                             | One success, one `CONFLICT`                                    |
| Retry same `client_mutation_id`                  | Replay, no double move                                         |
| Hold                                             | No inventory call / no qty change                              |
| Expired batch on default FEFO                    | Hidden                                                         |
| GRN/opening expiry in the past                   | `VALIDATION_ERROR` (purchases also validates)                  |
| MRP > DPCO                                       | `VALIDATION_ERROR`                                             |
| Banned master                                    | Not billable; un-map async; search excludes                    |
| Locked period                                    | No opening/stock-in/adjust/decrement with that `document_date` |
| Lock service down                                | `DEPENDENCY_FAILURE`; no post                                  |
| Empty opening CSV                                | Allowed (zero stock)                                           |
| Duplicate SKU+batch_no on stock-in               | Top up existing Batch                                          |
| Loose off, POS sends qty not multiple of pack    | POS must send base units; inventory only checks qty ≤ on_hand  |
| Photo too large                                  | `VALIDATION_ERROR`                                             |
| Unallocated with racks later assigned by `racks` | Tab membership updates                                         |
| Plan expiry                                      | Inventory remains usable                                       |
| Printer fail                                     | Stock stands; reprint labels                                   |
| Two tabs: Out of stock vs Low                    | Zero is Out, not Low                                           |
| Never sold + qty > 0                             | Dead stock                                                     |
| Un-map then un-ban                               | Mapping stays null until a later GRN rematch (§10)             |
| `location_id` missing                            | `VALIDATION_ERROR`                                             |
| Wrong tenant                                     | Empty or `NOT_FOUND`, never another shop’s rows                |

## 10. Open Questions / Assumptions

1. **Base units:** Batch `qty` is always pack_size-relative **base units** (tablets). Loose toggle only changes how POS steps qty. Pack size 10 and loose off: selling 1 pack decrements 10.
2. **Weighted cost:** Paid + free on the same batch_no become one Batch; `cost = (ptr × paid_qty) / (paid_qty + free_qty)` per base unit.
3. **Opening CSV may create SKUs** (go-live). The Inventory **screen** still has no Add product. Matching key: `sku_id` if present, else barcode, else normalised name + manufacturer + pack_label; else create and map to **PlatformMasterSku** when master search hits, else unmapped local SKU until a later GRN maps it.
4. **Alerts tab** = Low ∪ Expiring ∪ Out of stock (not dead, not unallocated unless they also match).
5. **₹ at risk** for expiry uses **cost** value, not MRP.
6. **Low stock** requires a positive `reorder_level`; zero on_hand is **Out of stock** only.
7. **4 months** = 120 calendar days from today IST.
8. **Dead stock** = no `type=sale` movement in 90 days (returns do not reset the clock).
9. **Un-ban** does not restore `platform_master_sku_id`. A later GRN/`stock-in` that matches the master may set the mapping again.
10. **Rack codes** on SKU are the search/edit surface on Free; `racks` owns Growth map UI and writes the same `rack_codes` (and finer shelf/bin in `racks` tables).
11. **Write-off** qty is a decrement with `type=write_off` called by `returns` (destination write-off), not an Inventory screen.
12. **Wastage journals** in `books-gst` that affect qty shall call `stock-adjust` or decrement `type=write_off`; inventory has no wastage UI.
13. **Label barcode** value is `batch_id` or a generated Code128 of sku+batch; exact symbology follows Invoice Settings template.
14. **Category** values follow POS chips (Fever, Cough, Diabetes, Heart, Stomach, Vitamins, Skin, Baby, Devices, Personal, Ayurveda, First Aid) plus free text if already on the SKU.
15. **Period lock on sale decrement:** POS must not post a bill into a locked period; inventory still checks `document_date` on decrement.
16. **Units sold 30/90d** count sale movements only (not reversals netted in the window: net = sale + sale_reversal in the window).
17. **Photo** stored via existing file/object pattern used by the console; this doc does not invent a CDN product.
18. **Branches** are not sold; `location_id` is still required on every call.
19. **Kiosk** filters OTC via `otc_only`; inventory does not know kiosk mode beyond that flag.
20. **Schedule on mapped SKUs** is chemist-editable on Edit (catalogue lists it); POS uses the shop SKU schedule. DPCO/ban remain platform-owned.
