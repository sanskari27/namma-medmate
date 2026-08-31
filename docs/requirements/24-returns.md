# Requirement Doc: Returns (`returns`)

**Plan gate:** Free forever (tied to POS). Credit notes are how a bill is reversed; bills are never deleted.  
**Surface:** Pharmacy Partner Console — Returns flow (from invoice modal, Orders, Sales).  
**Owner module:** `modules/returns/{ui,api,docs}`  
**Owns:** `CreditNote`, `CreditNoteLine`. Does not own Bill (POS) or Batch qty (inventory writes via domain service).

---

## 1. Summary

Returns reverse a **counter or kiosk posted bill** without deleting history. Staff find the original invoice, choose **full or line-level qty**, map a **GST reason**, choose destination **Restock (same batch)** or **Write off**, and post a GST **credit note** (prefix from Invoice Settings).

Refund is **cash** or **back to khata** (one method, matching constraints below). Staff cannot return more than billed (net of prior CNs). Loyalty earn/burn that originated on that bill is reversed. H1/X returns reverse the **pharmacy legal register**. If the original bill had an IRN, the CN requests an **IRN credit note**.

**Cancel = credit note, never delete.** No customer debit notes in v1. Locked period: the CN posts in an **open** period only (cannot backdate into a lock).

---

## 2. Scope (in / out)

### In scope

- Find original posted invoice (search / `billId` query) and start Return.
- Full return or per-line qty ≤ remaining returnable qty.
- GST reason mapping (catalogue §3.20).
- Destination per line: Restock same `batch_id` or Write off.
- Post Credit Note; allocate CN number unique per pharmacy per FY (separate prefix from bills).
- IRN credit-note when original had IRN (`books-gst`).
- Refund cash (till) or khata credit (reduce receivable / write customer balance back).
- Reverse loyalty earn and burn via `crm`.
- Reverse H1/X legal register via `statutory-registers`.
- Single TX: CN insert, stock increment or write-off, khata, loyalty, journal, audit.
- Idempotent post on `client_credit_note_id`.
- Invoice modal / Orders / Sales entry points.

### Out of scope

- Deleting or editing the original Bill.
- Customer **debit notes**.
- Purchase / expiry returns to distributor (`purchase-returns`).
- UPI/Card refunds (v1 GMV cash|khata only).
- Split refund (part cash part khata) — **one refund tender**.
- Creating a CN without an original bill (no on-account CN in v1).
- HQ inspector register (pharmacy legal register only).
- Period lock UI (`books-gst`); returns **enforces** open period.

---

## 3. Dependencies (be specific: APIs/events needed from other slugs)

| Other slug | Need | Contract |
|---|---|---|
| `pos-billing` | Original Bill + lines + tender + IRN + loyalty snapshot + channel | `GET /bills/:id` |
| `account-settings` | CN prefix, invoice template | `GET /settings/invoice` `{ credit_note_prefix }` |
| `inventory` | Restock same batch; qty ≥ 0 | `inventory.incrementBatch` (restock) or no qty change on write-off |
| `khata` | Refund to khata; reduce outstanding | `khata.postCreditNote` |
| `crm` | Reverse earn/burn lots from `bill_id` | `crm.reverseBillLoyalty` |
| `statutory-registers` | Reverse H1/X | `statutoryRegisters.appendScheduledReturn` |
| `books-gst` | Period lock; IRN CN; journal | `requestIrnCreditNote`; `postCreditNoteJournal` |
| `audit` | Append | CN posted, IRN CN, restock vs write-off |
| `go-live-kyc` | Should already have bills; still refuse if `can_post_bills` false | |
| `auth` | PIN not generally required except write-off may use Manager? **Assume Cashier can return; write-off logged** | permission `returns` (Free; Cashier yes) |
| `whatsapp` | IRN fail banner is books-gst; optional CN share pre-fill | |
| `plan-gating` | Always unlocked | |

Event in: none required (user-driven). Event out: `CreditNotePosted`.

---

## 4. Functional Requirements (FR-n: The system shall ... ATOMIC)

### 4.1 Entry and original bill

- **FR-1:** The system shall start a return only against a `Bill.status=posted` in this tenant/location.
- **FR-2:** The system shall reject return against `draft_irn`, holds, or missing bills (`BILL_NOT_POSTED`).
- **FR-3:** The system shall load remaining returnable qty per line = billed qty − sum of posted CN qty for that line.
- **FR-4:** The system shall block submit if all remaining qtys are 0 (`NOTHING_TO_RETURN`).
- **FR-5:** The system shall allow full return (all remaining) or partial line qty (integer ≥ 1, ≤ remaining).
- **FR-6:** The system shall not allow returning a SKU/batch that was not on the bill.

### 4.2 GST reason

- **FR-7:** The system shall require exactly one GST reason per CN:

| Staff reason | GST mapping |
|---|---|
| Customer changed mind | `sales_return` |
| Wrong item | `sales_return` |
| Damaged | `sales_return` |
| Expired at home | `sales_return` |
| Owner-initiated price correction | `post_sale_discount` |
| Other | `other` |

- **FR-8:** The system shall persist both `staff_reason` and `gst_reason`.
- **FR-9:** The system shall **not** offer customer debit-note reasons or issue debit notes.

### 4.3 Destination

- **FR-10:** The system shall require each returned line destination `restock` \| `write_off`.
- **FR-11:** The system shall, on `restock`, increment the **same** `batch_id` qty by returned qty (batch must still exist; if batch row gone, force write-off with message).
- **FR-12:** The system shall, on `write_off`, **not** increment stock; journal Dr write-off / COGS path per books-gst (reverse inventory only if restock).
- **FR-13:** The system shall allow mixed destinations across lines on one CN.
- **FR-14:** The system shall, when `gst_reason` is `post_sale_discount` (owner price correction), require every CN line to carry qty (same as sales return) **and** force destination `write_off` with **no stock increment**. Value refunded is the allocated GST-inclusive SP of those qty. Restock on a price-correction CN is rejected (`DESTINATION_INCOMPATIBLE`). Staff who need goods back shall pick a `sales_return` reason instead.

### 4.4 Credit note identity and GST

- **FR-15:** The system shall allocate `cn_no` unique per pharmacy per FY using **credit note prefix** from Invoice Settings (never the bill prefix, never reuse).
- **FR-16:** The system shall compute CN GST on the **discounted SP portion being returned** (same inclusive method as POS): taxable = SP×100/(100+rate); GST = SP − taxable; CGST+SGST or IGST **mirroring the original bill’s supply type**.
- **FR-17:** The system shall round CN total to 2 decimals with round-off line to books.
- **FR-18:** The system shall print/PDF a GST credit note (thermal 80 mm + A4).

### 4.5 IRN

- **FR-19:** The system shall request IRN credit-note iff original bill has `irn` set.
- **FR-20:** The system shall, if IRP down, **not** post the CN by default; persist draft; no stock increment until IRN CN success **or** Owner `issue_without_irn` (logged) — same pattern as POS. Original IRN remains on the bill.
- **FR-21:** The system shall skip IRN if original was B2C (no IRN).

### 4.6 Refund tender

- **FR-22:** The system shall refund with **exactly one** of `cash` | `khata`.
- **FR-23:** The system shall allow `khata` refund only if original tender was `khata` **or** the named customer has a khata (reduce receivable). Walk-in original cash → refund **cash only**.
- **FR-24:** The system shall not refund khata to a walk-in (`WALKIN_KHATA_BLOCKED`).
- **FR-25:** The system shall pay cash refund from till (journal Dr Sales/GST reverse, Cr Cash) — no UPI.
- **FR-26:** The system shall refuse cash refund > cash in till? **Assumption: v1 does not block on till shortfall; day-end variance handles it; still post.**
- **FR-27:** The system shall not split refund.

### 4.7 Loyalty, registers, lock, idempotency

- **FR-28:** The system shall call `crm.reverseBillLoyalty` proportional to returned net / original net (full return reverses all earn and all burn from that bill; partial: **pro-rata points round half-up**, never reverse more than remaining lots from that bill).
- **FR-29:** The system shall append H1/X **return** rows for scheduled lines (negative qty / reverse) on the pharmacy legal register with doctor + pharmacist snapshot from original bill (and current duty if required — **assumption: use original pharmacist snapshot + actor of CN**).
- **FR-30:** The system shall refuse CN `cn_date` in a locked period (`PERIOD_LOCKED`). Default `cn_date` = today IST (open period). Original bill may sit in a locked month — reversal still posts **today**.
- **FR-31:** The system shall post via `POST /credit-notes` with `client_credit_note_id` unique; retries return the same CN; stock incremented once.
- **FR-32:** The system shall never `DELETE` a Bill or CN. Posted CN is final; corrections = another CN (if qty remains) or books journal (out of this module).
- **FR-33:** The system shall run one DB transaction: insert CN; restock or skip; khata; loyalty reverse; statutory reverse; `booksGst.postCreditNoteJournal`; audit; then `CreditNotePosted`.
- **FR-34:** The system shall not decrement or increment stock for write-off lines (inventory qty unchanged; COGS/write-off journal).
- **FR-35:** The system shall block return qty that would exceed remaining (`QTY_EXCEEDS_BILLED`).
- **FR-36:** The system shall require go-live `can_post_bills` to post a CN.

---

## 5. Non-Functional Requirements

- **NFR-1:** Post CN p95 ≤ 2 s excluding IRP.
- **NFR-2:** Idempotent `client_credit_note_id`; IRN CN request idempotent.
- **NFR-3:** Same tenancy and paise rules as POS.
- **NFR-4:** Concurrent two CNs on last returnable unit: one succeeds; other `QTY_EXCEEDS_BILLED`.
- **NFR-5:** i18n English; audit append-only.
- **NFR-6:** Printer fail → CN stands, reprint.

---

## 6. Data Model / Entities

### 6.1 `CreditNote`

| Column | Type | Notes |
|---|---|---|
| `cn_id` | UUID | |
| `tenant_id`, `location_id` | | |
| `client_credit_note_id` | UUID unique | |
| `cn_no` | TEXT | unique with fy |
| `fy` | TEXT | |
| `status` | `draft_irn` \| `posted` | |
| `cn_date` | DATE | open period |
| `bill_id` | UUID | original |
| `staff_reason` | ENUM | `changed_mind` \| `wrong_item` \| `damaged` \| `expired_at_home` \| `price_correction` \| `other` |
| `gst_reason` | ENUM | `sales_return` \| `post_sale_discount` \| `other` |
| `refund_method` | `cash` \| `khata` | |
| `subtotal_sp_paise` | BIGINT | |
| `gst_paise` / cgst/sgst/igst | | |
| `round_off_paise` | | |
| `total_paise` | | |
| `irn` | TEXT NULL | CN IRN |
| `issued_without_irn` | BOOL | |
| `actor_user_id` | | |
| `posted_at` | | |

### 6.2 `CreditNoteLine`

| Column | Notes |
|---|---|
| `cn_line_id` | |
| `cn_id` | |
| `bill_line_id` | |
| `sku_id`, `batch_id` | same as original |
| `qty` | > 0 |
| `destination` | `restock` \| `write_off` |
| `unit_sp_paise` | snapshot from bill allocation |
| `line_sp_paise`, taxable, gst | |

### 6.3 Sequence

`InvoiceSequence(..., kind='credit_note')` owned here, prefix from settings.

---

## 7. API / Interface Contracts (REST JSON, events, UI props)

### 7.1 `GET /returns/bills/:billId/preview`

Returns original bill, remaining qty per line, original tender, whether IRN CN required, loyalty reversible points, khata remaining.

### 7.2 `POST /credit-notes`

```json
{
  "location_id": "uuid",
  "client_credit_note_id": "uuid",
  "bill_id": "uuid",
  "cn_date": null,
  "staff_reason": "changed_mind",
  "lines": [
    { "bill_line_id": "uuid", "qty": 1, "destination": "restock" }
  ],
  "refund_method": "cash",
  "issue_without_irn_token": null
}
```

`gst_reason` derived from `staff_reason` (FR-7). Server recomputes money.

**TX:** IRN CN outside if needed → BEGIN insert CN; for restock lines `UPDATE batches SET qty = qty + :q`; khata if refund khata; `crm.reverseBillLoyalty`; statutory reverse; journal reverse path (Dr Sales, Dr GST output; Cr Cash or Cr Khata; Dr Inventory Cr COGS if restock; write-off expense if write_off); audit; COMMIT; event.

Error codes: `BILL_NOT_POSTED`, `QTY_EXCEEDS_BILLED`, `NOTHING_TO_RETURN`, `PERIOD_LOCKED`, `GO_LIVE_INCOMPLETE`, `WALKIN_KHATA_BLOCKED`, `IRN_UNAVAILABLE`, `BATCH_GONE_USE_WRITE_OFF`, `PLAN` N/A, `TENDER_INVALID`.

### 7.3 `GET /credit-notes/:cnId`

Full CN + lines + original invoice no.

### 7.4 `GET /credit-notes/:cnId.pdf` / `print?fmt=thermal`

### 7.5 `GET /credit-notes?bill_id=`

List CNs for Orders timeline.

### 7.6 Event `CreditNotePosted`

```json
{
  "event": "CreditNotePosted",
  "cnId": "uuid",
  "billId": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "refundMethod": "cash",
  "gstReason": "sales_return",
  "lines": [{ "batchId": "uuid", "qty": 1, "destination": "restock", "schedule": "H1" }],
  "totalPaise": 11800,
  "irn": null,
  "actor": { "userId": "uuid" }
}
```

### 7.7 Domain services

```ts
inventory.incrementBatch(tx, { batchId, qty })
khata.postCreditNote(tx, { customerId, cnId, amountPaise })
crm.reverseBillLoyalty(tx, { billId, fraction })
statutoryRegisters.appendScheduledReturn(tx, { originalBill, cn, lines })
booksGst.requestIrnCreditNote({ originalIrn, cnDraft })
booksGst.postCreditNoteJournal(tx, { cn, originalBill })
```

### 7.8 UI

`ReturnWizard`: step 1 find bill, step 2 lines+qty+destination, step 3 reason+refund, step 4 confirm.  
Opened as `/returns/new?billId=` from POS invoice modal.

```ts
type ReturnRefundMethod = "cash" | "khata"; // no upi/card
```

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Full cash restock**  
Given posted cash bill qty 2 OTC  
When staff returns qty 2 restock cash  
Then CN posted, batch +2, till Cr cash, original bill still GET-able.

**US-2 Partial line**  
Given qty 3, already CN qty 1  
When return qty 3  
Then `QTY_EXCEEDS_BILLED`; qty 2 succeeds.

**US-3 Write off**  
When destination write_off  
Then batch qty unchanged; journal write-off; CN still GST-valid.

**US-4 Reason mapping**  
When staff picks “Expired at home”  
Then `gst_reason=sales_return`. When “price correction” → `post_sale_discount`.

**US-5 Khata refund**  
Given original khata  
When refund khata  
Then receivable decreases by CN total; no cash movement.

**US-6 Walk-in khata refund blocked**  
Given walk-in cash original  
When refund_method khata  
Then `WALKIN_KHATA_BLOCKED`.

**US-7 Loyalty reverse**  
Given earn 5 and burn 20 on original  
When full return  
Then lots restore burn and claw back remaining earn from that bill (not below 0 remaining).

**US-8 H1 reverse**  
Given H1 line  
When return restock  
Then pharmacy H1 register shows a reverse row; HQ not written here.

**US-9 IRN CN**  
Given original IRN  
When IRP up  
Then CN has IRN; when IRP down default no stock increment.

**US-10 Locked original month**  
Given bill in locked July, August open  
When return today  
Then CN dated August; July untouched.

**US-11 Cancel never deletes**  
When POS Cancel  
Then this wizard opens; `DELETE /bills` 405/404.

**US-12 Idempotent**  
When POST twice same `client_credit_note_id`  
Then one CN, one restock.

**US-13 Concurrent**  
When two CNs qty 1 on remaining 1  
Then one `200`, one `QTY_EXCEEDS_BILLED`.

**US-14 Printer fail**  
Then CN stands; reprint.

**US-15 No debit note**  
Then UI has no “Debit note” action.

**US-16 Kiosk origin**  
Given channel kiosk cash bill  
When return cash restock  
Then allowed (staff console, not kiosk shopper).

---

## 9. Edge Cases & Error Handling (include §10 failure catalogue rows that apply)

| Catalogue event | Returns behaviour |
|---|---|
| Network drop during Charge | N/A to CN; same pattern: retry same `client_credit_note_id`. |
| Thermal printer offline | CN posted; reprint. |
| IRP down / IRN reject | CN not posted default; Owner override; WhatsApp/banner via books-gst. |
| Plan expired | Returns stay Free. |
| Loyalty redeem > 20% | Original already capped; reverse uses actual redeemed. |
| Locked period | Cannot post CN **into** locked period; post in open period. |
| Wizard / KYC incomplete | Cannot post CN. |
| Concurrent last unit | Analogous remaining qty race. |
| Expired batch restock | Allowed (same batch); qty increases even if expiry past. |
| Banned SKU | Original could not have billed banned; no extra check except don’t create new SKUs. |

Additional:

- Restock expired batch: still same batch (FEFO later).
- Write-off of scheduled drug: register still reverses (drug left the legal sale); stock does not return to shelf.
- `post_sale_discount` with restock selected: **reject** `DESTINATION_INCOMPATIBLE` — price correction cannot restock.
- Original issued_without_irn: no IRN CN required.
- Round-off on CN independent of original round-off; books still get a round-off line.
- Khata over-repay: remaining receivable can go to 0; extra cash refund not auto; CN total ≤ original invoice remaining after prior CNs.

---

## 10. Open Questions / Assumptions

1. One refund method; no split; no UPI.
2. CN date default today; original locked month OK.
3. Pro-rata loyalty on partial return using `returned_total / original_invoice_total`.
4. Price correction (`post_sale_discount`) cannot restock.
5. Till shortfall does not block cash refund in v1.
6. Cancel on POS is this flow with all remaining qty pre-filled.
7. Sequence kind `credit_note` separate from bills.
8. Idempotency forever unique index.
9. No customer debit notes.
10. H1/X reverse uses original doctor snapshot.
