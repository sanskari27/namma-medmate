# Requirement Doc: Books, GSTN & e-invoice (`books-gst`)

**Slug:** `books-gst`  
**Module path:** `modules/books-gst/{ui,api,docs}`  
**Plan gate:** **Growth** (`₹1,499 + 18% GST`). Free still prints a GST tax invoice from POS; IRN, GSTR prepare, period/FY lock, and operational books start at Growth.  
**Surface:** Pharmacy Partner Console (English UI, i18n-ready).  
**Stack:** React + TypeScript AWS Lambdas. Persistence only through `libs/db-services`. UI talks to API only via `@namma-medmate/api-client`.  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §2.4, §3.23, §5, §8, §9, §10 (IRP/GSTN rows). Glossary: `docs/requirements/00-glossary.md`.  
**Personas:** Owner (lock, credentials consumption, FY close); Manager (journals, till close, 2B match, prepare — if granted); Pharmacist/Cashier do not open Books. CA does not use this module (see `ca-sharing`).  
**Canonical entities owned here:** `Journal` / `ChartOfAccount` (`account_id`), `Gstr2bMatch` (2B row + GRN).

---

## 1. Summary

`books-gst` is the operational general ledger for one pharmacy location. It is not a blank accounting suite. Domain events from POS, purchases, returns, khata, CRM loyalty, expenses, stock take, and the go-live wizard post **the same journal as the source document**. Trial balance, P&L, Balance Sheet, GSTR-1 / GSTR-2B / GSTR-3B preparation, and CA pack numbers all read that journal. There is no second ledger.

Chemist **prepares**. CA **files** on GSTN. This module never files a return. GSTN/IRP credentials are owned by `account-settings` (encrypted, Owner-only). This module **consumes** them through a secrets accessor, never logs them, and never puts them in a CA pack.

Free shops still issue a GST tax invoice from POS. Requesting IRN from IRP, pulling GSTR-2B, preparing GSTR-1 / GSTR-3B JSON, and locking periods are Growth.

---

## 2. Scope (in / out)

### In scope (v1)

- Default chart of accounts (COA) seeded per tenant+location; Owner may rename and add children.
- Double-entry auto-post for every listed source event (same event as the source document).
- Manual journals: wastage, damage, opening balances, adjustments.
- Period lock (calendar month) and financial-year (FY) lock, with FY opening-balance carry-forward.
- Pay distributor against AP (cash / bank / NEFT recorded locally).
- Day-end / till close (declared cash vs system cash; variance logged).
- Bank reconciliation of the **shop** Bank account (upload statement; match receipts/payments). SaaS Cashfree is excluded.
- Trial balance that must tie; P&L and Balance Sheet from the same COA.
- Place-of-supply GST split (CGST+SGST vs IGST) on journal lines.
- IRN request to IRP for eligible B2B bills; IRN + ACK QR consumed by POS PDF/thermal; credit-note cancel/amend of IRN.
- Pull GSTR-2B from GSTN; match to GRNs (`matched` / `mismatch` / `missing`); chemist marks ITC claim / unclaim.
- Prepare GSTR-1 JSON and GSTR-3B JSON from local books (and 2B ITC flags). Chemist does not file.
- Console banners + Owner WhatsApp on GSTN down, IRN reject, stale 2B (mandatory-path).
- Module contracts consumed by POS, stock-take, expenses, reports, CA sharing: `isPeriodLocked(date)`, `postJournal(event)`, `requestIrn(billDraft)`, `pullGstr2b`, `prepareGstr1`, `prepareGstr3b`.

### Out of scope (v1 — never implement in this module)

- Tally XML import/export.
- Payroll run, PF/ESI, payslips (Salary is a **manual expense** category only).
- Fixed assets, depreciation, cost centres, multi-currency, branches / extra GSTIN.
- Chemist filing on GSTN (no GSTR submit API).
- Storing, displaying, or logging GSTN/IRP credentials (owned by `account-settings`).
- Shop-floor UPI/Card/Cashfree GMV; UPI till line on day-end (do **not** show as working).
- SaaS invoices / Namma GST (Admin HQ `admin-finance`).
- Customer debit notes.
- TDS/TCS auto-withhold (profile flags live in `account-settings`; stub reports live in `reports`).
- Recomputing GMV or stock; those remain owned by POS / inventory.
- Opening-stock Excel/CSV parse (owned by `inventory`); this module only posts the books journal when a valuation is declared.
- CA share links and CA pack zip assembly (owned by `ca-sharing`); this module supplies prepared JSON and COA balances.
- POS charge UX, draft-hold UI, “issue without IRN” confirm (owned by `pos-billing`); this module owns the IRN call.

---

## 3. Dependencies

| Module                  | Why                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tenancy`               | `tenant_id` + `location_id` on every row and query.                                                                                                                      |
| `plan-gating`           | Growth gate on every console route and write API. Free POS still prints GST invoices without calling IRN/prepare.                                                        |
| `auth` / `manage-users` | Owner vs Manager permissions; Owner cannot be reduced.                                                                                                                   |
| `audit`                 | Append-only `AuditEvent` for journal post, lock, IRN, 2B pull, prepare, till close, bank rec, distributor payment. **Never** put secrets in the payload.                 |
| `whatsapp`              | Mandatory-path Owner templates for IRN/GSTN fail. This module requests a send; it does not talk to Meta.                                                                 |
| `account-settings`      | GSTIN, pharmacy state (place of supply), e-invoicing on/off, invoice prefix (for GSTR doc-issue), **secrets accessor** for GSTN/IRP credentials. TDS/TCS **flags** only. |
| `go-live-kyc`           | Opening-books step of the wizard emits the opening declaration this module journals.                                                                                     |
| `pos-billing`           | `BillPosted` / `BillDraftForIrn`; POS owns charge UX and draft-hold; books owns `requestIrn` and the sale journal.                                                       |
| `purchases`             | `GrnPosted` → inventory + GST input + AP.                                                                                                                                |
| `purchase-returns`      | Purchase / expiry return → reverse GRN path.                                                                                                                             |
| `returns`               | Customer `CreditNotePosted` → reverse bill path + loyalty reverse.                                                                                                       |
| `khata`                 | Khata sale Dr and cash repayment journal. Outstanding remains owned by `khata`; books posts the GL.                                                                      |
| `crm`                   | Loyalty lots; earn/redeem amounts on the bill event. Books posts loyalty liability; CRM owns lots.                                                                       |
| `inventory`             | Batch cost for COGS; opening-stock CSV; stock-take qty. Books never adjusts qty.                                                                                         |
| `stock-take`            | Calls `isPeriodLocked`; after post, books journals variance.                                                                                                             |
| `expenses`              | Expense rows call `postJournal`; GST input on eligible expenses.                                                                                                         |
| `distributors-reorder`  | AP outstanding display reads books AP (or is updated when distributor payment posts).                                                                                    |
| `reports`               | Reads journals / COA balances; must not keep a second ledger.                                                                                                            |
| `ca-sharing`            | Consumes `prepareGstr1` / `prepareGstr3b` JSON. Pack must not receive secrets.                                                                                           |

**Consumed secrets accessor (this module never persists the plaintext):**

```
account-settings.getGstnCredentials(tenantId, locationId) → GstnCredentials  // in-process, TTL-short
account-settings.getIrpCredentials(tenantId, locationId) → IrpCredentials
```

Credentials are used for the outbound GSTN/IRP HTTPS call, then discarded. They must not appear in logs, traces, AuditEvent before/after, error payloads, or CA pack files.

**Events this module consumes (at-least-once; post is idempotent on `source_type + source_id`):** `BillPosted`, `CreditNotePosted`, `GrnPosted`, `PurchaseReturnPosted`, `KhataRepaymentPosted`, `ExpensePosted`, `StockTakePosted`, `OpeningBooksDeclared`.

**Events this module emits:** `JournalPosted`, `PeriodLocked`, `FyLocked`, `IrnSucceeded`, `IrnRejected`, `IrnCancelled`, `Gstr2bPulled`, `Gstr1Prepared`, `Gstr3bPrepared`, `TillClosed`, `DistributorPaymentPosted`.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### 4.1 Plan, tenancy, identity

**FR-1:** The system shall require a current **Growth or Pro** plan for every `books-gst` console route and every write/prepare/IRN/2B API. Expired paid plan shall return `403 PLAN_REQUIRED` (`required_plan: "growth"`) and retain all posted journals.

**FR-2:** The system shall scope every query and mutation by `tenant_id` and `location_id`. The UI is one shop.

**FR-3:** The system shall allow **Owner** all books actions (COA edit, lock, FY lock, IRN retry visibility, 2B ITC, prepare, till close, bank rec, distributor pay, manual journal).

**FR-4:** The system shall allow **Manager** books actions only when `manage-users` has granted the Books / GST module. Manager shall not edit GSTN/IRP credentials (those screens are `account-settings`, Owner-only).

**FR-5:** The system shall not expose Books screens to Pharmacist or Cashier by default.

**FR-6:** The system shall keep Free POS GST tax-invoice print working **without** calling `requestIrn`, `pullGstr2b`, `prepareGstr1`, or `prepareGstr3b`.

### 4.2 Default chart of accounts (copied from catalogue — do not require the catalogue to implement)

Default COA control accounts (seeded on first Growth unlock or first opening-books journal, whichever is earlier). Owner may **rename** and **add children**. The system shall **not** allow delete of control accounts that auto-post.

| Group           | Control accounts (auto-post keys)                                                                                                                                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Assets**      | Cash in till (`cash_till`) · Bank (`bank`) · Khata receivable (`khata_recv`) · Inventory (`inventory`) · GST input CGST (`gst_in_cgst`) · GST input SGST (`gst_in_sgst`) · GST input IGST (`gst_in_igst`)                                                                                                       |
| **Liabilities** | AP distributors (`ap_distributors`) · GST output CGST (`gst_out_cgst`) · GST output SGST (`gst_out_sgst`) · GST output IGST (`gst_out_igst`) · Loyalty points payable (`loyalty_payable`) · Round-off (`round_off`)                                                                                             |
| **Equity**      | Owner capital (`owner_capital`) · Opening balances (`opening_balances`)                                                                                                                                                                                                                                         |
| **Income**      | Sales (`sales`)                                                                                                                                                                                                                                                                                                 |
| **Cost**        | COGS (`cogs`)                                                                                                                                                                                                                                                                                                   |
| **Expense**     | Salary — manual expense (`exp_salary`) · Rent (`exp_rent`) · Electricity (`exp_electricity`) · Telephone (`exp_telephone`) · Stationery (`exp_stationery`) · Repair (`exp_repair`) · Transport (`exp_transport`) · Marketing (`exp_marketing`) · Bank charges (`exp_bank_charges`) · Miscellaneous (`exp_misc`) |

**Seeded non-control child (expenses module):** Raw material (`exp_raw_material`) under Expense. It is in the expenses category list (§3.17) but is **not** a control account that auto-posts from POS/GRN. Owner may rename or, if unused and zero balance, delete it.

**FR-7:** The system shall seed the default COA above, plus `exp_raw_material`, exactly once per `tenant_id`+`location_id`, with stable `auto_post_key` values that never change when the Owner renames the display name.

**FR-8:** The system shall let the Owner rename any account’s display name without breaking auto-post (lookup is by `auto_post_key` / `account_id`, not by name).

**FR-9:** The system shall let the Owner add child accounts under a group or under a parent account (e.g. extra expense heads, extra bank accounts as children of Bank). Children of a control account may receive **manual** journals; auto-post of that control key still hits the control account unless a later spec says otherwise. v1 auto-post always hits the **control** account, not children.

**FR-10:** The system shall refuse `DELETE` of any account with `is_control = true` (`409 CONTROL_ACCOUNT_PROTECTED`).

**FR-11:** The system shall refuse `DELETE` of any account that has posted journal lines or a non-zero balance (`409 ACCOUNT_IN_USE`).

**FR-12:** The system shall not provide payroll, fixed-asset, or cost-centre account types.

### 4.3 Auto-post posting table (copied from catalogue)

The system shall post **the same event as the source document**. One source id → one balanced journal (plus the inventory/COGS pair on the same journal when applicable). Summary:

| Event                  | Posting (summary)                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Cash sale              | Dr Cash; Cr Sales; Cr GST output; Dr COGS / Cr Inventory                                          |
| Khata sale             | Dr Khata; same income/GST/COGS as cash                                                            |
| Khata repayment (cash) | Dr Cash; Cr Khata                                                                                 |
| Loyalty earn           | Cr Loyalty payable (points × ₹1); offset to sales contra/discount as one line on the bill journal |
| Loyalty redeem         | Dr Loyalty payable; reduces cash/khata Dr on the same bill                                        |
| Return / CN            | Reverse the original bill path (stock restock or Dr write-off); reverse loyalty lots              |
| GRN                    | Dr Inventory; Dr GST input; Cr AP (scheme qty cost 0)                                             |
| Purchase return        | Reverse GRN path                                                                                  |
| Expense                | Dr Expense (+ GST input if eligible); Cr Cash or Bank                                             |
| Stock take variance    | Inventory vs COGS/write-off per posted variance                                                   |
| Opening wizard         | Dr/Cr Cash, Khata, AP, Inventory as declared; Cr/Dr Opening balances                              |

**FR-13:** The system shall post each auto-journal in the **same unit of work** as acknowledging the source event (at-least-once consumer + idempotent upsert). A Bill that is posted shall not exist without its sale journal when the tenant is on Growth. If books post fails after the source commit, the system shall retry until success and surface a console banner `BOOKS_POST_PENDING` with the source document number; it shall not silently skip.

**FR-14:** The system shall make `postJournal` **idempotent** on `(tenant_id, location_id, source_type, source_id)` (and on an explicit `idempotency_key` when provided). A duplicate event shall return the existing journal, not a second posting.

**FR-15:** The system shall reject any journal whose sum(debit) ≠ sum(credit) at 2 decimal places (`422 UNBALANCED_JOURNAL`). Trial balance of posted journals must always tie.

**FR-16:** The system shall post money amounts in INR with **2 decimal places**. GST line tax follows POS: MRP is GST-inclusive; `taxable = SP × 100 / (100 + rate)`; `GST = SP − taxable`; split CGST+SGST or IGST from place of supply. Round-off of the invoice total to 2 decimal places shall post to `round_off` (debit or credit as required), never silently eaten.

### 4.4 Cash sale

**FR-17:** The system shall, on `BillPosted` with tender `cash`, post on **one** journal:

1. **Dr** `cash_till` = rounded invoice total collected (GST-inclusive after coupon, manual discount, loyalty redeem, plus round-off).
2. **Cr** `sales` = sum of line taxable amounts (after discounts; GST exclusive).
3. **Cr** `gst_out_cgst` and `gst_out_sgst` **or** `gst_out_igst` per FR-place-of-supply, equal to GST on those lines.
4. **Dr or Cr** `round_off` so the journal balances to the rounded total.
5. **Dr** `cogs` and **Cr** `inventory` = sum(batch cost × qty) for billed lines. Scheme/free qty on a **sale** is not a GRN scheme; COGS uses the batch’s stored cost.

**FR-18:** The system shall not post a cash-sale journal for a HeldCart. Hold never moves books.

**FR-19:** The system shall not post UPI, card, or split-tender sale journals in v1. Tender ∈ `{cash, khata}` only.

### 4.5 Khata sale

**FR-20:** The system shall, on `BillPosted` with tender `khata`, post the same income, GST output, round-off, and COGS/inventory lines as a cash sale, but **Dr** `khata_recv` instead of `cash_till` for the rounded total (after loyalty redeem).

**FR-21:** The system shall not maintain a second receivables ledger. Khata ageing remains in `khata`; this module only posts the GL.

### 4.6 Khata repayment (cash)

**FR-22:** The system shall, on `KhataRepaymentPosted` (v1 cash), post **Dr** `cash_till` **Cr** `khata_recv` for the repayment amount. No income, GST, or COGS on repayment.

**FR-23:** The system shall refuse a repayment journal that would credit `khata_recv` above that customer’s posted khata debit balance at GL level only as a warning if `khata` already validated; books trusts the source event amount. It shall still post exactly the event amount (source of truth is `khata`).

### 4.7 Loyalty earn and redeem (same bill journal)

**FR-24:** The system shall, when the bill event includes loyalty **earn**, add on the **same** bill journal: **Cr** `loyalty_payable` = points × ₹1, and **Dr** sales contra/discount (`sales` contra line, or a dedicated contra child of Sales if present; v1: one debit line against `sales` labelled `loyalty_earn_contra`) for the same amount. Earn is 1 point per ₹100 of net collected as computed by CRM/POS; books does not recompute points, it posts the rupee amount on the event.

**FR-25:** The system shall, when the bill event includes loyalty **redeem**, add on the **same** bill journal: **Dr** `loyalty_payable` = redeem rupees (1 point = ₹1), and **reduce** the cash or khata **Dr** by that same amount (so assets received + loyalty debit = sales + GST + round-off). Redeem never exceeds the event amount (POS already capped at 20% of payable).

**FR-26:** The system shall post earn and redeem as lines on the bill journal, not as separate journals.

**FR-27:** The system shall post ₹0 loyalty lines as omitted (no zero-amount lines).

### 4.8 Return / credit note

**FR-28:** The system shall, on `CreditNotePosted`, post a journal that **reverses the original bill path** in the **open** period (the CN document date), not by editing the original bill journal:

- Reverse Sales (Dr sales), reverse GST output (Dr gst_out_*), reverse round-off as needed.
- Credit the refund destination: **Cr** `cash_till` (cash refund) or **Cr** `khata_recv` (back to khata).
- **Restock:** **Dr** `inventory` **Cr** `cogs` at original line cost × returned qty.
- **Write-off:** **Dr** write-off (use `exp_misc` labelled stock write-off, or COGS if the event says write-off-to-cogs; v1: **Dr** `cogs` for sold-cost write-off of returned stock that is not restocked) and **do not** debit inventory. Inventory qty change is owned by `returns`/`inventory`.
- Reverse loyalty earn: **Dr** `loyalty_payable` for remaining earn rupees being clawed back; **Cr** sales contra.
- Reverse loyalty redeem: **Cr** `loyalty_payable` for redeem rupees restored; increase cash/khata credit (refund) accordingly as on the event.

**FR-29:** The system shall not delete or rewrite the original bill journal. Cancel of a bill is always a credit note.

**FR-30:** The system shall reverse only quantities/amounts on the CN event; it shall not reverse more than the original bill’s posted amounts (`422 CN_EXCEEDS_ORIGINAL` if the event is inconsistent — defensive check).

### 4.9 GRN (goods inward)

**FR-31:** The system shall, on `GrnPosted`, post **Dr** `inventory` = sum(qty × cost) where **scheme/free qty cost = 0** but qty still sits in inventory at zero cost; **Dr** `gst_in_cgst`/`gst_in_sgst` or `gst_in_igst` = input GST on the distributor invoice; **Cr** `ap_distributors` = invoice total (taxable + GST, matching the GRN).

**FR-32:** The system shall treat free/scheme quantity as stock with cost 0: it increases inventory units in `inventory` module but adds ₹0 to the inventory debit for those units.

**FR-33:** The system shall not post a GRN journal when the GRN is still a draft. Only `GrnPosted`.

### 4.10 Purchase return / expiry return

**FR-34:** The system shall, on `PurchaseReturnPosted`, reverse the GRN path for returned qty: **Cr** `inventory` (at the GRN cost of those units; scheme units cost 0), **Cr** GST input (reverse ITC on returned taxable qty), **Dr** `ap_distributors`. If the event says credit not yet received, still reduce AP (the debit note is the books event).

**FR-35:** The system shall not reverse more inventory value than remains on that GRN line (`422 RETURN_EXCEEDS_GRN` defensive).

### 4.11 Expense

**FR-36:** The system shall, on `ExpensePosted`, post **Dr** the mapped expense control account (see `expenses` category map) for **taxable** amount; if GST % > 0 and ITC eligible, **Dr** `gst_in_*` for the GST component; **Cr** `cash_till` or `bank` for amount inclusive of GST. If ITC is not eligible, the GST amount remains inside the expense debit (gross).

**FR-37:** The system shall treat v1 payment mode `upi` as **bank** (not Cashfree GMV, not till cash).

**FR-38:** The system shall reverse the expense journal in the open period when `expenses` deletes a row (source event `ExpenseDeleted`); it shall not edit the original journal if that period is locked — deletion of an expense in a locked period is refused by `isPeriodLocked` **before** delete (see `expenses`).

### 4.12 Stock take variance

**FR-39:** The system shall, on `StockTakePosted`, post **per variance line** (or one journal with many lines):

- Shortage (counted < system): **Cr** `inventory` at cost × qty delta; **Dr** `cogs` (operational shrink) unless the take flags write-off-to-misc, in which case **Dr** `exp_misc`.
- Overage (counted > system): **Dr** `inventory`; **Cr** `cogs` (or `exp_misc` if flagged).

**FR-40:** The system shall not post a stock-take journal for an unposted count sheet. Qty on batches is owned by `stock-take`/`inventory`; books posts value only.

### 4.13 Opening wizard

**FR-41:** The system shall, on `OpeningBooksDeclared`, post declared **Dr/Cr** `cash_till`, `khata_recv`, `ap_distributors`, `inventory` (and bank if declared) with the balancing **Cr/Dr** `opening_balances`. “Start at ₹0” skip shall post nothing (no zero journal).

**FR-42:** The system shall post at most one opening-books journal per location unless the Owner re-runs the wizard **before** any other books activity; after any subsequent journal, re-running the wizard shall not overwrite opening — further changes are manual adjustment journals (`409 OPENING_ALREADY_POSTED`).

**FR-43:** The system shall treat opening-stock Excel/CSV as **inventory** data. If the wizard/inventory pipeline supplies an inventory valuation, books shall Dr `inventory` Cr `opening_balances` for that valuation (idempotent on the opening stock import id). If valuation is zero, no inventory opening line.

### 4.14 Manual journals

**FR-44:** The system shall allow Owner/Manager to post a manual journal with value date, memo, and two or more lines (wastage, damage, opening balances, adjustments). Each line is an account + debit or credit. Sum of debits must equal sum of credits.

**FR-45:** The system shall support preset memo types: `wastage`, `damage`, `opening_adjustment`, `general_adjustment`. Wastage/damage that also move stock must be initiated from inventory/stock-take; a books-only wastage journal does **not** change batch qty (UI warning: “This does not change stock”).

**FR-46:** The system shall not allow a manual journal to use a deleted account or a missing `account_id`.

### 4.15 Period lock and FY lock

Financial year is **1 April – 31 March** of the pharmacy GSTIN jurisdiction (India). Period key for a month is `YYYY-MM`. FY key is `FY{start}-{endYY}` e.g. `FY2026-27` = 2026-04-01 through 2027-03-31.

**FR-47:** The system shall expose `isPeriodLocked(date)` as a synchronous contract returning `{ locked: boolean, period_key, fy_key, lock_kind: "month" | "fy" | null }`. A date is locked if its calendar month is locked **or** its FY is locked.

**FR-48:** The system shall let **Owner only** lock a calendar month. After lock, posted bills, GRNs, journals, stock takes, credit notes, expenses, khata repayments, distributor payments, and till closes with `value_date` in that month **cannot be edited or deleted**.

**FR-49:** The system shall let **Owner only** lock a FY. FY lock implies all months in that FY are locked. FY lock shall write an **opening-balance carry-forward** journal dated the first day of the next FY, copying closing balances of: `cash_till`, `bank`, `khata_recv`, `ap_distributors`, `inventory`, all GST input/output control accounts, `loyalty_payable`, `round_off`, `owner_capital`, `opening_balances` (P&L income/cost/expense close to equity / opening_balances per FR-51). The carry-forward journal’s `source_type` is `fy_carry`.

**FR-50:** The system shall refuse any `postJournal` (auto or manual) whose `value_date` falls in a locked month or locked FY (`423 PERIOD_LOCKED`). The source module must also call `isPeriodLocked` before posting the operational document.

**FR-51:** The system shall, on FY lock, close income (`sales`), cost (`cogs`), and expense accounts to equity: net P&L for the FY **Cr** (profit) or **Dr** (loss) `opening_balances` (or `owner_capital` if Owner has chosen capital as the close target; v1 default: `opening_balances`), and zero the P&L accounts for the new FY. Asset/liability/equity balances carry forward as opening in the next FY.

**FR-52:** The system shall allow new **reversing** documents (credit notes, reversing journals, purchase returns) **only** with a `value_date` in an **open** period. They must not rewrite locked journals.

**FR-53:** The system shall not allow unlocking a FY (`409 FY_LOCK_IRREVERSIBLE`).

**FR-54:** The system shall allow Owner to **unlock a month** only if that month’s FY is not locked (`409 MONTH_IN_LOCKED_FY`). Unlock is audited. (Assumption: month lock is reversible until FY lock; see §10.)

**FR-55:** The system shall refuse lock of a month that is in the future (`422 CANNOT_LOCK_FUTURE_MONTH`).

**FR-56:** The system shall record `locked_by`, `locked_at` on each lock and emit `AuditEvent` + `PeriodLocked` / `FyLocked`.

### 4.16 Pay distributor

**FR-57:** The system shall record a payment against AP: **Dr** `ap_distributors` **Cr** `cash_till` or `bank` for the amount. v1 modes: `cash` | `bank` | `neft`. `neft` posts to `bank`. Recorded **locally** — not a payment-processor payout.

**FR-58:** The system shall update outstanding payable used by Distributors (Growth `distributors-reorder`) by the posted AP balance after the payment (emit `DistributorPaymentPosted` with `distributor_id`, `amount`, `journal_id`).

**FR-59:** The system shall optionally allocate the payment to one or more GRNs (FIFO default if omitted). Allocation shall not exceed remaining AP on those GRNs.

### 4.17 Day-end / till close

**FR-60:** The system shall compute **system cash** = opening till (from last close or opening books) + cash-sale Drs + khata-repayment Drs + other cash Drs − cash refunds − cash expenses − cash distributor payments − previous declared closes, for the business date (shop local timezone `Asia/Kolkata`).

**FR-61:** The system shall accept **declared cash** from the closer, compute `variance = declared − system`, store the close, and log an `AuditEvent`. If variance ≠ 0, post **Dr/Cr** `cash_till` to match declared and the other side to `exp_misc` (till variance). Zero variance posts no variance journal (close record still stored).

**FR-62:** The system shall **not** show a UPI till line as working in v1. No UPI/Card/Cashfree GMV column. (When Cashfree GMV ships, a later spec adds the line.)

**FR-63:** The system shall allow one posted close per business date per location; a second close is a correction only if the date’s period is open (`409 TILL_ALREADY_CLOSED` unless `replace=true` and period open, which reverses the previous variance journal and posts the new one).

### 4.18 Bank reconciliation

**FR-64:** The system shall accept an upload of a bank statement (CSV or XLSX) against the `bank` control account (or a child bank account). Columns: `date`, `description`, `amount` (signed; credit positive for money in), optional `reference`.

**FR-65:** The system shall list unmatched statement lines and unmatched books lines (journals touching `bank`) in the selected period and allow match (1:1 or 1:many that sums equal). Match stores `bank_match_id`.

**FR-66:** The system shall **exclude** Namma SaaS Cashfree invoices and any platform settlement from shop bank rec. Those are not shop GMV and must never auto-match.

**FR-67:** The system shall not auto-create books payments from unmatched statement lines in v1 (Owner posts a manual journal or distributor payment, then matches).

### 4.19 Trial balance, P&L, Balance Sheet

**FR-68:** The system shall produce a **trial balance** for a period from posted journal lines only: each COA account, opening (if FY/period), debit total, credit total, closing. **Sum of closing debits must equal sum of closing credits.** If they do not, the API returns `500 TRIAL_BALANCE_BROKEN` and a console banner; this is a product invariant failure.

**FR-69:** The system shall produce **Profit and Loss** from the same COA: Income (`sales` net of loyalty contra), minus Cost (`cogs`), minus Expense heads. Gross profit = sales net − COGS. Net profit = gross − expenses ± round-off/other P&L accounts.

**FR-70:** The system shall produce **Balance Sheet** from the same COA: Assets (cash, bank, khata, inventory, GST input), Liabilities (AP, GST output, loyalty, round-off if credit), Equity (capital, opening balances, current-year P&L). Assets must equal liabilities + equity.

**FR-71:** The system shall not recompute sales from bills for these three statements. Bills are the source event; journals are the reporting source.

### 4.20 Place of supply and GST split

**FR-72:** The system shall split GST as: **same state** as the pharmacy GSTIN state → half CGST + half SGST on output (sales/CN) and input (GRN/expense) as applicable. **Other state + customer GSTIN** → IGST. Kiosk and typical counter are intra-state B2C (CGST+SGST).

**FR-73:** The system shall never request IRN for B2C (walk-in / no GSTIN on the bill). `requestIrn` shall return `skipped: true, reason: "B2C"` without calling IRP.

**FR-74:** The system shall request IRN for B2B (customer GSTIN on the bill) **only when** e-invoicing is enabled on that pharmacy GSTIN in `account-settings`. If e-invoicing is off, `requestIrn` returns `skipped: true, reason: "EINVOICING_OFF"` and POS may post the GST invoice without IRN.

### 4.21 IRN / IRP (books owns the call; POS owns charge UX)

**FR-75:** The system shall expose `requestIrn(billDraft)` to POS. The draft includes invoice number (reserved), date, seller GSTIN/state, buyer GSTIN/name/address when B2B, lines (taxable, rate, GST, HSN, qty), values (taxable, CGST, SGST, IGST, round-off, total). Books builds the IRP payload, calls IRP using `getIrpCredentials`, and returns `{ irn, ack_no, ack_dt, signed_qr }` on success.

**FR-76:** The system shall make `requestIrn` **idempotent** on `client_charge_id` / `irn_idempotency_key`. A retry shall not create a second IRN for the same draft.

**FR-77:** The system shall, on IRP success, persist `IrnRecord` (irn, ack, signed QR, bill identity) and emit `IrnSucceeded`. POS prints IRN + ACK QR on PDF and thermal when Invoice Settings “print IRN / ACK when present” is on (POS/`account-settings` render; books supplies the fields).

**FR-78:** The system shall, on IRP down/timeout, return `503 IRP_UNAVAILABLE` **without** a silent success. POS holds the bill as **draft** (stock must not deduct — POS invariant). Books shall not post a sale journal until the bill is posted.

**FR-79:** The system shall, on IRN **reject**, return `422 IRN_REJECTED` with `irp_error` **verbatim** from IRP (no paraphrase). Persist the reject. Emit `IrnRejected`. Notify Owner WhatsApp with **bill number** and show a console banner until acknowledged (FR-90).

**FR-80:** The system shall support Owner “issue without IRN” only as a **logged POS action** that then posts the bill; books stores `IrnRecord.status = issued_without_irn` when POS includes that flag on `BillPosted`. Default remains: do not deduct / do not post on IRN failure.

**FR-81:** The system shall, for a credit note against a bill that has an IRN:

- If the original IRN is still cancellable per IRP rules and the CN is a full reverse of an un-settled invoice in the allowed window: call IRP **cancel** with reason, store cancelled, emit `IrnCancelled`.
- Otherwise: request a **credit-note IRN** referencing the original IRN (`ack_no` / `irn` on the CN payload) and store the CN IRN for PDF/thermal.

**FR-82:** The system shall not call IRP for B2C credit notes.

**FR-83:** The system shall never log IRP credentials, tokens, or full signed payloads beyond `irn`, `ack_no`, `ack_dt`, and reject text.

### 4.22 GSTR-2B pull and match

**FR-84:** The system shall expose `pullGstr2b(period)` (period = `MMYYYY` or `YYYY-MM`) which uses `getGstnCredentials`, pulls GSTR-2B, stores invoice rows (supplier GSTIN, invoice no, date, taxable, CGST/SGST/IGST, invoice type), and sets `stale = false`, `pulled_at = now`.

**FR-85:** The system shall match 2B rows to GRNs on supplier GSTIN + distributor invoice number + FY. Result per pair:

- `matched` — invoice no + GSTIN match and taxable and GST components equal (2 dp).
- `mismatch` — invoice no + GSTIN match but date and/or taxable and/or GST differ. Store `mismatch_fields`.
- `missing_in_books` — 2B row with no GRN.
- `missing_in_2b` — posted GRN with no 2B row.

**FR-86:** The system shall let the chemist mark each match row ITC `claim` or `unclaim` (or leave unset). CA still files. Unset is allowed; GSTR-3B prepare uses **claimed** rows only for ITC, and local GRN GST input for books already posted (3B ITC section follows chemist marks when present; if none marked, prepare uses local input GST and flags `itc_unmarked: true` on the prepare).

**FR-87:** The system shall, on GSTN pull **fail** (down, 4xx/5xx, timeout, missing credentials): **not** block prepare. Set/keep `stale = true`. Prepare GSTR-1 / GSTR-3B from **local books**. Console banner “GSTR-2B is stale” until a successful pull. Owner WhatsApp mandatory-path (FR-90).

**FR-88:** The system shall never persist GSTN passwords in the 2B snapshot. Store tax invoice rows only.

### 4.23 GSTR-1 and GSTR-3B prepare (chemist does not file)

**FR-89:** The system shall expose `prepareGstr1(period)` producing GSTN-upload-compatible **JSON** from local books/bills for a tax period (`MMYYYY`). Populate at least: `gstin`, `fp`, `b2b` (IRN bills with buyer GSTIN), `b2cs` (B2C summary by rate/place of supply), `cdnr` / `cdnur` (credit notes B2B/B2C), `hsn` (HSN-wise summary), `doc_issue` (invoice and CN document ranges from Invoice Settings prefixes). v1 shall not populate export/SEZ/deemed-export sections (always empty arrays). The chemist downloads JSON; this module shall **not** call GSTN save/file/submit.

**FR-90:** The system shall expose `prepareGstr3b(period)` producing GSTN-upload-compatible **JSON** (`gstin`, `ret_period`, outward supplies from output GST, inward/ITC from claimed 2B + local expense/GRN input as documented in the prepare footer, net payable). Chemist does not file.

**FR-91:** The system shall make prepare operations idempotent for the same period+source snapshot: re-prepare replaces the stored JSON and bumps `generated_at`. Prepare is allowed when 2B is stale (banner remains).

**FR-92:** The system shall refuse prepare if Growth is not active (`403 PLAN_REQUIRED`).

**FR-93:** The system shall not auto-withhold TDS/TCS in any GSTR JSON. TDS/TCS sections are empty unless a later spec fills them. Profile flags in `account-settings` do not change books postings in v1.

### 4.24 Failures, WhatsApp, banners (mandatory-path)

**FR-94:** The system shall, on GSTN down, IRN reject, or IRP down after a user-initiated request, request WhatsApp to the **Owner** via `whatsapp` with shop name and **bill number** (or “GSTR-2B {period}” when no bill). Template: IRN/GSTN fail. Retry policy is owned by `whatsapp` (3× backoff).

**FR-95:** The system shall treat Owner GSTN/IRN WhatsApp as **mandatory-path**: if the send does not succeed, the console banner stays until the Owner **acknowledges** it. A successful WhatsApp does not auto-dismiss the banner; Owner must ack. Banner copy includes bill number and, for IRN reject, **verbatim** IRP reason.

**FR-96:** The system shall show a persistent banner while GSTR-2B is stale, including last successful pull timestamp if any.

### 4.25 Exposed contracts (other modules)

**FR-97:** The system shall expose `isPeriodLocked(date)`, `postJournal(event)`, `requestIrn(billDraft)`, `pullGstr2b(period)`, `prepareGstr1(period)`, `prepareGstr3b(period)` as versioned internal HTTP APIs (and typed client in `@namma-medmate/api-client` / internal SDK). POS owns charge UX and draft-hold on IRP down; books owns the IRN HTTP call.

**FR-98:** The system shall not accept `postJournal` from the browser for source types owned by other modules (`bill`, `credit_note`, `grn`, etc.). Those are internal-only. Browser may post `source_type: manual`, till close, distributor payment, and bank-match.

**FR-99:** The system shall emit `AuditEvent` for: journal post (manual and auto), period/FY lock/unlock, IRN request success/reject/cancel/issue-without-IRN, 2B pull, ITC mark, GSTR prepare, till close, bank statement upload, match, distributor payment. Actor, role, tenant, timestamp, before/after where money moved. No secrets.

**FR-100:** The system shall round invoice totals to 2 decimal places and post the delta to `round_off` on the bill journal (debit if total rounded down vs unrounded sum, credit if rounded up — such that cash/khata Dr equals the rounded total the customer pays).

---

## 5. Non-Functional Requirements

**NFR-1:** Charge-adjacent IRN request p99 < 8s excluding IRP; fail visible on IRP timeout (≤ 15s client timeout). No silent stock move (POS).

**NFR-2:** `postJournal` and `requestIrn` are idempotent. GSTN/IRP calls are retried at most 3 times with backoff on 502/503/timeout; 4xx IRN reject is not retried.

**NFR-3:** GSTN/IRP credentials never in logs, APM, AuditEvent, error `details`, or CA pack. Secrets accessor usage is in-memory only.

**NFR-4:** Every books API includes `location_id`. English UI; i18n-ready keys for lock, IRN, 2B, banners.

**NFR-5:** Journals are append-only in a locked period. Corrections are reversing documents in an open period.

**NFR-6:** Trial balance tie is an invariant. Broken TB is a P0 (`500 TRIAL_BALANCE_BROKEN` + banner), not a rounded-away difference.

**NFR-7:** Module layout `modules/books-gst/{ui,api,docs}`. API never imports UI. Persistence only `libs/db-services`.

**NFR-8:** Concurrent last-unit stock is not this module’s problem; concurrent journal insert for the same `source_id` is unique-constrained.

**NFR-9:** WhatsApp is the only Owner ping. No SMS fallback.

**NFR-10:** Reliability: IRP/GSTN timeouts fail visible. At-least-once event consumers with idempotent upsert.

---

## 6. Data Model / Entities

Tenant + `location_id` on every table unless noted.

### 6.1 `ChartOfAccount`

| Field                      | Type    | Notes                                                                 |
| -------------------------- | ------- | --------------------------------------------------------------------- |
| `account_id`               | uuid    | PK                                                                    |
| `tenant_id`, `location_id` | uuid    |                                                                       |
| `code`                     | string  | Unique per location; stable                                           |
| `name`                     | string  | Owner-renameable                                                      |
| `group`                    | enum    | `asset` \| `liability` \| `equity` \| `income` \| `cost` \| `expense` |
| `parent_account_id`        | uuid?   |                                                                       |
| `is_control`               | boolean | Delete forbidden if true                                              |
| `auto_post_key`            | string? | See §4.2; unique when set                                             |
| `is_active`                | boolean |                                                                       |

### 6.2 `Journal`

| Field                    | Type        | Notes                                                                                                                                                                                                       |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journal_id`             | uuid        | PK                                                                                                                                                                                                          |
| `journal_no`             | string      | Unique per location per FY                                                                                                                                                                                  |
| `fy_key`                 | string      | `FY2026-27`                                                                                                                                                                                                 |
| `value_date`             | date        | Determines period lock                                                                                                                                                                                      |
| `posted_at`              | timestamptz |                                                                                                                                                                                                             |
| `source_type`            | enum        | `bill` \| `credit_note` \| `grn` \| `purchase_return` \| `expense` \| `expense_delete` \| `stock_take` \| `khata_repayment` \| `distributor_payment` \| `till_close` \| `opening` \| `manual` \| `fy_carry` |
| `source_id`              | string      | Unique with source_type per location                                                                                                                                                                        |
| `idempotency_key`        | string      | Unique per location                                                                                                                                                                                         |
| `memo`                   | string      |                                                                                                                                                                                                             |
| `manual_type`            | enum?       | `wastage` \| `damage` \| `opening_adjustment` \| `general_adjustment`                                                                                                                                       |
| `actor_user_id`          | uuid        |                                                                                                                                                                                                             |
| `reversed_by_journal_id` | uuid?       |                                                                                                                                                                                                             |

Unique: `(tenant_id, location_id, source_type, source_id)`.

### 6.3 `JournalLine`

| Field           | Type    | Notes                                |
| --------------- | ------- | ------------------------------------ |
| `line_id`       | uuid    |                                      |
| `journal_id`    | uuid    |                                      |
| `account_id`    | uuid    |                                      |
| `debit`         | money   | ≥ 0                                  |
| `credit`        | money   | ≥ 0; exactly one of debit/credit > 0 |
| `gst_component` | enum?   | `cgst` \| `sgst` \| `igst`           |
| `party_type`    | enum?   | `customer` \| `distributor`          |
| `party_id`      | uuid?   |                                      |
| `note`          | string? | e.g. `loyalty_earn_contra`           |

### 6.4 `PeriodLock`

| Field                        | Type   | Notes                       |
| ---------------------------- | ------ | --------------------------- |
| `lock_id`                    | uuid   |                             |
| `kind`                       | enum   | `month` \| `fy`             |
| `period_key`                 | string | `2026-04` or `FY2026-27`    |
| `locked_at`, `locked_by`     |        |                             |
| `unlocked_at`, `unlocked_by` |        | month only; FY null forever |
| `carry_forward_journal_id`   | uuid?  | FY only                     |

### 6.5 `TillClose`

| Field                                      | Type  | Notes                           |
| ------------------------------------------ | ----- | ------------------------------- |
| `close_id`                                 | uuid  |                                 |
| `business_date`                            | date  | Unique per location when posted |
| `system_cash`, `declared_cash`, `variance` | money |                                 |
| `journal_id`                               | uuid? | variance journal                |
| `actor_user_id`                            | uuid  |                                 |
| **No** `upi_declared` in v1                |       |                                 |

### 6.6 `DistributorPayment`

| Field            | Type                   | Notes                      |
| ---------------- | ---------------------- | -------------------------- |
| `payment_id`     | uuid                   |                            |
| `distributor_id` | uuid                   |                            |
| `amount`         | money                  |                            |
| `mode`           | enum                   | `cash` \| `bank` \| `neft` |
| `value_date`     | date                   |                            |
| `journal_id`     | uuid                   |                            |
| `allocations`    | `{ grn_id, amount }[]` |                            |

### 6.7 `BankStatement` / `BankStatementLine` / `BankMatch`

Statement header: upload filename, `account_id`, uploaded_by, uploaded_at.  
Line: date, description, amount, reference, `matched` boolean.  
Match: statement_line_ids[], journal_line_ids[], amount.

### 6.8 `IrnRecord`

| Field                                  | Type    | Notes                                                                                                                      |
| -------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `irn_id`                               | uuid    |                                                                                                                            |
| `document_type`                        | enum    | `bill` \| `credit_note`                                                                                                    |
| `document_id`                          | string  | bill_id or cn_id                                                                                                           |
| `invoice_no`                           | string  | for WhatsApp / banner                                                                                                      |
| `client_charge_id`                     | string  | idempotency                                                                                                                |
| `irn`, `ack_no`, `ack_dt`, `signed_qr` | string? |                                                                                                                            |
| `status`                               | enum    | `requested` \| `success` \| `rejected` \| `cancelled` \| `issued_without_irn` \| `skipped_b2c` \| `skipped_einvoicing_off` |
| `irp_error`                            | string? | **verbatim**                                                                                                               |
| **No credential fields**               |         |                                                                                                                            |

### 6.9 `Gstr2bPull` / `Gstr2bMatch`

Pull: `period_key`, `pulled_at`, `stale` boolean, `error` string?.  
Match: 2B invoice fields, `grn_id?`, `status` (`matched` \| `mismatch` \| `missing_in_books` \| `missing_in_2b`), `mismatch_fields[]`, `itc_mark` (`claim` \| `unclaim` \| `unset`).

### 6.10 `GstrPrepare`

| Field          | Type        | Notes                       |
| -------------- | ----------- | --------------------------- |
| `kind`         | enum        | `gstr1` \| `gstr3b`         |
| `period_key`   | string      |                             |
| `json`         | jsonb       | GSTN-shaped; **no secrets** |
| `generated_at` | timestamptz |                             |
| `two_b_stale`  | boolean     |                             |
| `itc_unmarked` | boolean     | 3B only                     |

### 6.11 `BooksBanner`

`kind`: `irn_rejected` \| `irp_unavailable` \| `gstn_down` \| `two_b_stale` \| `books_post_pending`.  
`bill_no?`, `message`, `irp_error?`, `acknowledged_at?`, `acknowledged_by?`.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/api/v1/books`. All authenticated console APIs: `Authorization: Bearer`, header `X-Location-Id`. Success: `{ "success": true, "data": ... }`. Error: `{ "success": false, "error": { "code", "message", "details" } }`.

Internal: `/internal/v1/books/*` with service auth. Same JSON envelopes.

### 7.1 Internal contracts

#### `POST /internal/v1/books/period-locked` — `isPeriodLocked`

Request:

```json
{
  "tenant_id": "uuid",
  "location_id": "uuid",
  "date": "2026-08-15"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "locked": false,
    "period_key": "2026-08",
    "fy_key": "FY2026-27",
    "lock_kind": null
  }
}
```

When locked: `"locked": true, "lock_kind": "month"` or `"fy"`.

#### `POST /internal/v1/books/journals` — `postJournal`

Request:

```json
{
  "tenant_id": "uuid",
  "location_id": "uuid",
  "idempotency_key": "bill:uuid",
  "source_type": "bill",
  "source_id": "uuid",
  "value_date": "2026-08-31",
  "actor_user_id": "uuid",
  "event": {
    "kind": "cash_sale",
    "bill_id": "uuid",
    "invoice_no": "INV-26-000123",
    "tender": "cash",
    "rounded_total": 118.0,
    "taxable": 100.0,
    "gst": { "cgst": 9.0, "sgst": 9.0, "igst": 0 },
    "round_off": 0.0,
    "cogs": 70.0,
    "loyalty_earn_rupees": 1.0,
    "loyalty_redeem_rupees": 0,
    "place_of_supply": "INTRA"
  }
}
```

`event.kind` ∈ `cash_sale` | `khata_sale` | `khata_repayment` | `credit_note` | `grn` | `purchase_return` | `expense` | `expense_delete` | `stock_take` | `opening` | `fy_carry` (system).

Response `201` / idempotent `200`: `{ "journal_id", "journal_no", "debits", "credits" }`.  
Errors: `423 PERIOD_LOCKED`, `422 UNBALANCED_JOURNAL`, `409 DUPLICATE` (if idempotency conflicts with different body).

#### `POST /internal/v1/books/irn/request` — `requestIrn(billDraft)`

Request:

```json
{
  "tenant_id": "uuid",
  "location_id": "uuid",
  "client_charge_id": "uuid",
  "bill_draft": {
    "invoice_no": "INV-26-000124",
    "invoice_date": "2026-08-31",
    "buyer_gstin": "29ABCDE1234F1Z5",
    "buyer_name": "Clinic Pvt Ltd",
    "buyer_addr": { "line1": "…", "state_code": "29", "pincode": "560001" },
    "lines": [
      {
        "sku_id": "uuid",
        "hsn": "3004",
        "qty": 2,
        "taxable": 100.0,
        "gst_rate": 12,
        "cgst": 6.0,
        "sgst": 6.0,
        "igst": 0
      }
    ],
    "taxable": 100.0,
    "cgst": 6.0,
    "sgst": 6.0,
    "igst": 0,
    "round_off": 0,
    "total": 112.0
  }
}
```

Success `200`:

```json
{
  "success": true,
  "data": {
    "skipped": false,
    "status": "success",
    "irn": "a1b2…",
    "ack_no": "12123",
    "ack_dt": "2026-08-31T16:01:02+05:30",
    "signed_qr": "eyJ…"
  }
}
```

Skip B2C: `"skipped": true, "reason": "B2C", "status": "skipped_b2c"`.  
Reject: `422 IRN_REJECTED` `{ "irp_error": "<verbatim IRP string>", "invoice_no": "INV-26-000124" }`.  
IRP down: `503 IRP_UNAVAILABLE`. Missing secrets: `409 IRP_CREDENTIALS_MISSING`.

#### `POST /internal/v1/books/gstr/2b/pull` — `pullGstr2b`

```json
{ "tenant_id": "uuid", "location_id": "uuid", "period": "082026" }
```

`200`: `{ "pull_id", "period", "stale": false, "row_count": 12, "matched": 9, "mismatch": 1, "missing_in_books": 1, "missing_in_2b": 1 }`.  
GSTN fail: `200` with `"stale": true` **or** `503 GSTN_UNAVAILABLE` plus banner/WhatsApp; prepare still allowed. Product behaviour: fail visible, 2B marked stale, prepare from local books.

#### `POST /internal/v1/books/gstr/1/prepare` — `prepareGstr1`

```json
{ "tenant_id": "uuid", "location_id": "uuid", "period": "082026" }
```

`200`: `{ "prepare_id", "period", "two_b_stale": false, "json": { "gstin": "29…", "fp": "082026", "b2b": [], "b2cs": [], "cdnr": [], "cdnur": [], "hsn": { "data": [] }, "doc_issue": { "doc_det": [] } } }`.

#### `POST /internal/v1/books/gstr/3b/prepare` — `prepareGstr3b`

Same request shape. `json` includes `gstin`, `ret_period`, outward taxable/GST, ITC (claimed), net payable. `"itc_unmarked": true` if chemist has not marked ITC.

### 7.2 Console REST

| Method   | Path                                         | Purpose                                                      |
| -------- | -------------------------------------------- | ------------------------------------------------------------ |
| `GET`    | `/api/v1/books/coa`                          | Tree of accounts                                             |
| `PATCH`  | `/api/v1/books/coa/accounts/{accountId}`     | Rename                                                       |
| `POST`   | `/api/v1/books/coa/accounts`                 | Add child `{ parent_account_id?, group, name }`              |
| `DELETE` | `/api/v1/books/coa/accounts/{accountId}`     | Non-control, unused only                                     |
| `GET`    | `/api/v1/books/periods`                      | Locks + current FY                                           |
| `POST`   | `/api/v1/books/periods/lock`                 | Owner `{ kind, period_key }`                                 |
| `POST`   | `/api/v1/books/periods/unlock`               | Owner month only `{ period_key }`                            |
| `GET`    | `/api/v1/books/journals`                     | Filter `from,to,source_type,q`                               |
| `GET`    | `/api/v1/books/journals/{journalId}`         | Lines                                                        |
| `POST`   | `/api/v1/books/journals`                     | Manual only                                                  |
| `GET`    | `/api/v1/books/trial-balance?period_kind&…`  | TB                                                           |
| `GET`    | `/api/v1/books/profit-and-loss?…`            | P&L                                                          |
| `GET`    | `/api/v1/books/balance-sheet?…`              | BS                                                           |
| `POST`   | `/api/v1/books/distributor-payments`         | `{ distributor_id, amount, mode, value_date, allocations? }` |
| `GET`    | `/api/v1/books/distributor-payments`         | List                                                         |
| `POST`   | `/api/v1/books/till-close`                   | `{ business_date, declared_cash, replace? }`                 |
| `GET`    | `/api/v1/books/till-close?from&to`           | List                                                         |
| `POST`   | `/api/v1/books/bank-statements`              | multipart file + `account_id`                                |
| `GET`    | `/api/v1/books/bank-statements/{id}`         | Lines + match status                                         |
| `POST`   | `/api/v1/books/bank-statements/{id}/matches` | `{ statement_line_ids, journal_line_ids }`                   |
| `POST`   | `/api/v1/books/irn/{documentId}/cancel`      | Owner, within IRP window                                     |
| `GET`    | `/api/v1/books/gstr/2b?period=`              | Pull meta + matches                                          |
| `POST`   | `/api/v1/books/gstr/2b/pull`                 | Owner/Manager                                                |
| `PATCH`  | `/api/v1/books/gstr/2b/matches/{matchId}`    | `{ itc_mark: "claim" \| "unclaim" }`                         |
| `POST`   | `/api/v1/books/gstr/1/prepare`               | `{ period }`                                                 |
| `GET`    | `/api/v1/books/gstr/1/{period}`              | Stored JSON                                                  |
| `GET`    | `/api/v1/books/gstr/1/{period}/download`     | `application/json` attachment                                |
| `POST`   | `/api/v1/books/gstr/3b/prepare`              | `{ period }`                                                 |
| `GET`    | `/api/v1/books/gstr/3b/{period}`             | Stored JSON                                                  |
| `GET`    | `/api/v1/books/gstr/3b/{period}/download`    | attachment                                                   |
| `GET`    | `/api/v1/books/banners`                      | Unacknowledged                                               |
| `POST`   | `/api/v1/books/banners/{bannerId}/ack`       | Owner                                                        |

**Manual journal body:**

```json
{
  "value_date": "2026-08-31",
  "memo": "Wastage — broken syrups",
  "manual_type": "wastage",
  "lines": [
    { "account_id": "uuid-cogs", "debit": 250.0, "credit": 0, "note": "wastage" },
    { "account_id": "uuid-inv", "debit": 0, "credit": 250.0, "note": "wastage" }
  ]
}
```

**Lock body:** `{ "kind": "month", "period_key": "2026-07" }` or `{ "kind": "fy", "period_key": "FY2025-26" }`.

**Trial balance row:** `{ "account_id", "code", "name", "group", "opening_debit", "opening_credit", "period_debit", "period_credit", "closing_debit", "closing_credit" }` plus `"totals"` that must tie.

### 7.3 UI (Pharmacy Partner Console — Growth)

Sidebar **Business → Books / GST** (name may be “Books”). Tabs:

1. **Overview** — TB tie pill, net GST payable (output − claimed input), cash till vs last close, unacked banners.
2. **Chart of accounts** — tree; rename; add child; delete disabled on control.
3. **Journals / Daybook** — list + manual journal.
4. **GST** — 2B match table (matched/mismatch/missing), ITC claim/unclaim, Prepare GSTR-1, Prepare GSTR-3B, download JSON. Stale 2B banner.
5. **e-Invoice** — recent IRN success/reject (read-only; POS owns charge). Verbatim reject text.
6. **Pay distributors** — amount, mode cash/bank/NEFT, date.
7. **Till close** — system cash, declared cash, variance. No UPI line.
8. **Bank rec** — upload, match. Copy: “SaaS fees are not in this reconciliation.”
9. **Period lock** — Owner: lock month, lock FY, list locks. Copy: reversals only in open period.

Paywall: lock icon + Growth price if plan is Free/Starter.

### 7.4 Events (payloads — no secrets)

`JournalPosted`: `{ journal_id, source_type, source_id, value_date, debit_total }`.  
`PeriodLocked` / `FyLocked`: `{ kind, period_key }`.  
`IrnRejected`: `{ invoice_no, irp_error }` — no credentials.  
`Gstr2bPulled`: `{ period, stale, row_count }`.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Cash sale posts GL**  
Given a Growth pharmacy and a posted cash bill totalling ₹118 (taxable 100, CGST 9, SGST 9, COGS 70)  
When `BillPosted` is consumed  
Then one journal exists with Dr Cash 118, Cr Sales 100, Cr GST out CGST 9, Cr GST out SGST 9, Dr COGS 70, Cr Inventory 70, and the trial balance ties.

**US-2 Khata sale**  
Given a named-customer khata bill for the same amounts  
When posted  
Then Dr Khata 118 instead of Cash; income/GST/COGS identical to cash.

**US-3 Khata repayment**  
Given an outstanding khata and a ₹500 cash repayment event  
When posted  
Then Dr Cash 500, Cr Khata 500, no GST lines.

**US-4 Loyalty earn + redeem on one bill**  
Given earn ₹1 and redeem ₹10 on a cash bill with rounded payable after redeem ₹108  
When posted  
Then Cr Loyalty payable 1 and Dr sales contra 1; Dr Loyalty payable 10; Dr Cash 108; income/GST as on the event; one journal.

**US-5 Credit note restock**  
Given a return of a cash bill with destination Restock  
When CN posts in an open month  
Then original bill journal is unchanged; a new journal reverses sales/GST/cash/COGS/inventory; loyalty lots reverse as on the event.

**US-6 Credit note write-off**  
Given destination Write off  
When CN posts  
Then inventory is not debited; COGS (write-off) is debited for cost; qty write-off remains inventory module.

**US-7 GRN scheme qty**  
Given a GRN with 10 paid @ ₹50 and 2 scheme @ cost 0, GST 12% on paid  
When posted  
Then Dr Inventory 500, Dr GST input as on GRN, Cr AP = GRN total; scheme units do not add inventory value.

**US-8 Purchase return**  
Given a purchase return of 2 paid units  
When posted  
Then GRN path reverses for those units (Cr Inventory, Cr GST input, Dr AP).

**US-9 Expense with ITC**  
Given rent ₹11,800 incl. 18% GST, paid bank, ITC eligible  
When expense posts  
Then Dr Rent 10,000, Dr GST in CGST 900, Dr GST in SGST 900, Cr Bank 11,800.

**US-10 Expense UPI**  
Given payment mode UPI  
When posted  
Then credit is `bank`, not cash till, not Cashfree.

**US-11 Stock take shortage**  
Given posted shortage cost ₹200  
When `StockTakePosted`  
Then Cr Inventory 200, Dr COGS 200.

**US-12 Opening skip ₹0**  
Given Owner chooses “Start at ₹0”  
When wizard completes  
Then no opening journal.

**US-13 Opening declared**  
Given cash 5,000, inventory 80,000, AP 20,000  
When `OpeningBooksDeclared`  
Then Dr Cash 5,000, Dr Inventory 80,000, Cr AP 20,000, Cr Opening balances 65,000 (balanced).

**US-14 Manual journal locked period**  
Given July 2026 is locked  
When staff posts a wastage journal dated 15 Jul 2026  
Then `423 PERIOD_LOCKED`; no journal row.

**US-15 Reversal in open period**  
Given July locked and August open  
When Owner posts a reversing adjustment dated 1 Aug  
Then it is accepted; July journals unchanged.

**US-16 FY lock carry-forward**  
Given FY2025-26 close with cash 10,000, bank 40,000, khata 5,000, AP 8,000, inventory 90,000, GST nets, loyalty 200, equity as posted  
When Owner locks FY2025-26  
Then those balances appear as opening on 2026-04-01 via `fy_carry`; P&L accounts start the new FY at zero; FY unlock is refused.

**US-17 Cannot delete control account**  
Given Owner tries to delete Cash in till  
Then `409 CONTROL_ACCOUNT_PROTECTED`.

**US-18 Rename COA**  
Given Owner renames Sales to “Counter sales”  
When a new cash bill posts  
Then auto-post still credits the same `auto_post_key=sales` account.

**US-19 Pay distributor**  
Given AP 10,000 and a ₹4,000 NEFT payment  
When saved  
Then Dr AP 4,000 Cr Bank 4,000; Distributors outstanding decreases by 4,000.

**US-20 Till close variance**  
Given system cash 12,000 and declared 11,850  
When till close posts  
Then variance −150 is logged; Dr Misc 150 Cr Cash 150 (or equivalent so till matches declared).

**US-21 No UPI till line**  
Given v1 till close screen  
When rendered  
Then there is no working UPI/Card declared field.

**US-22 Bank rec excludes SaaS**  
Given a statement containing a Cashfree SaaS debit  
When matching  
Then that line is not auto-matched to shop journals; help text states SaaS is excluded.

**US-23 TB, P&L, BS same COA**  
Given posted journals only  
When TB, P&L, and BS are requested for the same period  
Then they read the same account balances; TB ties; BS assets = liabilities + equity.

**US-24 B2C never IRN**  
Given a walk-in bill draft (no GSTIN)  
When POS calls `requestIrn`  
Then IRP is not called; `skipped: B2C`.

**US-25 B2B IRN success**  
Given e-invoicing on and buyer GSTIN  
When `requestIrn` succeeds  
Then IRN, ack, signed QR return; POS may post; PDF/thermal can print IRN + ACK QR.

**US-26 IRP down draft-hold**  
Given IRP timeout  
When `requestIrn` returns `503`  
Then books posts no sale journal; POS holds draft (POS invariant: no stock deduct).

**US-27 IRN reject verbatim + WhatsApp**  
Given IRP reject `"Duplicate IRN"`  
When request fails  
Then API `irp_error` is `Duplicate IRN`; Owner WhatsApp includes bill number; console banner shows the same reason until ack.

**US-28 CN cancels/amends IRN**  
Given original bill had IRN  
When a full CN in the IRP cancel window is posted  
Then IRN is cancelled **or** a CN IRN is requested as required; original bill journal is not edited.

**US-29 2B match ITC**  
Given a 2B row equal to a GRN  
When pulled  
Then status `matched`. Chemist marks claim. GSTR-3B prepare includes that ITC.

**US-30 2B pull fail**  
Given GSTN down  
When pull fails  
Then 2B is stale; banner shown; `prepareGstr1` still returns JSON from local books.

**US-31 Chemist does not file**  
Given prepared GSTR-1 JSON  
When Owner downloads  
Then there is no “Submit to GSTN” action.

**US-32 Secrets never in pack**  
Given any prepare JSON or journal export  
Then GSTN/IRP username/password/tokens are absent.

**US-33 Free plan**  
Given Free plan  
When Owner opens Books  
Then paywall names Growth + price; POS still prints GST invoice without IRN.

**US-34 Idempotent IRN**  
Given the same `client_charge_id` retried after success  
When `requestIrn` is called again  
Then the original IRN is returned; IRP is not issued a second document.

---

## 9. Edge Cases & Error Handling

| Case                                         | Behaviour                                                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Unbalanced computed sale (round-off omitted) | Refuse post `422 UNBALANCED_JOURNAL`; do not skip round-off.                                                          |
| Locked period document edit/delete           | `423 PERIOD_LOCKED` from books and from source module.                                                                |
| Backdated bill into locked month             | POS blocked via `isPeriodLocked`; books also rejects.                                                                 |
| IRP down                                     | `503`; POS draft-hold; Owner WhatsApp + banner; no journal.                                                           |
| IRN reject                                   | `422`; verbatim reason; WhatsApp + banner with bill no.                                                               |
| GSTN down                                    | 2B stale; prepare from local books; WhatsApp + banner.                                                                |
| Missing GSTN/IRP credentials                 | `409 *_CREDENTIALS_MISSING`; banner “Owner must save GSTN/IRP credentials in Settings”; no log of empties as secrets. |
| E-invoicing off + B2B                        | Skip IRN; GST invoice still printable.                                                                                |
| B2C + IRN call                               | Skip; never IRP.                                                                                                      |
| WhatsApp send fail (mandatory-path)          | Banner remains until Owner ack even if inbox shows Failed.                                                            |
| Duplicate `source_id` event                  | Return existing journal.                                                                                              |
| Scheme qty on GRN                            | Cost 0, stock still in inventory module.                                                                              |
| Opening stock CSV without valuation          | Inventory qty only; no inventory journal until valuation declared.                                                    |
| Till close twice                             | `409` unless replace in open period.                                                                                  |
| Bank rec SaaS line                           | Never auto-match.                                                                                                     |
| FY lock twice                                | `409 FY_ALREADY_LOCKED`.                                                                                              |
| Delete control COA                           | `409 CONTROL_ACCOUNT_PROTECTED`.                                                                                      |
| Plan expired mid-month                       | Writes blocked; existing journals retained; Free POS invoice print still works.                                       |
| Concurrent post same bill                    | Unique constraint; one journal.                                                                                       |
| Credit note > original                       | `422 CN_EXCEEDS_ORIGINAL`.                                                                                            |
| Place of supply inter-state B2B              | IGST output only; no CGST/SGST.                                                                                       |
| Issue without IRN                            | POS logged confirm; books `issued_without_irn`; journal posts as normal sale.                                         |
| 2B mismatch amounts                          | Status `mismatch`; ITC still markable; 3B uses chemist mark not auto.                                                 |
| Manual journal that changes stock            | UI warning only; qty unchanged.                                                                                       |
| `exp_raw_material` unused delete             | Allowed if zero balance (not a control key).                                                                          |
| Trial balance broken                         | `500 TRIAL_BALANCE_BROKEN` + banner; engineering P0.                                                                  |

Error codes: `PLAN_REQUIRED`, `PERIOD_LOCKED`, `UNBALANCED_JOURNAL`, `CONTROL_ACCOUNT_PROTECTED`, `ACCOUNT_IN_USE`, `OPENING_ALREADY_POSTED`, `FY_LOCK_IRREVERSIBLE`, `MONTH_IN_LOCKED_FY`, `CANNOT_LOCK_FUTURE_MONTH`, `TILL_ALREADY_CLOSED`, `IRN_REJECTED`, `IRP_UNAVAILABLE`, `IRP_CREDENTIALS_MISSING`, `GSTN_UNAVAILABLE`, `GSTN_CREDENTIALS_MISSING`, `CN_EXCEEDS_ORIGINAL`, `RETURN_EXCEEDS_GRN`, `TRIAL_BALANCE_BROKEN`, `FORBIDDEN`.

---

## 10. Open Questions / Assumptions

**Assumptions (build these unless product revises):**

1. **FY** is 1 April – 31 March. Month lock is Owner-reversible until that FY is locked. FY lock is irreversible and writes carry-forward.
2. **v1 auto-post** always hits **control** accounts, not Owner-created children.
3. **Raw material** is a seeded non-control expense account for `expenses` category mapping.
4. **Till variance** posts to `exp_misc`. Shortage stock-take posts to `cogs` unless flagged misc.
5. **CN write-off** of cost hits `cogs` (not a separate write-off control account).
6. **Loyalty earn contra** is a debit line on `sales` (not a separate income account) so P&L sales is net of earn contra.
7. **GSTR-1 JSON** is GSTN-shaped for upload by CA; this app never files. Retail sections only (no export/SEZ).
8. **2B pull failure** still allows prepare; `two_b_stale` is true on the prepare record.
9. **UPI till line** is omitted from UI entirely in v1 (not shown disabled).
10. **Distributor NEFT** = books `bank` credit, recorded locally.
11. **Opening books** can post only once; later changes are manual journals.
12. **Issue without IRN** is a POS Owner action; books records status only.
13. TDS/TCS never appear on journals in v1.
14. Round-off account may sit debit or credit; it is a liability-group control account as in the catalogue.

**Open questions:**

1. Should Manager be allowed to lock a month, or Owner only? **v1 assumption: Owner only.**
2. Exact IRP cancel window and whether partial CN always goes to CN-IRN (follow IRP rules at implementation; behaviour in FR-81).
3. Whether FY P&L close targets `opening_balances` vs `owner_capital` (v1: `opening_balances`).
4. Bank statement column aliases for common Indian banks (v1: date, description, amount, reference; extra columns ignored).
5. Whether 2B `missing_in_2b` GRNs should block ITC claim (v1: chemist may still mark unclaim; claim on missing_in_2b is allowed but flagged on 3B prepare as `claimed_without_2b`).
