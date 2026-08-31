# Requirement Doc: Platform medicine master (`master-catalogue`)

## 1. Summary

The `master-catalogue` module owns the platform-wide **PlatformMasterSku** list that every pharmacy maps to. Platform Admin HQ Super admin / Ops / Compliance maintain medicines here: add a medicine, filter by category, schedule (OTC / H / H1 / X), GST slab, Rx-only, and Banned, set a DPCO price ceiling, maintain substitutes (which feed the POS substitute prompt), and ban or un-ban a SKU platform-wide. Banning un-maps the SKU at every Pharmacy; the mapping field itself lives on pharmacy **SKU** in `inventory`. Pharmacies cannot sell above the ceiling. This module is platform-scoped (not a pharmacy tenant resource), except the stocking-pharmacies drawer which reads tenant names from `tenancy` and mapping existence from `inventory`.

## 2. Scope

- In scope:
  - CRUD-lite for **PlatformMasterSku**: add, edit catalogue fields, list + filter.
  - Ban and un-ban platform-wide; emit an event so `inventory` un-maps every pharmacy **SKU** pointing at the banned master.
  - Set and update DPCO price ceiling (GST-inclusive MRP cap).
  - Maintain substitutes: ordered list of other **PlatformMasterSku** ids (composition / generic alternatives) for POS prompts.
  - HQ drawer: composition, substitutes, stocking pharmacies (read-only list of Pharmacies that currently map a **SKU** to this master).
  - HQ sidebar entry “Master catalogue”.
  - APIs for `inventory` / `pos-billing` to read ceiling, banned flag, schedule, and substitutes (assert list price ≤ ceiling; refuse banned).
- Out of scope:
  - Pharmacy inventory rows, batches, MRP on shop **SKU**, racks, FEFO, opening stock CSV (`inventory`).
  - POS substitute confirmation UX and allergy checks (`pos-billing`); this module only supplies substitute ids + names.
  - Creating shop products via Purchases (`purchases`).
  - Plan gating (catalogue is HQ internal; not sold as an add-on).
  - Shop-floor GMV, Cashfree, WhatsApp.
  - Extra branches, Jan Aushadhi-only catalogues, hospital formularies.

## 3. Dependencies

- Other modules/slugs and what is needed:
  - None to create the master table (decomposition: platform-scoped).
  - `tenancy`: resolve `display_name` for stocking pharmacies list.
  - `inventory` (later): owns `SKU.platform_master_sku_id`; must subscribe to `PlatformMasterSkuBanned` and un-map; must expose or allow this module to query `listTenantIdsMappedTo(platform_master_sku_id)` — until inventory exists, stocking list returns empty and the API contract is still implemented here as a client call documented below.
  - `pos-billing`: must call assert-price / get-by-id before Charge; cannot add banned masters to cart.
  - `audit`: ban, un-ban, ceiling change, add medicine → ingest `admin_action` (HQ).
- External services/APIs/libraries:
  - Persistence via `libs/db-services`.
  - UI via `@namma-medmate/api-client`.
  - No GSTN/IRP, Meta, or Cashfree.

## 4. Functional Requirements

- FR-1: The system shall persist **PlatformMasterSku** records that are not tenant-scoped.
- FR-2: The system shall require on create: name, schedule (`OTC` | `H` | `H1` | `X`), GST slab percent, HSN, and category.
- FR-3: The system shall support filters: category, schedule, GST slab, Rx-only, Banned.
- FR-4: The system shall treat Rx-only as true when schedule is `H`, `H1`, or `X`, and allow an explicit `rx_only` flag for OTC that still requires a prescription workflow (default false for OTC).
- FR-5: The system shall set `banned=true` on ban and emit `PlatformMasterSkuBanned` with `platform_master_sku_id`.
- FR-6: The system shall, on ban, invoke inventory un-map for every pharmacy **SKU** mapped to that master (or enqueue the event that `inventory` must apply before the SKU can be billed); after ban, GET master shows `banned=true`.
- FR-7: The system shall set `banned=false` on un-ban and emit `PlatformMasterSkuUnbanned`; un-ban shall not automatically re-map shop SKUs.
- FR-8: The system shall persist `dpco_ceiling` as a GST-inclusive decimal amount ≥ 0 when set, and allow clearing only if explicitly permitted — v1: ceiling may be updated but if set, POS cannot sell above it; a null ceiling means no platform cap.
- FR-9: The system shall reject `PUT` ceiling with a negative number (`400 INVALID_CEILING`).
- FR-10: The system shall expose `POST /master-catalogue/skus/{id}/assert-price` that returns `allowed: false` when `unit_price` > `dpco_ceiling` (when ceiling is non-null) or when `banned=true`.
- FR-11: The system shall store substitutes as an ordered array of `platform_master_sku_id` that exist, are not the same id, and preferably match composition; POS reads this list.
- FR-12: The system shall reject a substitute id that is banned from being added; existing substitutes that later get banned remain in the array but GET substitutes for POS filters them out.
- FR-13: The system shall list stocking pharmacies: tenant_id, location_id, display_name for each Pharmacy with at least one mapped non-unmapped **SKU**.
- FR-14: The system shall not allow pharmacy console Users to mutate the platform master (HQ principal only for write).
- FR-15: The system shall allow pharmacy services (inventory/POS Lambdas) to GET a master by id (read) with service or pharmacy session (read-only).
- FR-16: The system shall record HQ add/edit/ban/ceiling/substitutes in `audit` with actor, role, tenant null (platform), target **PlatformMasterSku**.
- FR-17: The system shall not implement a pharmacy-facing “master catalogue” sidebar item; chemists map via `inventory` only.
- FR-18: The system shall keep schedule tags exactly `OTC`, `H`, `H1`, `X`.
- FR-19: The system shall search by name, salt/composition, or brand (name fields) on the HQ list.
- FR-20: The system shall not create pharmacy **SKU** or **Batch** rows.

## 5. Non-Functional Requirements

- NFR-1: HQ UI English; i18n keys `masterCatalogue.*`.
- NFR-2: List p95 ≤ 300 ms with indexes on schedule, banned, gst_slab, category, name trgm/ilike.
- NFR-3: Ban is strongly consistent on the master row; un-map is required before a banned SKU can be billed — `pos-billing` also checks `banned` at cart time so a delayed un-map cannot sell.
- NFR-4: Module layout `modules/master-catalogue/{ui,api,docs}`.
- NFR-5: DPCO ceiling compared in rupees to 2 decimal places.
- NFR-6: Regular GST slabs stored as numeric rate on the master (shop GST on **SKU** may copy at map time in `inventory`).

## 6. Data Model / Entities

- Entities/fields this module owns:
  - **PlatformMasterSku**
    - `platform_master_sku_id` (UUID, PK)
    - `name` (string)
    - `composition` (string, salt/generic)
    - `manufacturer` (string, nullable)
    - `brand` (string, nullable)
    - `pack` (string, nullable)
    - `form` (string, nullable; tablet/syrup/etc.)
    - `category` (string)
    - `schedule` (`OTC` | `H` | `H1` | `X`)
    - `rx_only` (boolean)
    - `hsn` (string)
    - `gst_slab` (numeric: 0, 5, 12, 18, 28 — assumption §10)
    - `dpco_ceiling` (numeric(12,2), nullable; GST-inclusive)
    - `banned` (boolean, default false)
    - `banned_at`, `banned_by_user_id` (nullable)
    - `created_at`, `updated_at`
  - **PlatformMasterSkuSubstitute**
    - `platform_master_sku_id` (FK)
    - `substitute_platform_master_sku_id` (FK)
    - `sort_order` (int)
    - PK `(platform_master_sku_id, substitute_platform_master_sku_id)`
- Relationships to entities owned elsewhere (reference by name, don't redefine):
  - **SKU** — `inventory`: `sku_id` mapped to `platform_master_sku_id`. This module does not store shop MRP, qty, or racks.
  - **Pharmacy / Location** — `tenancy`: stocking list.
  - **Bill** / POS — `pos-billing` consumes ceiling, banned, substitutes.
  - **AuditEvent** — `audit`.

## 7. API / Interface Contracts

HQ writes require HQ principal. Pharmacy/service reads allowed. Envelope `{ data }` / `{ error }`.

### 7.1 List + filter (HQ)

**GET `/master-catalogue/skus?category=&schedule=&gst_slab=&rx_only=&banned=&q=&cursor=&limit=50`**

`q` matches name, composition, brand (case-insensitive).

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "platform_master_sku_id": "pm-111",
        "name": "Paracetamol 500mg",
        "composition": "Paracetamol 500mg",
        "category": "Fever",
        "schedule": "OTC",
        "rx_only": false,
        "gst_slab": 12,
        "dpco_ceiling": "20.00",
        "banned": false
      }
    ],
    "next_cursor": null
  }
}
```

### 7.2 Add medicine (HQ)

**POST `/master-catalogue/skus`**

Request:

```json
{
  "name": "Paracetamol 500mg",
  "composition": "Paracetamol 500mg",
  "manufacturer": "Example Labs",
  "brand": "Calpol",
  "pack": "10 tablets",
  "form": "tablet",
  "category": "Fever",
  "schedule": "OTC",
  "rx_only": false,
  "hsn": "3004",
  "gst_slab": 12,
  "dpco_ceiling": "20.00"
}
```

Response `201`: `{ "data": { ...PlatformMasterSku } }`.

Invalid schedule: `400 VALIDATION_FAILED`. Missing name: `400 VALIDATION_FAILED`.

### 7.3 Get + drawer (HQ and pharmacy read)

**GET `/master-catalogue/skus/{platform_master_sku_id}`**

Response `200`:

```json
{
  "data": {
    "platform_master_sku_id": "pm-111",
    "name": "Paracetamol 500mg",
    "composition": "Paracetamol 500mg",
    "manufacturer": "Example Labs",
    "brand": "Calpol",
    "pack": "10 tablets",
    "form": "tablet",
    "category": "Fever",
    "schedule": "OTC",
    "rx_only": false,
    "hsn": "3004",
    "gst_slab": 12,
    "dpco_ceiling": "20.00",
    "banned": false,
    "substitutes": [
      {
        "platform_master_sku_id": "pm-222",
        "name": "Paracetamol 500mg Generic",
        "schedule": "OTC",
        "banned": false
      }
    ]
  }
}
```

**GET `/master-catalogue/skus/{platform_master_sku_id}/stocking-pharmacies`**

HQ only.

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
        "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
        "display_name": "Sri Krishna Medicals"
      }
    ]
  }
}
```

Implementation: call inventory `GET /inventory/mappings?platform_master_sku_id=` (defined for `inventory`; this module’s api-client method `listMappings`). If inventory is not deployed, return `items: []`.

### 7.4 Patch catalogue fields (HQ)

**PATCH `/master-catalogue/skus/{platform_master_sku_id}`**

Writable: name, composition, manufacturer, brand, pack, form, category, schedule, rx_only, hsn, gst_slab. Not banned (use ban endpoints). Ceiling has its own endpoint.

### 7.5 Ceiling (HQ)

**PUT `/master-catalogue/skus/{platform_master_sku_id}/ceiling`**

Request: `{ "dpco_ceiling": "18.50" }` or `{ "dpco_ceiling": null }` to clear.

Response `200`: updated master. Emits `DpcoCeilingSet`. Ingest AuditEvent `admin_action`.

### 7.6 Ban / un-ban (HQ)

**POST `/master-catalogue/skus/{platform_master_sku_id}/ban`**

Request: `{ "reason": "CDSCO ban" }` (reason stored in audit after, not required for POS).

Response `200`: `{ "data": { "platform_master_sku_id", "banned": true } }`.

Side effects: emit `PlatformMasterSkuBanned`; call inventory un-map-all for this id (idempotent). Ingest audit.

**POST `/master-catalogue/skus/{platform_master_sku_id}/unban`**

Response `200`: `{ "data": { "banned": false } }`. Does not restore mappings.

### 7.7 Substitutes (HQ write, POS read)

**PUT `/master-catalogue/skus/{platform_master_sku_id}/substitutes`**

Request:

```json
{
  "substitute_ids": ["pm-222", "pm-333"]
}
```

Response `200`: ordered substitutes as in GET. Reject unknown ids, self-id, duplicates.

**GET `/master-catalogue/skus/{platform_master_sku_id}/substitutes?for_pos=true`**

Filters out `banned=true` substitutes. Kiosk/POS still apply OTC-only rules in those modules using `schedule`.

### 7.8 Assert price (POS / inventory)

**POST `/master-catalogue/skus/{platform_master_sku_id}/assert-price`**

Request:

```json
{
  "unit_price": "21.00"
}
```

Response `200`:

```json
{
  "data": {
    "allowed": false,
    "banned": false,
    "dpco_ceiling": "20.00",
    "reason_code": "ABOVE_DPCO_CEILING",
    "i18n_key": "masterCatalogue.errors.aboveDpco"
  }
}
```

If banned: `allowed: false`, `reason_code: BANNED_SKU`. If allowed: `allowed: true`, `reason_code: null`.

Pharmacy callers do not send `location_id` here because the resource is platform-scoped; POS still passes `location_id` on its own charge APIs.

### 7.9 Events emitted

- `PlatformMasterSkuCreated` — `{ platform_master_sku_id }`
- `PlatformMasterSkuUpdated` — `{ platform_master_sku_id }`
- `PlatformMasterSkuBanned` — `{ platform_master_sku_id }` (inventory must un-map everywhere)
- `PlatformMasterSkuUnbanned` — `{ platform_master_sku_id }`
- `DpcoCeilingSet` — `{ platform_master_sku_id, dpco_ceiling }`
- `SubstitutesUpdated` — `{ platform_master_sku_id, substitute_ids }`

### 7.10 UI routes / components

- Platform Admin HQ:
  - Route: `/hq/master-catalogue` in sidebar **Master catalogue** (i18n `masterCatalogue.nav.title`).
  - `MasterCatalogueList`: filters (category, schedule OTC/H/H1/X, GST slab, Rx-only toggle, Banned), search, Add medicine.
  - `MasterCatalogueDrawer`: composition, substitutes editor, stocking pharmacies table, Ban / Un-ban, Set price ceiling.
  - `AddMedicineModal`: fields from POST body.
  - Lock copy: “Pharmacies cannot sell above this ceiling.” i18n `masterCatalogue.ceiling.help`.
  - Ban confirm: “Banning un-maps this medicine at every pharmacy.” i18n `masterCatalogue.ban.confirm`.
- Pharmacy Partner Console: no routes.

## 8. User Stories & Acceptance Criteria

### US-1: Ops adds a medicine and sets DPCO ceiling

As Compliance I cap MRP on the master.

- AC-1: Given I am HQ, when I POST a valid OTC medicine with `dpco_ceiling=20.00`, then GET list with `q=Paracetamol` includes it with that ceiling.
- AC-2: Given POS calls assert-price with `21.00`, then `allowed=false` and `reason_code=ABOVE_DPCO_CEILING`.
- AC-3: Given assert-price with `20.00`, then `allowed=true`.

### US-2: Ban un-maps everywhere

As Compliance I ban a SKU so no chemist can bill it.

- AC-1: Given pharmacies mapped to `pm-111`, when I POST ban, then the master `banned=true` and `PlatformMasterSkuBanned` is emitted.
- AC-2: Given assert-price after ban (any price), then `allowed=false` and `reason_code=BANNED_SKU`.
- AC-3: Given un-ban, when I GET the master, then `banned=false` and stocking mappings are not silently recreated by this module.

### US-3: Substitutes feed POS

As a Pharmacist I will later see substitutes from this list.

- AC-1: Given I PUT substitutes `[pm-222]` on `pm-111`, when POS GETs substitutes `for_pos=true`, then `pm-222` is returned if it is not banned.
- AC-2: Given `pm-222` is then banned, when POS GETs substitutes `for_pos=true`, then `pm-222` is omitted.
- AC-3: Given I PUT a self-id substitute, then the response is 400 `VALIDATION_FAILED`.

### US-4: Chemist cannot edit the platform master

As a Cashier I must not open HQ catalogue writes.

- AC-1: Given a pharmacy session, when I POST `/master-catalogue/skus`, then the response is 403.
- AC-2: Given a pharmacy session, when I GET `/master-catalogue/skus/{id}`, then 200 is allowed (read for mapping/POS).
- AC-3: Given HQ list filters `banned=true`, when banned rows exist, then only banned rows return.

## 9. Edge Cases & Error Handling

- Ceiling `0` is a valid cap (cannot sell above ₹0.00) — unusual but testable; HQ should usually set a positive number. Do not treat 0 as null.
- Un-ban after ban: shops re-map manually in `inventory`.
- Substitute chain cycles: allowed in v1 (POS should not infinite-loop; POS concern). This module does not DFS-detect cycles (assumption).
- Concurrent ban + charge: POS must re-read banned at charge; assert-price is the guard.
- Empty stocking list: valid.
- GST slab not in {0,5,12,18,28}: `400 INVALID_GST_SLAB` (assumption).
- Pharmacy query with `location_id` on these endpoints: ignored if present; not required because resource is platform-scoped. Inventory mapping queries remain tenant-scoped in `inventory`.

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Schema |
| `INVALID_CEILING` | 400 | Negative ceiling |
| `INVALID_GST_SLAB` | 400 | Unknown slab |
| `NOT_FOUND` | 404 | Unknown master id |
| `HQ_ONLY` | 403 | Pharmacy write |
| `ABOVE_DPCO_CEILING` | 200 body | Assert fail |
| `BANNED_SKU` | 200 body | Assert fail |

## 10. Open Questions / Assumptions

- Assumption: GST slabs in v1 are 0, 5, 12, 18, 28 percent.
- Assumption: `rx_only` is redundant with schedule except for rare OTC-but-Rx-workflow; filter `rx_only=true` returns H/H1/X plus flagged OTC.
- Assumption: inventory un-map API will be `POST /inventory/mappings/unmap-platform/{platform_master_sku_id}` (internal). This module calls it on ban; if it 5xx, ban still persists and event is emitted so inventory can catch up; POS still blocks via `banned`.
- Assumption: null `dpco_ceiling` means no cap; shop MRP still exists on **SKU**.
- Assumption: category values are free string in v1 (Fever, Cough, … as in POS chips may be copied later); no rigid enum in source.
- Assumption: cheapest-in-stock generic ranking is POS/inventory, not this module; this module only stores substitute ids.
- Out of v1: chemist-authored global master, per-state DPCO tables, Jan Aushadhi SKU set.
---
