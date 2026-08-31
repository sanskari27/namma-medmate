# Requirement Doc: Purchases (`purchases`)

## 1. Summary

`purchases` is goods inward: the chemist posts a **GRN** against a distributor invoice, creates or tops up **SKU** / **Batch** stock, and records input GST that GSTR-2B/3B later subtract. It is **Free forever**. This is the day-to-day path new SKUs enter the shop (alongside opening-stock CSV in `inventory`). After a successful save, staff can print thermal batch/barcode labels. GRN post is **idempotent**. Duplicate distributor invoice numbers for the same distributor in the same financial year are blocked. A **GRN** cannot post a Batch whose expiry is in the past. Scheme **free qty** has cost 0 and still enters stock. Period lock is owned by `books-gst`; this module shall not post or edit a **GRN** whose document date falls in a locked period.

**Distributor** master data is owned by `distributors-reorder` (Growth). On **Free**, purchases may create a **lightweight distributor stub** (name + GSTIN) so a GRN can post without Growth. Full directory (licence, payment terms, supply list) remains Growth.

Module layout: `modules/purchases/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.

## 2. Scope (in / out)

### In

- Tenant + `location_id` on every query and mutation.
- Purchase KPIs: purchases this month, input-GST credit claimable, total GRNs.
- GRN list: GRN id, distributor, invoice no, date, line count, taxable, GST, total, Stocked status.
- New purchase: distributor + invoice + date; per-line existing-SKU picker or new-product creation; batch, expiry, qty, free qty (scheme), PTR, MRP, GST %.
- Bulk CSV import (downloadable template): match existing products, create new ones, then same save path as UI.
- **Save & update stock**: top up matching Batches or create new ones; refresh MRP/cost via `inventory` stock-in.
- Block duplicate `distributor_id` + invoice no + FY.
- Reject Batch expiry < today.
- Free qty cost 0, qty still added.
- Print labels for each new/updated Batch after save.
- Idempotent GRN post (`client_grn_id`).
- Create/select Free distributor stub (name + GSTIN).
- Emit GRN posted event for `books-gst` (Dr Inventory, Dr GST input, Cr AP; scheme qty cost 0).
- Period-lock check on post and on in-period edits.
- Input GST on the GRN is the figure later matched/subtracted in GSTR-2B/3B (`books-gst` owns match UI).

### Out

- Full distributor directory, supply list, price compare, reorder, **PurchaseOrder** (`distributors-reorder`, Growth).
- Pay distributor (`books-gst`).
- GSTR-2B pull and ITC claim flags (`books-gst`).
- Inventory list/360/opening CSV UI (`inventory`).
- Purchase/expiry returns (`purchase-returns`).
- Stock take (`stock-take`).
- POS billing, Hold (`pos-billing`).
- Rack map (`racks`).
- Creating SKUs from the Inventory screen.
- Negative stock, backdated GRN into a locked period, posting expired batches.
- Shop-floor UPI, branches, wholesale.

## 3. Dependencies

| Module                  | Why                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inventory`             | Stock-in API (top up / create Batch + SKU); label print payload; DPCO ceiling; FEFO qty after post.                                                                        |
| `plan-gating`           | Purchases is Free forever.                                                                                                                                                 |
| `tenancy`               | Tenant + `location_id`.                                                                                                                                                    |
| `auth` / `manage-users` | Owner / Manager default; Pharmacist/Cashier default cannot post GRNs unless granted.                                                                                       |
| `audit`                 | **AuditEvent** on GRN post, failed duplicate, stub create, label print.                                                                                                    |
| `books-gst`             | Period/FY lock read; journals from `purchases.grn.posted`; FY bounds for duplicate invoice check.                                                                          |
| `master-catalogue`      | Match new lines to **PlatformMasterSku**; DPCO on MRP.                                                                                                                     |
| `account-settings`      | Thermal label template.                                                                                                                                                    |
| `distributors-reorder`  | Growth directory is the same `distributor_id` space. Purchases **creates stubs** on Free; Growth enriches them. Record GRN from a **PurchaseOrder** pre-fills this module. |
| `purchase-returns`      | Returns against a posted **GRN** (later module).                                                                                                                           |

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall scope every GRN read and write to the authenticated tenant and `location_id`.

**FR-2:** The system shall persist a **GRN** with distributor, invoice number, document date, lines, taxable, GST, total, and Stocked status, and shall assign a unique `grn_id` per tenant.

**FR-3:** The system shall show KPIs for the Location: sum of GRN totals with `document_date` in the current calendar month (IST) as “purchases this month”; sum of GST on all posted GRNs in that month as “input-GST credit claimable”; count of posted GRNs as “total GRNs”.

**FR-4:** The system shall list GRNs with: `grn_id`, distributor display name, invoice no, date, line count, taxable, GST, total, Stocked (`stocked` true after successful inventory stock-in).

**FR-5:** The system shall require distributor, invoice no, and date before lines can be posted.

**FR-6:** The system shall, on Free, allow selecting an existing stub or creating a stub with **name + GSTIN** (GSTIN validated as 15 characters when provided); GSTIN may be empty only if the user explicitly saves name-only (see §10).

**FR-7:** The system shall not require Growth to post a GRN.

**FR-8:** The system shall, when Growth directory exists for the same `distributor_id`, use that record’s name/GSTIN on the GRN header without duplicating a second firm.

**FR-9:** The system shall allow each line to pick an existing **SKU** or create a new SKU (name, composition, manufacturer, pack, schedule, HSN, GST %, category, form as available) mapped to **PlatformMasterSku** when a master match is chosen.

**FR-10:** The system shall require on each line: batch no, expiry date, qty > 0 (paid qty), optional free qty ≥ 0, PTR ≥ 0, MRP > 0, GST %.

**FR-11:** The system shall reject a line whose `expiry_date` is before today IST (`VALIDATION_ERROR`).

**FR-12:** The system shall treat free qty as scheme: cost 0, still included in Batch `qty` via inventory stock-in.

**FR-13:** The system shall compute line taxable as PTR × paid qty (free qty excluded from taxable); line GST from GST % on taxable; line total = taxable + GST. Header totals are sums of lines (2 decimal places).

**FR-14:** The system shall on **Save & update stock** post the GRN and call `inventory` stock-in in one overall success: either both persist or neither (compensating delete is not allowed to leave stock without GRN). Stocked becomes true only after inventory confirms.

**FR-15:** The system shall top up an existing Batch when `sku_id` + `batch_no` match at the Location; otherwise create a new Batch; then refresh SKU MRP and Batch cost per inventory FR-26.

**FR-16:** The system shall reject the post when inventory reports MRP above DPCO.

**FR-17:** The system shall reject two posted GRNs with the same `distributor_id` and same invoice number (normalised trim, case-insensitive) in the same financial year (`CONFLICT`).

**FR-18:** The system shall treat FY as 1 April–31 March IST unless `books-gst` exposes a FY calendar; invoice/document date selects FY for FR-17.

**FR-19:** The system shall accept bulk CSV using a downloadable template; each row matches an existing SKU or creates a new one; the import builds the same GRN document as the UI (one GRN per import file unless the file includes a single header invoice — see §10).

**FR-20:** The system shall not post a GRN when `document_date` is in a locked period (`FORBIDDEN`).

**FR-21:** The system shall not edit or delete a posted GRN whose `document_date` is in a locked period. Corrections are **PurchaseReturn** / reversing documents in an open period (`purchase-returns` / books).

**FR-22:** The system shall make GRN post idempotent on `client_grn_id` per tenant: a retry returns the original `grn_id` and shall not create a second GRN or second stock-in.

**FR-23:** The system shall, after a successful post, offer **Print labels** for every new or updated Batch (SKU, batch, expiry, MRP) via inventory label payload + Invoice Settings thermal template.

**FR-24:** The system shall emit `purchases.grn.posted` once with taxable, GST, total, line costs (scheme 0), `grn_id`, `distributor_id`, `document_date` for `books-gst` auto-post (Dr Inventory, Dr GST input, Cr AP).

**FR-25:** The system shall append **AuditEvent** on post (actor, role, tenant, before/after totals, `grn_id`).

**FR-26:** The system shall not decrement stock; Hold is irrelevant here; GRN only increments via inventory.

**FR-27:** The system shall pre-fill a new GRN when invoked from **PurchaseOrder** Record GRN (`po_id` query): distributor locked to the PO, lines suggested from PO qtys; chemist still enters invoice no, date, batch, expiry, PTR, MRP.

**FR-28:** The system shall store input GST on the GRN as the amount GSTR-2B/3B later subtract; this module shall not pull 2B or mark ITC claim.

**FR-29:** The system shall keep English UI i18n-ready.

**FR-30:** The system shall refuse new-SKU creation that omits schedule tag `{OTC, H, H1, X}`.

**FR-31:** The system shall allow CSV template download without posting.

**FR-32:** The system shall show Stocked = false only for drafts (if drafts exist) or failed inventory; v1 posted GRNs are Stocked true (see §10: no unstocked posted GRN).

## 5. Non-Functional Requirements

- **Plan:** Free forever.
- **Idempotency:** `client_grn_id` required on post (same pattern as POS `client_charge_id`).
- **Atomicity:** GRN row + inventory stock-in succeed together; failure rolls back both.
- **Tenancy:** `location_id` on every call.
- **Audit:** Append-only on post and stub create.
- **Lock:** Check `books-gst` before post/edit; if lock service fails, do not post (`DEPENDENCY_FAILURE`).
- **Money:** INR, 2 dp. PTR GST-exclusive; MRP GST-inclusive, DPCO-capped inside inventory.
- **Timezone:** IST for “this month”, “today” expiry, FY.
- **Latency:** List p95 < 1s typical; CSV import bounded (see §10 row cap).
- **Print:** Failure does not roll back GRN; reprint from list/detail.
- **i18n:** English ships.

## 6. Data Model / Entities

### GRN (`purchases` owns)

| Field            | Type         | Notes                                 |
| ---------------- | ------------ | ------------------------------------- |
| `grn_id`         | string       | PK                                    |
| `client_grn_id`  | string       | Unique per tenant; idempotency        |
| `distributor_id` | string       | Stub or full directory                |
| `invoice_no`     | string       | Duplicate key with distributor + `fy` |
| `document_date`  | date         | Invoice/goods date; lock-checked      |
| `fy`             | string       | e.g. `2026-27`                        |
| `taxable`        | number       | Sum of line taxable                   |
| `gst_amount`     | number       | Input GST                             |
| `total`          | number       | taxable + gst                         |
| `stocked`        | boolean      | True after inventory success          |
| `po_id`          | string, null | If created from **PurchaseOrder**     |
| `actor_user_id`  | string       |                                       |
| `posted_at`      | datetime     |                                       |

### GRNLine

| Field         | Type         | Notes                                     |
| ------------- | ------------ | ----------------------------------------- |
| `line_id`     | string       |                                           |
| `grn_id`      | string       |                                           |
| `sku_id`      | string       | After create                              |
| `is_new_sku`  | boolean      | Created on this GRN                       |
| `batch_no`    | string       |                                           |
| `batch_id`    | string, null | Filled after stock-in                     |
| `expiry_date` | date         | Must be ≥ today at post                   |
| `qty`         | number       | Paid qty (base units — see inventory §10) |
| `free_qty`    | number       | Scheme; cost 0                            |
| `ptr`         | number       | Per base unit, GST exclusive              |
| `mrp`         | number       | GST inclusive                             |
| `gst_pct`     | number       |                                           |
| `taxable`     | number       | ptr × qty                                 |
| `gst_amount`  | number       |                                           |
| `line_total`  | number       |                                           |

### Distributor stub (created here on Free; owned long-term by `distributors-reorder`)

| Field            | Type         | Notes                      |
| ---------------- | ------------ | -------------------------- |
| `distributor_id` | string       | Same id Growth will enrich |
| `name`           | string       | Required                   |
| `gstin`          | string, null | 15 chars when set          |
| `source`         | enum         | `stub` \| `directory`      |
| `active`         | boolean      | Default true               |

Growth adds contact, drug licence, address, payment terms, return window, etc. Purchases shall not delete a distributor that has GRNs (remove = Growth `active` toggle).

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/purchases`. Bearer + `location_id`. Envelopes as inventory.

### UI

- Catalogue → Purchases. KPIs, list, New purchase, CSV import, GRN detail, Print labels.
- New purchase: header (distributor typeahead + Add stub, invoice no, date) → lines (picker / new product / CSV) → Save & update stock → Print labels.
- Shortcut from Inventory “Add-stock-via-purchase”.
- Record GRN from PO: `/purchases/new?location_id=&po_id=`.

### REST

**GET `/purchases/kpis?location_id=`**  
`{ purchases_this_month_total, input_gst_claimable_this_month, grn_count }`.

**GET `/purchases/grns?location_id=&q=&page=&page_size=`**  
`q` matches `grn_id`, invoice no, distributor name.  
`data[]`: `{ grn_id, distributor_id, distributor_name, invoice_no, document_date, line_count, taxable, gst_amount, total, stocked }`.

**GET `/purchases/grns/{grn_id}?location_id=`**  
Header + lines + `po_id`.

**POST `/purchases/grns?location_id=`**  
Body:

```json
{
  "client_grn_id": "uuid",
  "distributor_id": "dist-...",
  "invoice_no": "INV-100",
  "document_date": "2026-08-31",
  "po_id": null,
  "lines": [
    {
      "sku_id": "sku-...",
      "new_sku": null,
      "batch_no": "B123",
      "expiry_date": "2027-06-30",
      "qty": 100,
      "free_qty": 10,
      "ptr": 2.5,
      "mrp": 5.0,
      "gst_pct": 12
    }
  ]
}
```

`new_sku` when creating: `{ name, composition, manufacturer, pack_size, pack_unit, schedule, hsn, gst_pct, category, form, platform_master_sku_id }`.  
Responses: `200` posted `{ grn_id, stocked: true, batch_ids[] }`; `409` duplicate invoice or idempotent conflict on different body; `403` locked period; `400` past expiry / validation; `403` plan/role.

Idempotent: same `client_grn_id` + same body → original GRN. Same key + different body → `CONFLICT`.

**GET `/purchases/csv-template?location_id=`**  
File download.

**POST `/purchases/grns/import?location_id=`**  
Multipart: file + `client_grn_id` + `distributor_id` + `invoice_no` + `document_date`. Maps rows to lines; then same as POST GRN.

**GET `/purchases/distributors?location_id=&q=`**  
Stubs + directory rows (directory fields may be sparse on Free). For picker.

**POST `/purchases/distributors/stub?location_id=`**  
`{ "name": "Acme Pharma", "gstin": "29ABCDE1234F1Z5" }` → `{ distributor_id }`. **AuditEvent**.

**POST `/purchases/grns/{grn_id}/labels?location_id=`**  
Returns inventory print payload for batches on this GRN.

Posted GRN has no PATCH in a locked period. v1: posted GRNs are immutable; reverse via `purchase-returns` (assumption §10).

### Events published

| Event                                | Payload                                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `purchases.grn.posted`               | `{ tenant_id, location_id, grn_id, distributor_id, document_date, taxable, gst_amount, total, lines: [{ sku_id, batch_id, qty, free_qty, ptr, gst_pct, taxable, gst_amount }] }` |
| `purchases.distributor_stub.created` | `{ tenant_id, location_id, distributor_id, name, gstin }`                                                                                                                        |

### Events consumed

None required. PO pre-fill is REST GET from `distributors-reorder`.

### Inventory calls

`POST /inventory/stock-in` with `source=grn`, `source_id=grn_id`, `client_mutation_id=client_grn_id`.

### Lock

Before post: `books-gst` period lock for `document_date`.

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 — New GRN**  
Given an open period and a stub distributor  
When the Manager saves invoice INV-1 dated today with one line qty 10, free 2, PTR 8, MRP 12, GST 12%, batch future expiry  
Then a **GRN** exists, Batch qty increased by 12, taxable = 80, input GST posted on the event, Stocked true, labels offered.

**US-2 — Duplicate invoice**  
Given GRN already posted for distributor D invoice INV-1 in FY 2026-27  
When another post uses D + INV-1 in the same FY  
Then `CONFLICT` and stock unchanged.

**US-3 — Duplicate FY boundary**  
Given INV-1 posted 2026-03-31 (FY 2025-26)  
When INV-1 is posted 2026-04-01 for the same distributor  
Then the second post succeeds (different FY).

**US-4 — Past expiry**  
When a line expiry is yesterday  
Then post fails `VALIDATION_ERROR` and no GRN row.

**US-5 — Idempotent retry**  
Given a successful post `client_grn_id=g1`  
When the network retries the same body  
Then one GRN, one stock-in, same `grn_id`.

**US-6 — CSV create SKU**  
Given a CSV row for an unknown product with required fields  
When import posts  
Then a new **SKU** exists and a Batch is created (not via Inventory Add).

**US-7 — CSV match**  
Given an existing SKU barcode on the row  
When import posts  
Then no second SKU; Batch tops up or is created under that `sku_id`.

**US-8 — Locked period**  
Given July locked  
When `document_date` is in July  
Then post is blocked.

**US-9 — Free stub**  
Given Growth is not unlocked  
When the Owner adds distributor name + GSTIN and posts a GRN  
Then the GRN succeeds without the Growth directory screens.

**US-10 — Growth same id**  
Given a stub later enriched in `distributors-reorder`  
When Purchases list renders  
Then the enriched name shows; `distributor_id` unchanged.

**US-11 — Labels**  
Given a posted GRN  
When Print labels  
Then each new/updated Batch prints SKU, batch, expiry, MRP.

**US-12 — PO Record GRN**  
Given **PurchaseOrder** P in Sent  
When Record GRN opens purchases  
Then distributor is P’s distributor and line SKUs/qtys are suggested.

**US-13 — Cashier**  
Given default Cashier  
When they POST a GRN  
Then `FORBIDDEN`.

**US-14 — Scheme cost**  
When free_qty = 5 and qty = 10  
Then inventory receives 15 units and books event has cost 0 on the free portion (weighted cost on Batch per inventory).

**US-15 — DPCO**  
When line MRP exceeds ceiling  
Then GRN fails and stock is unchanged.

## 9. Edge Cases & Error Handling

| Case                                         | Behaviour                                                       |
| -------------------------------------------- | --------------------------------------------------------------- |
| Missing `client_grn_id`                      | `VALIDATION_ERROR`                                              |
| Same key, different body                     | `CONFLICT`                                                      |
| Duplicate invoice same FY                    | `CONFLICT`                                                      |
| Expiry in the past                           | `VALIDATION_ERROR`                                              |
| qty ≤ 0                                      | `VALIDATION_ERROR`                                              |
| free_qty < 0                                 | `VALIDATION_ERROR`                                              |
| Locked period                                | `FORBIDDEN`                                                     |
| Lock API down                                | `DEPENDENCY_FAILURE`; no post                                   |
| Inventory stock-in fails                     | GRN not posted; client retries same `client_grn_id`             |
| Invalid GSTIN length                         | `VALIDATION_ERROR`                                              |
| Printer fail                                 | GRN stands                                                      |
| CSV malformed                                | `VALIDATION_ERROR` with row numbers in `details`                |
| Empty lines array                            | `VALIDATION_ERROR`                                              |
| Banned master selected for new map           | `VALIDATION_ERROR`; cannot stock a banned **PlatformMasterSku** |
| Edit posted GRN                              | Not allowed in v1; use purchase return                          |
| `location_id` mismatch                       | `VALIDATION_ERROR` / empty                                      |
| Two GRNs same invoice different distributors | Allowed                                                         |
| Hold                                         | Not used; no stock out                                          |

## 10. Open Questions / Assumptions

1. **Free distributor stub:** On Free, a lightweight distributor **name + GSTIN** is stored (`source=stub`) so a GRN can post without Growth. Growth directory uses the **same** `distributor_id`. This is an explicit product assumption.
2. **GSTIN on stub:** Optional if name is present so small suppliers without GSTIN can still inward (common for local). If GSTIN is present it must be 15 characters. 2B match quality is a books concern.
3. **Posted GRNs are immutable** in v1. Wrong invoice → **PurchaseReturn** plus a new GRN in an open period. No GRN header patch.
4. **One CSV file = one GRN** (header invoice fields in the POST, not per row). Rows are lines only.
5. **CSV row cap:** 500 lines per import in v1; over cap `VALIDATION_ERROR`.
6. **Paid qty vs free qty** are both in **base units** consistent with inventory.
7. **PTR** is GST-exclusive per base unit; MRP GST-inclusive.
8. **Input-GST credit claimable KPI** is local sum of GRN GST for the current calendar month, not 2B-claimed net. `books-gst` later subtracts via 2B/3B.
9. **Stocked** is always true for a successfully posted GRN; there is no “save header without stock” in v1.
10. **FY string** `YYYY-YY` from document date (Apr–Mar). Duplicate check uses that FY.
11. **New SKU** on a line is the only console path besides opening CSV to insert SKUs.
12. **Record GRN** does not auto-mark **PurchaseOrder** Received; that stays on `distributors-reorder`.
13. **Cannot stock banned masters** on new mapping; existing shop SKU already unmapped is pickable only if still in inventory for disposal — GRN should not re-map a banned master (inventory un-ban assumption).
14. **Pharmacist** default has no Purchases; Owner may grant it in Manage Users.
15. **Idempotency** of GRN includes inventory `client_mutation_id = client_grn_id`.
16. **No draft GRN** persisted in v1; abandoning the form creates nothing.
