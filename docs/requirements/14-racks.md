# Requirement Doc: Racks (`racks`)

## 1. Summary

`racks` is the Growth **Rack map** and **Assign locations** experience: the chemist creates racks by code, lays them on a grid, assigns medicines to Rack / Shelf / Bin, prints cut-and-stick rack labels, and exports a storage audit. It is gated **Growth** (and Pro). Inventory on **Free** still **searches by rack code** if locations were already assigned — this module owns the map UI, not the search index. Unlocated items are SKUs with no location. Empty racks may be deleted; racks with medicines mapped may not.

Module layout: `modules/racks/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.

## 2. Scope (in / out)

### In

- Tenant + `location_id` on every query and mutation.
- Plan gate: Growth (paywall on Free/Starter with lock icon and required plan).
- KPIs: racks created, zones, medicines mapped, unlocated items.
- Tab **Rack map**: create by code, grid of racks, add/remove medicines, delete empty racks.
- Tab **Assign locations**: Rack / Shelf / Bin builder, bulk-assign, “only unlocated” filter, inline set-location.
- Print cut-and-stick rack labels.
- Export storage audit (Excel).
- Write location assignments so `inventory` SKU `rack_codes` (and POS search) stay in sync.
- Retain data when plan expires; UI locked until Growth/Pro returns.

### Out

- Inventory list, KPIs, product 360, opening stock, FEFO qty (`inventory`).
- POS search implementation (`inventory` search API). POS **consumes** rack codes on Free.
- Thermal **batch/barcode** labels after GRN (`inventory` / `purchases` + Invoice Settings).
- Purchases, GRN, distributors, stock take, offers.
- Branches, warehouse bins as a WMS product, handheld RF guns (browser only).
- Negative stock, period lock on rack layout (layout is not a books document). Assigning a rack does not post a journal.

## 3. Dependencies

| Module | Why |
|---|---|
| `inventory` | SKU list to map; persist `rack_codes` on **SKU** for Free search; unlocated = SKUs with no assignment. |
| `plan-gating` | Growth module. Expired paid plan → paywall; data retained. |
| `tenancy` | Tenant + `location_id`. |
| `auth` / `manage-users` | Owner / Manager / Pharmacist default include racks; Cashier default does not. |
| `audit` | **AuditEvent** on create/delete rack, bulk-assign, delete. |
| `account-settings` | Optional print layout; cut-and-stick may use browser A4 print (not GRN thermal batch stickers). |

Period lock: rack edits are **not** GRN/stock-take posts. `books-gst` lock does not block map edits.

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall scope every rack read and write to tenant + `location_id`.

**FR-2:** The system shall refuse map UI and mutating APIs when `plan-gating` says racks is locked (`FORBIDDEN` + paywall payload naming Growth price). GET of assignments used by inventory search shall remain available on Free (read of codes already stored on SKU).

**FR-3:** The system shall show KPIs: count of racks, count of distinct zones, count of SKUs with at least one location, count of unlocated SKUs (on_hand may be zero or positive — unlocated means no Rack/Shelf/Bin assignment).

**FR-4:** The system shall provide tab **Rack map** and tab **Assign locations**.

**FR-5:** The system shall create a rack by unique `code` per Location (e.g. `A-12`); duplicate code → `CONFLICT`.

**FR-6:** The system shall place racks on a grid (`row`, `col` integers ≥ 0) for map layout; two racks shall not share the same cell (`CONFLICT`).

**FR-7:** The system shall allow optional `zone` string on a rack (e.g. Fridge, OTC wall); KPI “zones” is the count of distinct non-empty zone values.

**FR-8:** The system shall add and remove **SKU** mappings on a rack from the map (add medicine / remove medicine).

**FR-9:** The system shall delete a rack only when it has zero SKU mappings (`CONFLICT` if not empty).

**FR-10:** The system shall provide a Rack / Shelf / Bin builder: a location path `rack_id` + optional `shelf_code` + optional `bin_code`.

**FR-11:** The system shall bulk-assign a list of `sku_id`s to one location path.

**FR-12:** The system shall filter Assign locations to **only unlocated** when that toggle is on.

**FR-13:** The system shall allow inline set-location on a SKU row (type or pick Rack/Shelf/Bin).

**FR-14:** The system shall, on every successful assignment change, update inventory SKU `rack_codes` to the distinct rack codes of that SKU’s locations so Free POS/inventory search by rack still works.

**FR-15:** The system shall print cut-and-stick rack labels (code, optional zone) for selected racks — paper labels for physical racks, not batch/expiry/MRP stickers.

**FR-16:** The system shall export a storage audit Excel: rack code, zone, grid position, shelf, bin, sku_id, SKU name, schedule, on_hand (from inventory read).

**FR-17:** The system shall not allow POS to depend on this UI being unlocked: if codes exist, `inventory` search matches them on Free.

**FR-18:** The system shall keep English UI i18n-ready.

**FR-19:** The system shall append **AuditEvent** for rack create, rack delete, bulk-assign.

**FR-20:** The system shall not change Batch qty when assigning locations.

**FR-21:** The system shall hide or paywall the Inventory “Rack map” shortcut the same way as this module’s route.

**FR-22:** The system shall treat a SKU as mapped for the KPI when it has ≥ 1 **SkuLocation** row.

## 5. Non-Functional Requirements

- **Plan:** Growth (Pro included). Free/Starter: paywall; retained data; inventory search still uses stored codes.
- **Tenancy:** `location_id` on every call.
- **Consistency:** Assignment updates and `rack_codes` sync in one transaction.
- **i18n:** English ships.
- **Print:** Print fail does not revert assignments.
- **No stock movement:** Map is locations only.
- **Latency:** Map + 2k SKUs p95 < 1.5s.

## 6. Data Model / Entities

### Rack

| Field | Type | Notes |
|---|---|---|
| `rack_id` | string | PK |
| `code` | string | Unique per location |
| `zone` | string, null | |
| `row` | integer | Grid |
| `col` | integer | Grid |

### Shelf (optional level)

| Field | Type | Notes |
|---|---|---|
| `shelf_id` | string | PK |
| `rack_id` | string | |
| `code` | string | Unique per rack |

### Bin (optional level)

| Field | Type | Notes |
|---|---|---|
| `bin_id` | string | PK |
| `shelf_id` | string | |
| `code` | string | Unique per shelf |

Builder may create shelf/bin on the fly when inline-assigning a new path.

### SkuLocation

| Field | Type | Notes |
|---|---|---|
| `sku_location_id` | string | PK |
| `sku_id` | string | **SKU** in `inventory` |
| `rack_id` | string | |
| `shelf_id` | string, null | |
| `bin_id` | string, null | |

A SKU may have multiple locations (e.g. overflow). `rack_codes` on SKU = distinct Rack.code.

Unlocated: SKU with zero SkuLocation rows.

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/racks`. Bearer + `location_id`. Mutations require Growth. Envelopes standard.

### UI

- Catalogue → Rack & Locations (Growth). KPI row, tabs Rack map | Assign locations, Print labels, Export audit.
- Map: grid cells, create-by-code control, click rack → medicines on it, add/remove SKU, delete if empty.
- Assign: table of SKUs, toggle only unlocated, inline location, bulk select + apply builder.

### REST

**GET `/racks/kpis?location_id=`**  
`{ racks_created, zones, medicines_mapped, unlocated_items }`. Growth for this dashboard; if locked, paywall (KPI numbers may still be computed for Owner who had data — UI still gated). Mutating APIs always gated.

**GET `/racks?location_id=`**  
`data[]`: `{ rack_id, code, zone, row, col, sku_count }`.

**POST `/racks?location_id=`**  
`{ "code": "A-12", "zone": "OTC", "row": 0, "col": 3 }`. Growth. `CONFLICT` on code or cell.

**PATCH `/racks/{rack_id}?location_id=`**  
Move cell, rename zone, change code (unique).

**DELETE `/racks/{rack_id}?location_id=`**  
Empty only.

**GET `/racks/{rack_id}/skus?location_id=`**  
SKUs on that rack.

**POST `/racks/{rack_id}/skus?location_id=`**  
`{ "sku_id": "..." }` add mapping at rack root (no shelf/bin).

**DELETE `/racks/{rack_id}/skus/{sku_id}?location_id=`**  
Remove mappings on that rack for the SKU (all shelves/bins on that rack).

**GET `/racks/locations?location_id=&unlocated_only=false&q=`**  
Assign-tab dataset: `{ sku_id, name, schedule, on_hand, locations[] }`.

**PUT `/racks/locations?location_id=`**  
Inline or bulk. `{ "assignments": [ { "sku_id", "rack_id", "shelf_code"?, "bin_code"? } ] }`. Creates shelf/bin if needed. Replaces that SKU’s locations when `replace: true` (bulk-assign default replace; inline sets one path — see §10).

**POST `/racks/labels/print?location_id=`**  
`{ "rack_ids": [] }` → print payload `{ code, zone }[]`.

**GET `/racks/audit/export?location_id=&format=xlsx`**  
Storage audit file.

### Events published

| Event | Payload |
|---|---|
| `racks.location.changed` | `{ tenant_id, location_id, sku_id, rack_codes }` |

Inventory may listen **or** racks may PATCH inventory `rack_codes` in-process via inventory API. Prefer inventory PATCH `rack_codes` in the same request as assignment (racks API orchestrates). Event is for cache/search if needed.

### Inventory

`PATCH /inventory/skus/{sku_id}` with `rack_codes` only, or a dedicated internal update. Must not require Growth on that inventory field write when called from this module’s Growth session.

### Plan gating

`plan-gating` module permission `racks`. Expired plan: GET list for paywall page optional; POST/PATCH/DELETE `FORBIDDEN`.

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 — Create rack**  
Given Growth and an empty cell  
When the Manager creates code `A-12` on the grid  
Then KPIs racks created increment and the cell shows `A-12`.

**US-2 — Duplicate code**  
When they create `A-12` again  
Then `CONFLICT`.

**US-3 — Add medicine**  
Given SKU Dolo and rack `A-12`  
When they add Dolo to the rack  
Then map shows Dolo, Dolo is not Unlocated, inventory search `A-12` returns Dolo.

**US-4 — Delete empty**  
Given rack with no SKUs  
When they delete it  
Then it is gone.

**US-5 — Delete non-empty**  
Given rack with a SKU  
When they delete it  
Then `CONFLICT` and the rack remains.

**US-6 — Bulk unlocated**  
Given three unlocated SKUs and toggle on  
When they bulk-assign to `B-1` / shelf `S1` / bin `B2`  
Then all three have that path and unlocated KPI drops by three.

**US-7 — Free search**  
Given assignments made while on Growth, then plan expires  
When a Cashier searches POS for rack `A-12`  
Then hits still work; Rack map route is paywalled.

**US-8 — Print labels**  
When they print selected racks  
Then cut-and-stick labels show code (and zone if set), not batch/MRP.

**US-9 — Export audit**  
When they export  
Then Excel lists rack → SKU → on_hand.

**US-10 — Starter paywall**  
Given Starter  
When they open Rack & Locations  
Then lock icon and Growth paywall; no mutation.

**US-11 — No qty change**  
When a SKU is assigned  
Then Batch qty is unchanged.

**US-12 — Pharmacist**  
Given Pharmacist default  
When they open Rack map on Growth  
Then they can assign (default access includes racks).

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Plan not Growth/Pro | Mutations `FORBIDDEN`; UI paywall |
| Delete non-empty rack | `CONFLICT` |
| Duplicate code or grid cell | `CONFLICT` |
| Unknown `sku_id` | `NOT_FOUND` |
| Unknown `rack_id` | `NOT_FOUND` |
| Empty code | `VALIDATION_ERROR` |
| Print fail | Assignments stand |
| SKU removed from last location | Becomes unlocated; `rack_codes` [] |
| Multiple locations | `rack_codes` lists all distinct codes; POS matches any |
| Concurrent two creates same code | One success, one `CONFLICT` |
| `location_id` missing | `VALIDATION_ERROR` |
| Cashier default | Module hidden / `FORBIDDEN` |
| Locked books period | Map still editable |

## 10. Open Questions / Assumptions

1. **Zone** is a string on Rack, not a separate entity. KPI zones = distinct non-empty strings.
2. **Unlocated items** count all SKUs with zero SkuLocation, including zero-stock SKUs (so go-live mapping is visible).
3. **Grid** is a simple row/col; no auto-reflow. Max size unbounded but UI may scroll.
4. **Shelf and bin codes** are strings unique within parent; builder creates them if missing.
5. **Bulk-assign** replaces previous locations for those SKUs (`replace: true`). Map “add medicine” **adds** a location without removing others. Inline set-location **replaces** that SKU’s locations with the one path (chemist intent: “set location”).
6. **Cut-and-stick** print is A4/browser print of rack codes, distinct from GRN thermal batch labels.
7. **Storage audit** includes on_hand from inventory at export time (read-only).
8. **Free POS search** never calls Growth-gated `/racks` mutations; it uses `inventory` `rack_codes`.
9. **Period lock** does not apply to rack layout.
10. **One shop UI**; `location_id` still required.
11. **No** automatic assignment from GRN in v1; chemist assigns here (inventory Edit can also set rack codes on Free without map UI).
12. Inventory Edit “racks” field and this module write the same SKU `rack_codes`. Edit on Free may set a code even if the Rack row does not exist yet; Assign tab should still show that code as text. Assumption: Inventory Edit stores codes; `racks` create-by-code should upsert a Rack if the code already exists on SKUs so the map can display them. If a code exists only on SKU, KPI racks created counts **Rack** rows, not orphan codes — Owner should create the rack on the map to “adopt” the code. Logged as: orphan codes from Free edit do not increment racks-created until a Rack row exists; search still works.
