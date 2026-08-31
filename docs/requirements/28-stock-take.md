# Requirement Doc: Stock Take (`stock-take`)

## 1. Summary

`stock-take` is the Growth physical-count workflow: export or on-screen **count sheet** (by rack or by **SKU**), compare system qty vs counted qty, review variance, then **Post adjustment** which updates **Batch** qty via `inventory` and emits an event so `books-gst` posts the variance journal (Inventory vs COGS/write-off). It is **Growth** (Pro included). Cannot post into a locked period (`books-gst` owns the lock; this module checks). Cannot drive Batch qty negative. Hold never applies (this is not POS). Export a blank count sheet; import counted qty.

Module layout: `modules/stock-take/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.

## 2. Scope (in / out)

### In

- Tenant + `location_id` on every query and mutation.
- Plan gate: Growth.
- Start a **StockTake** (`take_id`): scope by rack or by SKU.
- Count sheet UI: system qty vs counted qty vs variance.
- Export blank count sheet (Excel/CSV).
- Import counted qty into the open take.
- Post adjustment: inventory `stock-adjust` + event for journal; **AuditEvent**.
- Period-lock check on post (`document_date` / take date).
- Idempotent post (`client_take_id`).
- List of takes (draft / posted).
- Variance visible before post.

### Out

- Inventory list/360/opening CSV as the primary catalogue (`inventory`). Opening stock is not stock take.
- GRN (`purchases`), purchase returns, POS Charge/Hold.
- Journal UI / COA (`books-gst` posts from the event).
- Rack map editing (`racks`) — stock take may **filter** by rack code.
- Cycle count robotics, blind count mandatory mode beyond “blank sheet”, multi-location branches.
- Posting into a locked period; negative qty.

## 3. Dependencies

| Module | Why |
|---|---|
| `inventory` | Snapshot system qty per Batch; `stock-adjust` to set counted qty; rack codes for “by rack” sheets. |
| `books-gst` | Period/FY lock; journal “Stock take variance: Inventory vs COGS/write-off”. |
| `plan-gating` | Growth. |
| `tenancy` | Tenant + `location_id`. |
| `auth` / `manage-users` | Owner / Manager default; Pharmacist may be granted; Cashier default no. |
| `audit` | **AuditEvent** on post (before/after qty). |
| `racks` | Optional rack list for “by rack” filter (codes also on SKU if Free-assigned). |

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall scope every stock take to tenant + `location_id`.

**FR-2:** The system shall refuse UI and mutations when Growth is locked (`FORBIDDEN` + paywall); posted history retained.

**FR-3:** The system shall create a **StockTake** with `take_id`, `document_date`, scope `by_rack` (optional `rack_code`) or `by_sku`, status `draft` then `posted`.

**FR-4:** The system shall snapshot system Batch qty onto count lines at start (or at first load of the sheet) so variance is system_snapshot vs counted, not a moving live number mid-count unless refreshed (see §10: snapshot at create).

**FR-5:** The system shall build lines as **SKU + Batch** (qty lives on Batch). By-SKU sheet groups lines by SKU; by-rack sheet includes Batches whose SKU has that rack code.

**FR-6:** The system shall export a **blank** count sheet for the take: identifiers (sku_id, name, batch_no, expiry, rack codes) and empty counted column (system qty omitted or present as reference — blank means counted column empty; see §10).

**FR-7:** The system shall import counted qty from a file matching the export (same take_id / line keys); unknown rows `VALIDATION_ERROR` with line numbers.

**FR-8:** The system shall accept on-screen counted qty entry per line (including explicit 0).

**FR-9:** The system shall treat a blank counted cell as **not counted** (skip on post); explicit 0 is counted zero.

**FR-10:** The system shall compute variance = counted − system_snapshot for lines with counted set.

**FR-11:** The system shall post only lines with counted set; uncounted lines shall not change Batch qty.

**FR-12:** The system shall on Post call inventory `stock-adjust` with `counted_qty` ≥ 0 per included line, `source_id=take_id`, `document_date`, `client_mutation_id=client_take_id`.

**FR-13:** The system shall reject post if `document_date` is in a locked period (`FORBIDDEN`).

**FR-14:** The system shall reject post if any counted_qty < 0 (`VALIDATION_ERROR`).

**FR-15:** The system shall make post idempotent on `client_take_id`; retry shall not apply qty twice.

**FR-16:** The system shall emit `stock-take.posted` with per-line before/after qty and variance for `books-gst` (Inventory vs COGS/write-off per posted variance).

**FR-17:** The system shall append **AuditEvent** with actor, take_id, and qty before/after.

**FR-18:** The system shall not post a second adjustment on a **StockTake** already `posted` (`CONFLICT`).

**FR-19:** The system shall not decrement via Hold; this module only uses stock-adjust on post.

**FR-20:** The system shall keep English UI i18n-ready.

**FR-21:** The system shall list takes with date, scope, status, variance value summary after post.

**FR-22:** The system shall require at least one counted line to post (`VALIDATION_ERROR` if none).

**FR-23:** The system shall include zero-stock Batches still on file in the sheet so the chemist can find unexpected physical stock (counted > 0).

**FR-24:** The system shall, when scope is by rack and the rack has no SKUs, create a take with zero lines and block post until lines exist or the user changes scope.

**FR-25:** The system shall check lock again at post time (not only at create).

## 5. Non-Functional Requirements

- **Plan:** Growth. Retained on expiry.
- **Idempotency:** `client_take_id` on post.
- **Atomicity:** All included line adjusts in one inventory transaction; take status posted only after success.
- **Lock:** books-gst; `DEPENDENCY_FAILURE` if lock unread.
- **Tenancy:** `location_id` required.
- **Concurrency:** Two posted takes on the same Batch in an open period: last post wins via sequential adjusts; two simultaneous posts on different takes: row-level Batch updates serialize. Same take double-post prevented by status + idempotency.
- **i18n:** English ships.
- **Audit:** Append-only; money/stock movement.
- **Timezone:** IST for document_date vs lock months.

## 6. Data Model / Entities

### StockTake (`stock-take` owns)

| Field | Type | Notes |
|---|---|---|
| `take_id` | string | PK |
| `client_take_id` | string | Idempotent post; unique per tenant when posted |
| `document_date` | date | Lock-checked at post |
| `scope` | enum | `by_sku` \| `by_rack` |
| `rack_code` | string, null | When by_rack |
| `status` | enum | `draft` \| `posted` |
| `posted_at` | datetime, null | |
| `actor_user_id` | string | |
| `journal_ids` | string[], null | Filled when books confirms; optional |

### StockTakeLine

| Field | Type | Notes |
|---|---|---|
| `line_id` | string | |
| `take_id` | string | |
| `sku_id` | string | |
| `batch_id` | string | |
| `batch_no` | string | Snapshot |
| `expiry_date` | date | Snapshot |
| `system_qty` | number | Snapshot at create |
| `counted_qty` | number, null | Null = skipped |
| `variance` | number, null | counted − system when counted set |
| `qty_after` | number, null | Set on post |

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/stock-take`. Bearer + `location_id`. Growth. Standard envelopes.

### UI

- Catalogue/Business → Stock take (Growth). List, New take (by rack | by SKU), sheet grid, Export blank, Import, Post adjustment (confirm variance).
- Locked period: Post disabled with message; draft may still be edited.

### REST

**GET `/stock-take/takes?location_id=&page=`**  
`data[]`: `{ take_id, document_date, scope, rack_code, status, line_count, posted_at }`.

**POST `/stock-take/takes?location_id=`**  
`{ "document_date": "2026-08-31", "scope": "by_sku"|"by_rack", "rack_code": "A-12" }`  
Creates draft, snapshots lines. `403` if Growth locked. Create is allowed even if document_date is locked (so they can prepare); **post** is not.

**GET `/stock-take/takes/{take_id}?location_id=`**  
Header + lines with system_qty, counted_qty, variance.

**PATCH `/stock-take/takes/{take_id}/lines?location_id=`**  
`{ "lines": [{ "line_id", "counted_qty": 0 }] }` draft only.

**GET `/stock-take/takes/{take_id}/export?location_id=&format=xlsx|csv`**  
Blank counted column.

**POST `/stock-take/takes/{take_id}/import?location_id=`**  
Multipart file; fills counted_qty on draft.

**POST `/stock-take/takes/{take_id}/post?location_id=`**  
`{ "client_take_id": "uuid" }`  
Lock check; inventory adjust; status posted; event. Idempotent.

**GET `/stock-take/takes/{take_id}/variances?location_id=`**  
Posted or draft computed variances for the confirm step.

### Inventory

`POST /inventory/stock-adjust`  
`{ client_mutation_id, source_id: take_id, document_date, lines: [{ batch_id, counted_qty }] }` only counted lines.

### Events published

| Event | Payload |
|---|---|
| `stock-take.posted` | `{ tenant_id, location_id, take_id, document_date, lines: [{ sku_id, batch_id, system_qty, counted_qty, variance, qty_after }] }` |

Books posts Inventory vs COGS/write-off from variance (positive variance Dr Inventory Cr COGS/opening-style; negative Cr Inventory Dr COGS/write-off — **books-gst** specifies the exact accounts; this module only emits qty deltas).

### Lock

Before post: period containing `document_date` must be open.

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 — By SKU sheet**  
Given Growth and two Batches  
When Owner starts by_sku take  
Then both Batches appear with system_qty matching inventory.

**US-2 — By rack**  
Given SKUs on `A-12`  
When they start by_rack `A-12`  
Then only those SKUs’ Batches appear.

**US-3 — Blank export / import**  
When they export blank and import counted 5 for a line that was system 3  
Then counted_qty is 5 and variance is +2.

**US-4 — Skip blank**  
Given one line counted 4 and one left blank  
When they post  
Then only the first Batch is adjusted; the second qty unchanged.

**US-5 — Zero count**  
When counted is 0 and system was 2  
Then post sets qty 0 and event variance −2.

**US-6 — Locked month**  
Given July locked and document_date 15 Jul  
When they post  
Then blocked; inventory unchanged; take remains draft.

**US-7 — Open period**  
Given August open  
When they post an August take  
Then Batches match counted and books event fired once.

**US-8 — Idempotent**  
When post is retried with same `client_take_id`  
Then still one posted take and qty not double-applied.

**US-9 — Double post**  
When they post an already posted take with a new key  
Then `CONFLICT`.

**US-10 — Paywall**  
Given Starter  
When they open Stock take  
Then Growth paywall.

**US-11 — Negative counted**  
When import contains −1  
Then `VALIDATION_ERROR`, no post.

**US-12 — Confirm variance**  
When they open Post  
Then they see system vs counted vs variance before confirm.

**US-13 — Cashier**  
Given default Cashier  
Then `FORBIDDEN`.

**US-14 — Unexpected stock**  
Given Batch qty 0 on sheet  
When counted 6 is posted  
Then qty is 6 (positive variance).

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Locked period post | `FORBIDDEN`; failure catalogue “Stock take vs locked month” |
| Lock service down | `DEPENDENCY_FAILURE` |
| counted < 0 | `VALIDATION_ERROR` |
| No counted lines | `VALIDATION_ERROR` |
| Import extra SKU not on sheet | `VALIDATION_ERROR` |
| Import missing take_id column | `VALIDATION_ERROR` |
| Growth expired mid-draft | Post `FORBIDDEN`; data retained |
| Concurrent last-unit sale during draft | Snapshot may differ from live; post **sets** to counted (counted is physical truth). Live sales between snapshot and post can disagree — §10 |
| Two cashiers posting different takes | Serialized Batch updates; both can succeed sequentially |
| Empty rack scope | Zero lines; post blocked |
| Printer N/A | Export file instead |
| `location_id` missing | `VALIDATION_ERROR` |
| Hold | Not used |

## 10. Open Questions / Assumptions

1. **Lines are SKU + Batch**, not SKU-only totals. Catalogue says “by rack or SKU” as **sheet grouping**, and “post adjustment (journal + batch qty)”.
2. **Blank export** leaves counted empty. System qty **is included** as a reference column so import mapping is easier; “blank” means staff fill counted, not that system is hidden. If a true blind count is wanted later, a flag can hide system — **not in v1**.
3. **Snapshot at create:** `system_qty` frozen. Post **sets** Batch qty to counted (inventory stock-adjust), not “apply delta to live”. Physical count wins. Sales during a long take can be overwritten by counted — chemist should pause billing or take quickly. Logged.
4. **Uncounted lines skipped**, not treated as zero.
5. **Zero-qty Batches** remain on the sheet so overage can be posted.
6. **SKU with no Batch** (should not happen if opening/GRN always create Batches): omit from sheet; chemist must GRN/opening first. Do not auto-create a Batch on stock take.
7. **By rack** uses SKU `rack_codes` (works even if Growth racks UI later expires).
8. **document_date** is the count date the Owner enters (default today). Lock uses that date, not posted_at.
9. **Draft create** allowed in a locked date so the UI can warn early; **post** still blocked. UI should warn at create if date is locked.
10. **Variance journal** account split (COGS vs write-off) is **books-gst**; this module sends signed variance only.
11. **client_take_id** is required on post; create draft may generate `take_id` separately.
12. **Import format** matches export columns: `take_id, line_id, sku_id, batch_no, counted_qty`.
13. **No** auto-post at midnight; explicit Post.
14. **Pharmacist** default does not include stock take unless Owner grants the module (Pharmacist has inventory/racks, not stock take in the default table). Assumption: default **Owner + Manager** only.
15. **i18n-ready English**.
16. **Cannot post into locked period** is mandatory and tested.
17. **Idempotency:** same `client_take_id` after success returns the posted take; same key on a different `take_id` is `CONFLICT`.
