# Requirement Doc: POS Billing (`pos-billing`)

**Plan gate:** Free forever (core billing). Sub-features: named customer / khata / loyalty / coupon / H1-X register / IRN follow the owning module’s plan.  
**Surface:** Pharmacy Partner Console — staff POS.  
**Owner module:** `modules/pos-billing/{ui,api,docs}`  
**This is the commerce hub.** One posted Bill writes stock, GST invoice, H1/X register (if scheduled), khata (if credit), loyalty lots, and the sale journal. Downstream modules read the posted Bill; they do not re-compute GMV.

---

## 1. Summary

Staff POS is a two-step browser flow: **Cart & customer → Payment**. The cashier (or pharmacist/manager/owner) searches or scans SKUs, builds a cart against living batches (FEFO default), attaches walk-in or named customer, applies at most one coupon + one manual discount + loyalty redeem, then finishes with **exactly one** tender: **Cash** or **Credit (khata)**.

**Charge & invoice** (cash) and **Record on credit** (khata) are the only finish actions. There is no “Pay later” state, no split tender, no delivery fee, no UPI, no card, no Cashfree on the shop floor. Stock deducts **only** after the Bill is **posted**. Charge is **idempotent** on `client_charge_id`.

Bill identity is invoice number + financial year, unique per pharmacy, never reused. Credit notes are **not** this module — cancel and return go to `returns` as a credit note; bills are never deleted.

v1 GMV formula (canonical, server-authoritative):

```
payable_unrounded = items_gst_inclusive − coupon − manual − loyalty_redeem
invoice_total     = round_half_up(payable_unrounded, 2 decimals)
round_off         = invoice_total − payable_unrounded
```

Tax is recomputed on the **discounted selling price** (SP) of each line. MRP shown and used as the list-price cap is **GST-inclusive** and **must not exceed the DPCO ceiling**. Regular GST dealers only.

The Charge Lambda is one transaction boundary: after validations (and IRN wait when required), it calls domain services in a single database transaction — decrement stock, allocate invoice number, insert Bill, append H1/X, write khata, earn/burn loyalty, write journal, append audit — then emits `BillPosted`.

---

## 2. Scope (in / out)

### In scope

- Staff POS UI: product search (barcode / batch / name / salt / brand / rack), category chips, product cards, cart, customer/doctor panel, discount stack, cash drawer, khata confirm, hold/resume, invoice modal.
- Server-side cart preview (tax, discounts, round-off, change due, credit-limit, below-cost, loyalty cap).
- HeldCart park / resume / discard / auto-expire. Failed or abandoned cash drawer persists as a hold, not an unpaid bill.
- `POST /bills/charge` (idempotent). Cash and khata tenders only.
- GST tax invoice (B2C always; B2B with IRN when e-invoicing is on). Invoice number allocation per pharmacy per FY.
- Thermal 80 mm GST invoice, Save PDF, reprint, on-demand pre-filled WhatsApp share (user taps send).
- Substitute prompt (short/out + cheapest in-stock generic) with pharmacist confirm-before-replace.
- Allergy acknowledge at charge for named customers with allergies on file.
- PIN override callbacks: FEFO later-batch, expired-batch visibility, below-cost, khata over-limit, Owner “issue without IRN”.
- Charging a kiosk pickup token as **Cash** (kiosk never posts a Bill; this module does).
- Deep-link from invoice modal into `returns` (Return / Cancel = credit note).
- Emitting `BillPosted` and calling domain services listed in §7.5.
- Browser POS hardware: USB/HID scanner types into the same search box; browser print dialog to 80 mm thermal.

### Out of scope (never implement in this module)

- UPI, card, Cashfree, split tender, multiple tenders, “Pay later”, delivery fee, COD, wallet.
- Offline charge queue or local stock cache that can post later.
- Deleting or editing a posted Bill. Cancel = credit note in `returns`.
- Customer debit notes.
- Kiosk shopper UI, kiosk config, kiosk exit PIN (owned by `kiosk`). This module only **charges** a kiosk token as cash.
- Credit-note posting, restock, write-off, IRN credit note (`returns`).
- Khata **repayment** UI (owned by `khata`; Orders/Sales may deep-link). POS may show outstanding as a fact on the customer chip.
- Creating the platform master, DPCO ceiling, or ban list (`master-catalogue`).
- Duty clock-in UI (`statutory-registers`). POS only **reads** on-duty status and **appends** H1/X lines on posted scheduled sales.
- Offer/coupon CRUD (`offers`). POS validates and applies exactly one code.
- Loyalty lot storage (`crm`). POS quotes, burns, and earns through `crm` services.
- Journal/COA ownership (`books-gst`). POS calls `booksGst.postSaleJournal` in the same transaction.
- Period/FY lock UI (`books-gst`). POS **enforces** lock at post time.
- Go-live wizard / KYC (`go-live-kyc`). POS **refuses** first posted bill until both are complete.
- Invoice prefix / thermal template CRUD (`account-settings`). POS **reads** them.
- SaaS billing, Cashfree checkout, HQ screens.
- Wholesale, hospital/IPD, insurance, Jan Aushadhi, extra branches.

---

## 3. Dependencies (be specific: APIs/events needed from other slugs)

All calls are tenant-scoped. `location_id` is on every query. POS **must not** import other modules’ UI. Persistence only through `libs/db-services`. POS talks to other APIs via typed clients / domain services.

| Other slug | What POS needs | Contract POS calls |
|---|---|---|
| `auth` | Session; current user id/role/permissions; **counter PIN verify** for overrides | `POST /auth/pin/verify` (or POS-owned wrapper in §7.4 that delegates here). Roles: Owner, Manager, Pharmacist, Cashier. |
| `manage-users` | Permission `pos-billing` on the session | Read-only: user may open POS iff permission granted (Cashier default includes POS). |
| `plan-gating` | Feature flags for sub-features | `GET /plan/features` → `khata`, `customers`, `offers`, `crm`, `statutory-registers`, `books-gst.e_invoice`. POS route itself is always unlocked. |
| `go-live-kyc` | Block first posted bill | `GET /go-live/status` → `{ kyc_approved, wizard_complete, can_post_bills }` |
| `tenancy` | `tenant_id`, `location_id`, pharmacy state (GSTIN first two digits), GSTIN, e-invoicing on/off, Regular GST | `GET /tenancy/location` |
| `inventory` | SKU search, batch qty/expiry/cost/MRP, rack, loose flag, reorder level, FEFO order; **conditional decrement** | Search + `inventory.decrementBatches` in the Charge TX. `qty` after decrement ≥ 0. |
| `master-catalogue` | Substitutes list, DPCO ceiling, banned flag, schedule tag, salt/brand | `GET /master/skus/:id/substitutes`; ceiling/ban copied onto tenant SKU — still re-check at add-to-cart and charge. |
| `racks` | Rack code on the product card and search | Inventory already denormalises rack; if missing, card shows “Unlocated”. POS still searches rack on Free. |
| `customers` | Named customer by phone; create-at-POS; allergies; GSTIN on 360 | `GET /customers?phone=`; `POST /customers` (quick); `GET /customers/:id` including `allergies[]`, `gstin`, `state_code`. Gated Starter. |
| `khata` | Credit limit, outstanding, **post sale** | `GET /khata/:customerId/summary` → `{ credit_limit_paise, outstanding_paise }`; `khata.postSale` in Charge TX. Gated Starter. |
| `statutory-registers` | Pharmacist on duty; shop doctor list; inline add doctor; **append H1/X** | `GET /statutory/duty/current`; `GET /statutory/doctors`; `POST /statutory/doctors`; `statutoryRegisters.appendScheduledSale` in Charge TX. Gated Starter for clock-in UI, but **clinical rule is not plan-based**: no duty → cannot charge scheduled. |
| `offers` | Validate exactly one coupon | `POST /offers/validate` `{ code, cart }`. Gated Growth. |
| `crm` | Loyalty balance, FIFO lots, earn/burn | `crm.quoteRedeem`; `crm.earnAndBurn` in Charge TX. Gated Growth. Redeem requires named customer. |
| `account-settings` | Invoice prefix, template (thermal default), show HSN/doctor/IRN, hold TTL (10–120, default 30), “you saved” toggle | `GET /settings/invoice`; `GET /settings/pos` `{ hold_ttl_minutes }` |
| `books-gst` | Period lock; IRN request; sale journal | `GET /books/period-lock?date=`; `booksGst.requestIrn` **before** stock TX; `booksGst.postSaleJournal` **inside** stock TX. |
| `audit` | Append-only money/stock/override events | `audit.append` inside Charge TX and on every PIN override. |
| `whatsapp` | Optional: template body for bill share | POS **does not auto-send**. It builds a pre-filled `wa.me` URL. May call `GET /whatsapp/templates/bill-share` for the English body with shop name. |
| `prescriptions` | Optional link `prescription_id` on the bill when “Dispense → billing” landed the cart | Read `prescription_id` from cart payload; POS does not own the queue. |
| `kiosk` | HeldCart + pickup token created by kiosk | `GET /pos/holds/by-token/:token`. Charge with `kiosk_token_id` + tender `cash` only. |
| `returns` | Invoice modal **Return** / **Cancel** | Navigate to returns with `bill_id`. POS never issues a CN. |
| `orders` / `sales-ledger` / `dashboard` / `reports` | Consumers of posted bills | They subscribe to `BillPosted` / query bills. POS does not call them. |

POS **owns** `Bill`, `BillLine`, `Payment` (GMV), `HeldCart`, and the Charge idempotency table. It does **not** own Batch qty (inventory), KhataLedger, LoyaltyLot, DutyShift, Journal, or CreditNote.

---

## 4. Functional Requirements (FR-n: The system shall ... ATOMIC)

### 4.1 Access, tenancy, go-live

- **FR-1:** The system shall expose POS to any authenticated staff user whose permission grid includes `pos-billing` (Owner, Manager, Pharmacist, Cashier defaults).
- **FR-2:** The system shall scope every read and write to `tenant_id` + `location_id` from the session; the UI is one shop.
- **FR-3:** The system shall refuse `POST /bills/charge` with `GO_LIVE_INCOMPLETE` when `can_post_bills` is false (Namma KYC not approved **or** Owner wizard not complete / not validly skipped).
- **FR-4:** The system shall allow building a cart, searching, and holding **before** go-live, but shall not allocate an invoice number or deduct stock until FR-3 passes.
- **FR-5:** The system shall allow multiple concurrent POS sessions for the same tenant (v1). Each session is audited.
- **FR-6:** The system shall **not** render UPI, Card, Cashfree, wallet, split-tender, or “Pay later” controls on POS or on the payment step. v1 tender enum is `{ cash, khata }` only.

### 4.2 Two-step flow

- **FR-7:** The system shall present POS as exactly two steps: **(1) Cart & customer** and **(2) Payment**.
- **FR-8:** The system shall disable Next → Payment while the cart has zero lines.
- **FR-9:** The system shall keep the cart in memory / HeldCart across the two steps; Payment shall not create a Bill until Charge succeeds.

### 4.3 Search, scan, categories, product cards

- **FR-10:** The system shall provide one search box that accepts barcode, batch number, name, salt (composition), brand, or rack code.
- **FR-11:** The system shall treat a USB/HID barcode scanner as keyboard input into that **same** search box. There is no separate scan mode.
- **FR-12:** The system shall, when `q` uniquely matches a barcode or batch number of an in-tenant mapped SKU, auto-add one unit of the FEFO batch to the cart and clear the box (toast: name + batch). If unique but out of stock, show the card as Out and do not increment.
- **FR-13:** The system shall, when `q` is ambiguous, show a result list of product cards (default page size 20) ranked: exact barcode, exact batch, name prefix, salt, brand, rack.
- **FR-14:** The system shall show category chips exactly: `Fever`, `Cough`, `Diabetes`, `Heart`, `Stomach`, `Vitamins`, `Skin`, `Baby`, `Devices`, `Personal`, `Ayurveda`, `First Aid`. Selecting a chip filters the grid; selecting again clears the filter. Chips may combine with `q`.
- **FR-15:** The system shall render each product card with: name, pack size, rack code (or Unlocated), GST-inclusive price (MRP, DPCO-capped), stock pill `OK` | `Low` | `Out`, and schedule tag `OTC` | `H` | `H1` | `X` when not OTC.
- **FR-16:** The system shall compute stock pill as: `Out` if sellable qty = 0; `Low` if 0 < qty ≤ SKU reorder_level (missing reorder_level treated as 0, so only Out/OK); `OK` otherwise.
- **FR-17:** The system shall sell a loose SKU **per tablet** (qty stepper in tablets). Non-loose SKUs sell per pack. The card must show the unit (“per tab” vs pack).
- **FR-18:** The system shall not list or add a SKU that is banned on the platform master (`BANNED_SKU`).
- **FR-19:** The system shall not add a SKU whose tenant MRP (list price) exceeds the platform DPCO ceiling (`ABOVE_DPCO`).
- **FR-20:** The system shall show price as GST-inclusive MRP and never display a tax-exclusive rack price as the selling price.

### 4.4 Cart, batches, FEFO, qty

- **FR-21:** The system shall add a line keyed by `sku_id` + `batch_id`. Two batches of the same SKU are two lines.
- **FR-22:** The system shall default the batch picker to FEFO: earliest expiry among batches with qty > 0 and expiry.date ≥ today (location TZ `Asia/Kolkata`).
- **FR-23:** The system shall hide expired batches (expiry.date < today) from the default FEFO picker.
- **FR-24:** The system shall allow picking an expired batch only after a successful PIN verify with purpose `expired_batch` plus a non-empty reason; the override is logged (actor, sku, batch, reason, timestamp).
- **FR-25:** The system shall allow picking a **later** (non-FEFO) in-date batch only after PIN verify with purpose `fefo_override` plus a non-empty reason; Pharmacist, Manager, or Owner PIN; logged.
- **FR-26:** The system shall provide a quantity stepper (− / value / +) on each line. Decrement below 1 removes the line (or confirm). Increment shall not exceed that batch’s **current sellable qty**.
- **FR-27:** The system shall reject increment / charge that would take batch qty below 0 (`STOCK_INSUFFICIENT`). No negative stock.
- **FR-28:** The system shall show per line: qty, batch no, expiry, GST rate %, GST-inclusive unit price, line total (qty × unit SP after discounts allocated).
- **FR-29:** The system shall provide **Clear cart** which empties lines, discounts, customer, doctor, and PIN override tokens, and does not touch stock.
- **FR-30:** The system shall keep cart line `batch_id` pointing at a living Batch row; if the batch is deleted or qty becomes 0 before charge, Charge fails with `STOCK_INSUFFICIENT` / `BATCH_GONE`.

### 4.5 Substitutes

- **FR-31:** The system shall, when the cashier adds or increments a SKU that is Out or Low, prompt in-stock substitutes from `master-catalogue` substitutes that are mapped and have sellable qty > 0 at this location.
- **FR-32:** The system shall **always** (even when the SKU is OK) offer the **cheapest in-stock generic** substitute (lowest GST-inclusive MRP among in-stock substitutes that share salt/composition class). If none, omit that suggestion.
- **FR-33:** The system shall not replace a cart line until the pharmacist/cashier **confirms** the substitute. Cancel leaves the original SKU (or leaves Out without adding).
- **FR-34:** The system shall, after confirm, remove/avoid the original short SKU and add the substitute’s FEFO batch. The substitution is logged (from_sku, to_sku, actor).
- **FR-35:** The system shall not offer banned or above-DPCO substitutes. Staff POS may offer H/H1/X substitutes (kiosk must not — that is `kiosk`).

### 4.6 Customer, walk-in, scheduled, doctor, duty, allergy

- **FR-36:** The system shall allow a **walk-in**: name optional, phone optional, `customer_id` null. Walk-in may only tender **cash**.
- **FR-37:** The system shall require a **named customer with phone** when (a) any line is scheduled (`H`, `H1`, or `X`) **or** (b) tender is `khata`. Phone is unique per tenant when named.
- **FR-38:** The system shall look up named customers by phone (and name) via `customers`. If Starter `customers` is locked and the cart needs a named customer, the system shall block charge with `CUSTOMERS_MODULE_LOCKED` and show the Starter paywall — walk-in cash of OTC-only carts still works on Free.
- **FR-39:** The system shall allow creating a named customer inline (name + phone required; GSTIN optional) by calling `POST /customers`, then attaching `customer_id`.
- **FR-40:** The system shall require **doctor name + registration number** on the bill when any line is scheduled. Name-only is not enough.
- **FR-41:** The system shall pick the doctor from the shop doctor list (`statutory-registers`) and shall allow **add inline** (name + registration number) which POSTs to that module and then selects the new doctor.
- **FR-42:** The system shall refuse Charge of a scheduled cart when no registered pharmacist is **on duty** (`NO_PHARMACIST_ON_DUTY`). Duty is read from `statutory-registers`.
- **FR-43:** The system shall snapshot `pharmacist_on_duty` (employee_id, name, registration no.) onto the posted Bill at charge time.
- **FR-44:** The system shall, at Charge (not merely at add-to-cart), if `customer_id` is set and the customer has one or more allergies, present an on-screen allergy warning listing those allergies vs cart SKU names/compositions.
- **FR-45:** The system shall not post a named-customer bill that had allergies until staff taps **Acknowledge** on that warning. The acknowledge is logged (actor, customer_id, allergy snapshot, bill/client_charge_id).
- **FR-46:** The system shall **not** run an allergy check for walk-in (`customer_id` null).
- **FR-47:** The system shall persist on every H1/X line of a posted bill: patient name + phone, doctor name + registration number, drug, batch, qty, bill no, pharmacist on duty.

### 4.7 Discount stack

- **FR-48:** The system shall apply **at most one** coupon code per bill. A second code is rejected (`SECOND_COUPON`).
- **FR-49:** The system shall apply a coupon only when `offers` is unlocked (Growth). Otherwise the coupon field is hidden; typed codes return `OFFERS_MODULE_LOCKED`.
- **FR-50:** The system shall validate the coupon via `offers` (running, not paused, applies-to all / category / one product, % or flat ₹) and distribute the reduction only to eligible lines.
- **FR-51:** The system shall allow **at most one** manual discount: either flat ₹ **or** % (not both, not two manuals).
- **FR-52:** The system shall apply manual % to `(items − coupon)` and cap manual flat ₹ at `(items − coupon)` so payable cannot go negative before loyalty.
- **FR-53:** The system shall allow loyalty redeem only for a named customer when `crm` is unlocked (Growth). Walk-in cannot redeem. Khata bills **may** redeem.
- **FR-54:** The system shall redeem at **1 point = ₹1**, FIFO lots, and shall cap redeem at **20% of payable before this redeem** (i.e. 20% of `items − coupon − manual`). The UI and server both clamp; exceeding the cap is not an error — the cap is applied (`LOYALTY_CAPPED` on preview).
- **FR-55:** The system shall not redeem more points than the customer’s remaining unexpired lots.
- **FR-56:** The system shall compute **earn** after redeem: **1 point per ₹100** of **net collected** (invoice total after coupon, manual, and redeem; GST-inclusive). Khata bills earn. Points = `floor(net_collected_rupees / 100)`.
- **FR-57:** The system shall detect **below-cost** after the full stack: if any line’s allocated SP (GST-inclusive) is less than that batch’s cost × qty, it shall warn and require Owner **or** Manager PIN (`below_cost`) before Charge. Pharmacist/Cashier PIN is not sufficient. Logged.
- **FR-58:** The system shall not add a delivery fee or any other extra charge line. Round-off is the only system-generated amount line.

### 4.8 GST, place of supply, round-off, invoice number

- **FR-59:** The system shall treat MRP / list / SP as **GST-inclusive**. Per line after discount allocation:

  ```
  taxable_paise = round_half_up(sp_paise * 100 / (100 + gst_rate_percent))
  gst_paise     = sp_paise − taxable_paise
  ```

- **FR-60:** The system shall split GST as **CGST + SGST** (equal halves of `gst_paise`, odd paisa to CGST) when place of supply state = pharmacy state.
- **FR-61:** The system shall split GST as **IGST** (= `gst_paise`) when the named customer has a GSTIN whose state ≠ pharmacy state (B2B interstate).
- **FR-62:** The system shall treat walk-in and named customers **without GSTIN** as intra-state B2C (pharmacy state, CGST+SGST). Typical counter and all kiosk-origin cash bills are intra-state B2C.
- **FR-63:** The system shall never request IRN for B2C (no GSTIN on the bill).
- **FR-64:** The system shall round the invoice total to **2 decimal places** (paise) using half-up; the difference is a **round-off** line that posts to books (account Round-off). Cash **change due** is computed from this rounded total.
- **FR-65:** The system shall allocate invoice numbers unique per pharmacy per financial year (1 Apr–31 Mar `Asia/Kolkata`), using the prefix from Invoice Settings. Format: `{prefix}{seq}` with seq monotonic, never reused, never gaps-filled by reuse (gaps from failed drafts are skipped).
- **FR-66:** The system shall **not** use the credit-note prefix. CN numbering is owned by `returns`.
- **FR-67:** The system shall refuse Charge when the pharmacy classification is not Regular GST (`NOT_REGULAR_DEALER`) — v1 supports Regular dealers only.
- **FR-68:** The system shall refuse Charge whose `bill_date` (default now) falls inside a **locked** month or FY (`PERIOD_LOCKED`). The system shall not post a backdated bill into a locked period.
- **FR-69:** The system shall print/show HSN, doctor, “you saved vs MRP”, bank, and IRN/ACK only when the corresponding Invoice Settings toggles are on.

### 4.9 Payment — cash and khata

- **FR-70:** The system shall accept **exactly one** tender per posted Bill: `cash` **or** `khata`.
- **FR-71:** The system shall, for cash, require `tendered_paise` ≥ rounded invoice total and compute `change_due_paise = tendered_paise − invoice_total_paise`. Change is from the **rounded** total.
- **FR-72:** The system shall post cash to **Cash in till** via the sale journal (not a payment processor).
- **FR-73:** The system shall label the cash finish button **Charge & invoice**.
- **FR-74:** The system shall label the khata finish button **Record on credit**. There shall be no separate “Pay later” button or state — both write the same khata ledger.
- **FR-75:** The system shall refuse khata when `customer_id` is null (`WALKIN_KHATA_BLOCKED`).
- **FR-76:** The system shall refuse khata when the `khata` module is locked (`KHATA_MODULE_LOCKED` + Starter paywall).
- **FR-77:** The system shall, when `outstanding_paise + invoice_total_paise > credit_limit_paise` and a limit is set, require Owner/Manager PIN purpose `credit_limit` (logged). If no PIN, refuse (`CREDIT_LIMIT_EXCEEDED`). If credit_limit is null, treat as unlimited.
- **FR-78:** The system shall not offer khata on a kiosk-token charge. Kiosk settlement in v1 is **cash only**.

### 4.10 Hold

- **FR-79:** The system shall park the full cart snapshot as a HeldCart on **Hold bill** without decrementing any batch.
- **FR-80:** The system shall auto-expire HeldCarts after the Owner-configured TTL (default **30 minutes**, allowed **10–120**). Expiry discards the cart; **no stock movement**.
- **FR-81:** The system shall treat a failed or abandoned cash-drawer (Payment step unmounted, network error before post, staff Back without charge) as a **hold**, not an unpaid Bill. No invoice number is consumed.
- **FR-82:** The system shall resume a non-expired hold into the POS cart (same lines, customer, discounts, doctor) and delete or mark the hold consumed so it cannot be charged twice in parallel with a still-open resume.
- **FR-83:** The system shall allow discard of a hold with no stock effect.
- **FR-84:** The system shall list holds for resume from POS and from `orders` (Held filter).

### 4.11 Charge, idempotency, stock, IRN, transaction

- **FR-85:** The system shall post a Bill only through `POST /bills/charge` with a client-generated `client_charge_id` (UUID v4).
- **FR-86:** The system shall treat `(tenant_id, location_id, client_charge_id)` as a unique idempotency key. A second Charge with the same key returns the **original** Bill (HTTP 200) and must **not** decrement stock again, allocate a second invoice number, or write a second journal.
- **FR-87:** The system shall decrement batch qty **only after** the Bill row is committed as `status = posted`. Holds, previews, IRN drafts, and failed Charges do not decrement.
- **FR-88:** The system shall perform stock decrement as a single atomic SQL conditional update (`WHERE qty >= :need`) together with Bill insert so two cashiers cannot take the last unit twice. The loser receives `CONCURRENT_STOCK` / `STOCK_INSUFFICIENT`.
- **FR-89:** The system shall, when the bill is B2B (customer GSTIN present) **and** the pharmacy e-invoicing flag is on, **wait for IRN** from `books-gst` **before** deducting stock or allocating a posted invoice.
- **FR-90:** The system shall, on IRP down / IRN reject / timeout, **not** post and **not** deduct. It shall persist an `IrnDraft` (bill snapshot, `status = draft_irn`) and return `IRN_UNAVAILABLE`. Default: do not deduct on IRN failure.
- **FR-91:** The system shall allow the Owner (only) to confirm **“issue without IRN”** via PIN purpose `issue_without_irn` (logged). Then Charge proceeds without IRN, stock deducts, bill posts with `irn = null` and `issued_without_irn = true`.
- **FR-92:** The system shall provide IRN retry on a `draft_irn`: on success, post + deduct + attach IRN/ACK. Until then stock stays.
- **FR-93:** The system shall execute the posted-bill side effects in **one database transaction** by calling domain services (see §7.5): insert Bill + lines + Payment; `inventory.decrementBatches`; `statutoryRegisters.appendScheduledSale` if any H/H1/X; `khata.postSale` if tender khata; `crm.earnAndBurn`; `booksGst.postSaleJournal`; `audit.append`. Then publish `BillPosted` after commit.
- **FR-94:** The system shall not call IRP inside the DB transaction. IRN is awaited **before** the TX (or skipped per FR-91).
- **FR-95:** The system shall snapshot GST breakup, round-off, tender, tendered/change, loyalty redeem/earn, doctor, pharmacist-on-duty, actor, channel (`counter` | `kiosk`), and optional `prescription_id` / `kiosk_token_id` on the Bill.
- **FR-96:** The system shall set channel `kiosk` when charging a kiosk token; otherwise `counter`.

### 4.12 Invoice, print, share, reprint, return entry

- **FR-97:** The system shall, on successful Charge, open the invoice modal: GST tax invoice (B2C) or IRN invoice (eligible B2B with IRN/ACK QR when settings say print IRN).
- **FR-98:** The system shall offer **Thermal print** (80 mm, browser print dialog), **Save PDF**, and **Share WhatsApp**.
- **FR-99:** The system shall implement WhatsApp share as an **on-demand pre-filled** message (shop name, invoice no, total, optional PDF link). The user taps send. POS shall not auto-send via WABA.
- **FR-100:** The system shall allow reprint / Save PDF / share of any posted bill at any later time (Orders, Sales, invoice modal). Print failure does **not** roll back the bill.
- **FR-101:** The system shall **not** delete a bill. **Cancel** on the invoice modal starts a full-return credit note in `returns`.
- **FR-102:** The system shall provide **Return against this bill** on the invoice modal, navigating to `returns` with `bill_id`.
- **FR-103:** The system shall, if the thermal printer is offline or the user cancels the print dialog, keep the Bill posted and show “Reprint from this screen or Orders”.

### 4.13 Hardware and network

- **FR-104:** The system shall assume internet; it shall **not** queue Charges offline.
- **FR-105:** The system shall, on network drop mid-Charge, show an error, leave stock unchanged if the server did not commit, and instruct staff to retry with the **same** `client_charge_id`.
- **FR-106:** The system shall, on scanner miss (no match), leave the search box and show empty-state “Try name, salt, brand, or rack — or type the barcode”.
- **FR-107:** The system shall generate `client_charge_id` once when Payment step opens (or when Hold is created) and reuse it for retries.

### 4.14 Plan-gated sub-features (POS stays Free)

- **FR-108:** The system shall keep cash OTC walk-in billing usable on Free (and on expired paid plans that revert to Free).
- **FR-109:** The system shall paywall coupon UI (Growth / `offers`), loyalty redeem (Growth / `crm`), khata tender (Starter / `khata`), named CRM attach (Starter / `customers`), doctor/duty when those APIs are locked — but shall still **block scheduled charge** if duty/doctor cannot be satisfied (legal rule, not a bypass).

### 4.15 Appearance of the bill elsewhere

- **FR-110:** The system shall make every posted Bill queryable by `orders` (7-day), `sales-ledger`, `reports` (Growth GST), `customers` history, and `dashboard` from the same Bill table.
- **FR-111:** The system shall cause H1/X legal register lines to exist for scheduled posted sales via the Charge TX (pharmacy register is the legal record).

---

## 5. Non-Functional Requirements

- **NFR-1 Latency:** Product search p95 ≤ 300 ms for `q` length ≥ 2 on a 10k-SKU tenant. Charge p95 ≤ 2 s excluding IRP. Charge with IRN p95 ≤ 8 s or fail with `IRN_UNAVAILABLE` (no silent hang > 10 s).
- **NFR-2 Idempotency:** Charge, IRN request (delegated), and PIN-override tokens are idempotent. Unique index on `(tenant_id, location_id, client_charge_id)`.
- **NFR-3 Consistency:** Stock, Bill, register, khata, loyalty, journal succeed or fail together (one DB TX). No posted Bill with undeducted stock or deducted stock without a Bill.
- **NFR-4 Concurrency:** Serializable or row-level lock on Batch during decrement. Two cashiers, last unit: one `200`, one `STOCK_INSUFFICIENT`.
- **NFR-5 Tenancy:** Every query includes `location_id`. No cross-tenant bill or batch access.
- **NFR-6 Audit:** Append-only for Charge, hold create/discard, PIN overrides (FEFO, expired batch, below-cost, credit-limit, issue-without-IRN), allergy acknowledge, substitute confirm, IRN retry, reprint is not money-moving (optional audit).
- **NFR-7 Security:** Session required. PIN is hashed at rest (`auth`). PIN values never in logs. GSTN/IRP secrets never returned to POS UI.
- **NFR-8 i18n:** English ships. All UI strings and invoice labels via i18n keys. WhatsApp share body i18n-ready.
- **NFR-9 Accessibility:** Search box labelled; stepper buttons named; allergy modal focus-trapped; PIN dialog not echoing digits in DOM attributes.
- **NFR-10 Reliability:** No offline queue. Mid-charge network error is user-visible. Printer fail does not fail Charge.
- **NFR-11 Sessions:** Multiple sessions allowed; each Charge stores `actor_user_id` and session id.
- **NFR-12 Money:** All amounts integer **paise**. No IEEE float in tax math. Rounding half-up to paise.
- **NFR-13 Print:** 80 mm CSS (`@page { size: 80mm auto }`). Works with browser print dialog to a thermal device.
- **NFR-14 PII:** Patient name, phone, allergies only for this tenant’s staff. Invoice PDF may include them; CA pack is not this module.

---

## 6. Data Model / Entities

Owner: `pos-billing` unless noted. Money: `BIGINT` paise. Dates: `timestamptz`. Civil dates (expiry, bill_date, FY) in `Asia/Kolkata`.

### 6.1 `Bill`

| Column | Type | Notes |
|---|---|---|
| `bill_id` | UUID PK | |
| `tenant_id` | UUID | |
| `location_id` | UUID | |
| `client_charge_id` | UUID | unique with tenant+location |
| `invoice_no` | TEXT | unique with tenant+location+`fy` when status=posted |
| `fy` | TEXT | e.g. `2026-27` |
| `status` | ENUM | `draft_irn` \| `posted` |
| `bill_date` | DATE | default today IST; cannot land in locked period |
| `channel` | ENUM | `counter` \| `kiosk` |
| `customer_id` | UUID NULL | null = walk-in |
| `customer_snapshot` | JSONB | name, phone, gstin, state_code at charge |
| `doctor_name` | TEXT NULL | required if any scheduled line |
| `doctor_registration_no` | TEXT NULL | required if any scheduled |
| `pharmacist_on_duty_employee_id` | UUID NULL | required if any scheduled |
| `pharmacist_on_duty_snapshot` | JSONB NULL | name + reg no |
| `prescription_id` | UUID NULL | from prescriptions dispense→billing |
| `kiosk_token_id` | TEXT NULL | |
| `hold_id` | UUID NULL | consumed hold |
| `tender` | ENUM | `cash` \| `khata` |
| `tendered_paise` | BIGINT NULL | cash only |
| `change_due_paise` | BIGINT NULL | cash only |
| `items_inclusive_paise` | BIGINT | pre-discount sum |
| `coupon_code` | TEXT NULL | at most one |
| `coupon_discount_paise` | BIGINT | |
| `manual_discount_type` | ENUM NULL | `flat` \| `percent` |
| `manual_discount_value` | BIGINT NULL | paise or rate×100 (e.g. 10% → 1000) — see §7 |
| `manual_discount_paise` | BIGINT | computed |
| `loyalty_redeem_points` | INT | |
| `loyalty_redeem_paise` | BIGINT | 1 pt = ₹1 |
| `loyalty_earn_points` | INT | |
| `round_off_paise` | BIGINT | signed; usually −1..+1 paise range but can be more |
| `invoice_total_paise` | BIGINT | rounded payable |
| `taxable_paise` | BIGINT | sum of lines |
| `cgst_paise` | BIGINT | |
| `sgst_paise` | BIGINT | |
| `igst_paise` | BIGINT | |
| `place_of_supply_state` | CHAR(2) | |
| `gst_supply_type` | ENUM | `intra_b2c` \| `intra_b2b` \| `inter_b2b` |
| `irn` | TEXT NULL | |
| `irn_ack_no` | TEXT NULL | |
| `irn_ack_dt` | TIMESTAMPTZ NULL | |
| `irn_signed_qr` | TEXT NULL | |
| `issued_without_irn` | BOOL | default false |
| `allergy_acknowledged_at` | TIMESTAMPTZ NULL | |
| `below_cost_override` | BOOL | |
| `credit_limit_override` | BOOL | |
| `actor_user_id` | UUID | |
| `actor_role` | TEXT | |
| `posted_at` | TIMESTAMPTZ NULL | |
| `created_at` | TIMESTAMPTZ | |

Invariants: `tender ∈ {cash, khata}`; one tender; `status=posted` ⇒ stock already decremented; walk-in ⇒ `tender=cash` and `customer_id` null; scheduled lines ⇒ doctor name+reg + pharmacist snapshot; `loyalty_redeem_paise ≤ 0.20 * (items − coupon − manual)`.

### 6.2 `BillLine`

| Column | Type | Notes |
|---|---|---|
| `line_id` | UUID PK | |
| `bill_id` | UUID FK | |
| `sku_id` | UUID | |
| `batch_id` | UUID | living batch at post |
| `schedule` | ENUM | `OTC` \| `H` \| `H1` \| `X` |
| `hsn` | TEXT | |
| `gst_rate_percent` | NUMERIC(5,2) | e.g. 12.00 |
| `qty` | INT | tablets if loose; packs otherwise; > 0 |
| `mrp_paise` | BIGINT | GST-inclusive list, ≤ DPCO |
| `unit_sp_paise` | BIGINT | GST-inclusive after discount allocation |
| `line_sp_paise` | BIGINT | qty × unit SP (before line-level round) |
| `taxable_paise` | BIGINT | |
| `gst_paise` | BIGINT | |
| `cgst_paise` | BIGINT | |
| `sgst_paise` | BIGINT | |
| `igst_paise` | BIGINT | |
| `cost_paise` | BIGINT | snapshot batch cost × qty |
| `batch_no` | TEXT | snapshot |
| `expiry` | DATE | snapshot |
| `substituted_from_sku_id` | UUID NULL | |

### 6.3 `Payment` (GMV)

| Column | Type | Notes |
|---|---|---|
| `payment_id` | UUID PK | |
| `bill_id` | UUID | |
| `method` | ENUM | `cash` \| `khata` |
| `amount_paise` | BIGINT | = invoice_total |
| `tendered_paise` | BIGINT NULL | |
| `change_due_paise` | BIGINT NULL | |

SaaS Cashfree payments are **not** this table (`saas-billing`).

### 6.4 `HeldCart`

| Column | Type | Notes |
|---|---|---|
| `hold_id` | UUID PK | |
| `tenant_id` | UUID | |
| `location_id` | UUID | |
| `client_charge_id` | UUID | reused on resume→charge |
| `channel` | ENUM | `counter` \| `kiosk` |
| `kiosk_token_id` | TEXT NULL unique per tenant | 4–6 digit or alphanumeric pickup token |
| `cart_snapshot` | JSONB | lines, customer, doctor, discounts, prescription_id |
| `created_by` | UUID | kiosk holds: kiosk session / staff who launched |
| `expires_at` | TIMESTAMPTZ | now + TTL |
| `status` | ENUM | `open` \| `resumed` \| `charged` \| `discarded` \| `expired` |
| `expired_at` | TIMESTAMPTZ NULL | |

**HeldCart never decrements stock and never allocates invoice_no.**

### 6.5 `IrnDraft`

Same shape as Bill at `status=draft_irn` (can be stored in `Bill` with null `invoice_no` or a reserved draft id). No stock move. Owner retry or `issue_without_irn` transitions to posted.

### 6.6 `ChargeIdempotency`

| Column | Type |
|---|---|
| `tenant_id, location_id, client_charge_id` | PK |
| `bill_id` | UUID |
| `response_json` | JSONB |
| `created_at` | TIMESTAMPTZ |

### 6.7 `PinOverrideToken` (short-lived, may live in `auth`)

Issued by pin-verify: `purpose`, `actor_user_id`, `expires_at` (120 s), signed payload bound to `client_charge_id` + purpose + optional sku/batch.

### 6.8 Referenced (not owned)

`SKU`, `Batch` (`inventory`); `Customer` (`customers`); `Doctor`, `DutyShift` (`statutory-registers`); `Offer` (`offers`); `LoyaltyLot` (`crm`); `KhataLedger` (`khata`); `Journal` (`books-gst`); `AuditEvent` (`audit`).

### 6.9 Invoice number

`InvoiceSequence(tenant_id, location_id, fy, kind='bill')` → next integer. `kind='credit_note'` is **not** incremented here.

---

## 7. API / Interface Contracts (REST JSON, events, UI props)

Base: `/api/v1`. Auth: `Authorization: Bearer <session>`. Required header or query: `location_id`. Amounts: integer paise. Success: `{ "ok": true, "data": ... }`. Error: `{ "ok": false, "error": { "code": "...", "message": "...", "retryable": bool, "details": {} } }`.

### 7.1 Search and catalogue (POS)

#### `GET /pos/products/search`

Query: `q` (string, optional), `category` (enum chip, optional), `cursor`, `limit` (default 20, max 50).

Behaviour: `q` matched against barcode, batch_no, name, salt, brand, rack_code (ILIKE). Category filters inventory category mapped to the 13 chips. Banned SKUs omitted.

Response `data`:

```json
{
  "items": [
    {
      "sku_id": "uuid",
      "name": "Paracetamol 500 mg",
      "salt": "Paracetamol",
      "brand": "Generic",
      "pack": "10 tab",
      "loose": true,
      "unit_label": "per tab",
      "rack_code": "A-12",
      "mrp_paise": 1250,
      "gst_rate_percent": "12.00",
      "hsn": "3004",
      "schedule": "H",
      "sellable_qty": 40,
      "stock_pill": "OK",
      "reorder_level": 10,
      "barcode": "8901234567890",
      "fefo_batch": {
        "batch_id": "uuid",
        "batch_no": "B12",
        "expiry": "2027-03-31",
        "qty": 40,
        "cost_paise": 800
      }
    }
  ],
  "exact_barcode_match": true,
  "next_cursor": null
}
```

`stock_pill`: `OK` | `Low` | `Out`. `exact_barcode_match` true when FR-12 auto-add applies.

#### `GET /pos/categories`

Response: the 13 chips in display order with `id` slugs (`fever`, `cough`, …).

#### `GET /pos/skus/:skuId/batches`

Query: `include_expired=false` default.

Response: batches with `qty > 0`, FEFO-sorted. Expired included only if `include_expired=true` **and** caller will still need PIN at pick. Each: `batch_id`, `batch_no`, `expiry`, `qty`, `cost_paise`, `mrp_paise`, `is_fefo_default`, `expired`.

#### `GET /pos/skus/:skuId/substitutes`

Response:

```json
{
  "in_stock_substitutes": [{ "sku_id": "...", "name": "...", "mrp_paise": 900, "sellable_qty": 12, "schedule": "H" }],
  "cheapest_in_stock_generic": { "sku_id": "...", "name": "...", "mrp_paise": 700, "sellable_qty": 50, "schedule": "H" }
}
```

Empty arrays/null when none. Caller still requires confirm (FR-33).

### 7.2 Cart preview

#### `POST /pos/cart/preview`

Body: same cart object as Charge minus `tendered_paise` (optional). Server is authoritative for tax and caps.

```json
{
  "location_id": "uuid",
  "customer_id": null,
  "lines": [
    { "sku_id": "uuid", "batch_id": "uuid", "qty": 2 }
  ],
  "coupon_code": "FEVER10",
  "manual_discount": { "type": "percent", "value": 500 },
  "loyalty_redeem_points": 80,
  "place_of_supply_override": null
}
```

`manual_discount.value`: if `flat`, paise; if `percent`, **basis points** (10% = 1000, 12.5% = 1250).

Response includes allocated lines, `payable_before_loyalty_paise`, `loyalty_cap_paise` (20%), `loyalty_redeem_paise` (clamped), `invoice_total_paise`, `round_off_paise`, `gst` breakup, `below_cost` boolean + lines, `credit_limit` `{ outstanding_paise, limit_paise, would_exceed }`, `requires_doctor`, `requires_named_customer`, `requires_duty`, `allergies` (if named), `earn_points_preview`.

Errors: `BANNED_SKU`, `ABOVE_DPCO`, `STOCK_INSUFFICIENT`, `BATCH_EXPIRED_HIDDEN`, `SECOND_COUPON`, `OFFERS_MODULE_LOCKED`, `COUPON_INVALID`, `LOYALTY_MODULE_LOCKED`.

### 7.3 Holds

#### `POST /pos/holds`

Body: `{ client_charge_id, cart_snapshot, channel, kiosk_token_id? }`.  
Creates HeldCart `status=open`, `expires_at = now + hold_ttl_minutes`. **No stock.**  
Idempotent on `client_charge_id` if an open hold already exists.

#### `GET /pos/holds`

Query: `status=open` (default; server excludes expired or marks them expired on read), `channel`, `kiosk_token_id`.

#### `GET /pos/holds/:holdId`

404 if other tenant. If `expires_at < now` and still `open`, atomically set `expired` and return `HOLD_EXPIRED`.

#### `POST /pos/holds/:holdId/resume`

If `open` and not expired: set `resumed`, return `cart_snapshot` + `client_charge_id`. Concurrent resume: second call `HOLD_NOT_OPEN`.

#### `POST /pos/holds/:holdId/discard`

Sets `discarded`. No stock. Idempotent if already discarded/expired.

#### `GET /pos/holds/by-token/:token`

Staff POS lookup for kiosk pickup. 404 / `HOLD_EXPIRED` as above. Returns snapshot + `customer_id` if kiosk identified.

**TTL job:** Lambda every 60 s sets `open` rows with `expires_at < now` to `expired`. No stock.

### 7.4 PIN verify (POS wrapper)

POS UI must not collect “any PIN” without a purpose. This endpoint delegates to `auth` and binds a one-time override token to the cart.

#### `POST /pos/pin-verify`

```json
{
  "location_id": "uuid",
  "client_charge_id": "uuid",
  "purpose": "fefo_override",
  "pin": "1234",
  "reason": "Patient requested later expiry",
  "context": {
    "sku_id": "uuid",
    "batch_id": "uuid",
    "invoice_total_paise": 0
  }
}
```

`purpose` enum:

| purpose | Who | Extra |
|---|---|---|
| `fefo_override` | Pharmacist, Manager, Owner | reason required; sku+batch |
| `expired_batch` | Pharmacist, Manager, Owner | reason required; sku+batch |
| `below_cost` | **Owner or Manager only** | reason optional |
| `credit_limit` | **Owner or Manager only** | |
| `issue_without_irn` | **Owner only** | |

Response:

```json
{
  "ok": true,
  "data": {
    "override_token": "opaque",
    "purpose": "fefo_override",
    "actor_user_id": "uuid",
    "actor_role": "pharmacist",
    "expires_in_sec": 120
  }
}
```

Errors: `PIN_INVALID` (counts toward 5-fail / 15-min lock in `auth`), `PIN_LOCKED`, `PIN_ROLE_INSUFFICIENT`, `REASON_REQUIRED`.  
Failed attempts audit `purpose` but **not** the PIN.  
Charge must send the matching `override_tokens[]`. Expired token → `OVERRIDE_EXPIRED`. Token is single-use at successful Charge (FEFO tokens are consumed when the line is accepted into preview/charge).

Kiosk **exit** PIN is **not** this API (`kiosk`).

### 7.5 Charge — `POST /bills/charge`

**The hub write.** Idempotent. Internet required.

```http
POST /api/v1/bills/charge
Idempotency-Key: <client_charge_id>   // optional duplicate of body field
```

Request:

```json
{
  "location_id": "uuid",
  "client_charge_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "hold_id": null,
  "kiosk_token_id": null,
  "bill_date": null,
  "channel": "counter",
  "customer_id": "uuid-or-null",
  "doctor": {
    "doctor_id": "uuid",
    "name": "Dr A",
    "registration_no": "KA12345"
  },
  "prescription_id": null,
  "lines": [
    {
      "sku_id": "uuid",
      "batch_id": "uuid",
      "qty": 2,
      "fefo_override_token": null,
      "expired_batch_token": null,
      "substituted_from_sku_id": null
    }
  ],
  "coupon_code": null,
  "manual_discount": null,
  "loyalty_redeem_points": 0,
  "tender": "cash",
  "tendered_paise": 20000,
  "allergy_ack_token": null,
  "below_cost_token": null,
  "credit_limit_token": null,
  "issue_without_irn_token": null
}
```

`doctor` required iff any line schedule ∈ {H, H1, X}. `tendered_paise` required iff `tender=cash`. `kiosk_token_id` implies `channel=kiosk`, `tender=cash`, OTC-only lines.

**Server algorithm (normative):**

1. Load session; resolve tenant + location; reject if no `pos-billing` permission.
2. **Idempotency:** if row exists for `client_charge_id`, return stored response (200) immediately.
3. `go-live/status.can_post_bills` else `GO_LIVE_INCOMPLETE`.
4. Pharmacy is Regular GST else `NOT_REGULAR_DEALER`.
5. `bill_date` default today IST; if locked period → `PERIOD_LOCKED`.
6. If `hold_id` / `kiosk_token_id`: load open non-expired hold; else ignore.
7. Re-validate every line against live Batch (qty, not banned, MRP ≤ DPCO, batch matches sku). FEFO: if `batch_id` is not the current FEFO in-date batch, require valid `fefo_override_token`. If expired, require `expired_batch_token`.
8. Recompute preview **server-side**. Ignore client totals.
9. Coupon: at most one; validate `offers` if present.
10. Loyalty: clamp to 20% and remaining points.
11. Below-cost: if true and no `below_cost_token` from Owner/Manager → `BELOW_COST_PIN_REQUIRED`.
12. Customer rules: scheduled or khata → named + phone. Walk-in + khata → `WALKIN_KHATA_BLOCKED`.
13. Scheduled: duty current else `NO_PHARMACIST_ON_DUTY`; doctor name+reg else `DOCTOR_REQUIRED`.
14. Allergies: if named + allergies.length > 0, require `allergy_ack_token` issued after preview for this `client_charge_id` else `ALLERGY_ACK_REQUIRED`.
15. Tender ∈ {cash, khata}. No other. Kiosk token → cash only.
16. Cash: `tendered_paise >= invoice_total_paise` else `INSUFFICIENT_TENDER`. Change = difference.
17. Khata: module unlocked; `khata.postSale` will run; over-limit without token → `CREDIT_LIMIT_EXCEEDED`.
18. **IRN branch:** if customer GSTIN and location.e_invoicing: call `booksGst.requestIrn` (idempotent on `client_charge_id`).  
    - Success: keep IRN fields for insert.  
    - Fail: persist `draft_irn` (no stock, no invoice_no), return `IRN_UNAVAILABLE` unless `issue_without_irn_token` from Owner — then continue with `issued_without_irn=true`.
19. **BEGIN TRANSACTION**
    - Allocate `invoice_no` (posted only).
    - Insert Bill `status=posted`, lines, Payment.
    - `inventory.decrementBatches(lines)` — conditional `qty >= need`; on 0-row update **ROLLBACK** → `CONCURRENT_STOCK`.
    - If scheduled lines: `statutoryRegisters.appendScheduledSale(bill)`.
    - If khata: `khata.postSale({ customer_id, bill_id, amount_paise })`.
    - `crm.earnAndBurn` (no-op if 0 and module locked / walk-in).
    - `booksGst.postSaleJournal(bill)` — Dr Cash or Khata; Cr Sales; Cr GST output; Dr COGS / Cr Inventory; loyalty and round-off as catalogue §3.23.
    - `audit.append` Charge.
    - Mark hold `charged` if any.
    - Insert idempotency row + response.
20. **COMMIT**
21. Publish event `BillPosted` (after commit).
22. Return Bill + invoice print payload.

**Success 200:**

```json
{
  "ok": true,
  "data": {
    "bill": { "bill_id": "uuid", "invoice_no": "INV-260001", "status": "posted", "invoice_total_paise": 11800, "change_due_paise": 8200, "irn": null },
    "idempotent_replay": false,
    "print": { "thermal_html_url": "/api/v1/bills/{id}/print?fmt=thermal", "pdf_url": "/api/v1/bills/{id}.pdf" },
    "whatsapp_share": { "wa_me_url": "https://wa.me/?text=...", "body": "Namma Pharmacy\nInvoice INV-260001\nTotal ₹118.00" }
  }
}
```

`idempotent_replay: true` when FR-86 hits.

**Charge error codes (closed set):**

| code | HTTP | retryable | Meaning |
|---|---|---|---|
| `GO_LIVE_INCOMPLETE` | 403 | no | KYC/wizard |
| `NOT_REGULAR_DEALER` | 403 | no | |
| `PERIOD_LOCKED` | 409 | no | |
| `BANNED_SKU` | 422 | no | |
| `ABOVE_DPCO` | 422 | no | |
| `STOCK_INSUFFICIENT` | 409 | yes | qty |
| `CONCURRENT_STOCK` | 409 | yes | last unit race |
| `BATCH_GONE` | 409 | yes | |
| `BATCH_EXPIRED_HIDDEN` | 422 | no | need PIN |
| `FEFO_PIN_REQUIRED` | 422 | no | |
| `SECOND_COUPON` | 422 | no | |
| `COUPON_INVALID` | 422 | no | |
| `OFFERS_MODULE_LOCKED` | 403 | no | |
| `LOYALTY_MODULE_LOCKED` | 403 | no | |
| `CUSTOMERS_MODULE_LOCKED` | 403 | no | |
| `KHATA_MODULE_LOCKED` | 403 | no | |
| `WALKIN_KHATA_BLOCKED` | 422 | no | |
| `CREDIT_LIMIT_EXCEEDED` | 422 | no | |
| `BELOW_COST_PIN_REQUIRED` | 422 | no | |
| `NO_PHARMACIST_ON_DUTY` | 422 | no | |
| `DOCTOR_REQUIRED` | 422 | no | |
| `ALLERGY_ACK_REQUIRED` | 422 | no | |
| `INSUFFICIENT_TENDER` | 422 | no | |
| `TENDER_INVALID` | 422 | no | not cash/khata; or kiosk+khata |
| `KIOSK_TOKEN_EXPIRED` | 409 | no | |
| `KIOSK_SCHEDULED_BLOCKED` | 422 | no | should not happen if kiosk filtered |
| `IRN_UNAVAILABLE` | 503 | yes | draft saved, no stock |
| `OVERRIDE_EXPIRED` | 422 | yes | re-PIN |
| `PIN_ROLE_INSUFFICIENT` | 403 | no | |
| `NETWORK` | 503 | yes | gateway |

Allergy ack: `POST /pos/allergy-ack` `{ client_charge_id, customer_id }` after staff confirms → `{ allergy_ack_token }` (120 s, bound to charge id + allergy hash).

### 7.6 Bills read, print, share

#### `GET /bills/:billId`

Full bill + lines + payment. Tenant-scoped. Used by invoice modal, Orders, Sales, Dashboard recent.

#### `GET /bills/:billId.pdf`

GST invoice PDF (settings template). 404 if `draft_irn`.

#### `GET /bills/:billId/print?fmt=thermal|a4`

HTML for browser print. Thermal 80 mm.

#### `GET /bills/:billId/whatsapp-share`

Returns `{ wa_me_url, body }`. Does not send.

#### `POST /bills/:billId/irn-retry`

Owner/Manager. Only `draft_irn`. On IRN success, runs the same TX as Charge step 19 (must use original `client_charge_id` / lines). On fail, remains draft.

### 7.7 Domain services called inside the Charge TX

TypeScript shapes the Charge Lambda **must** call (implementations live in the owning modules; POS orchestrates):

```ts
inventory.decrementBatches(tx, { tenantId, locationId, lines: { batchId, qty }[] }): Promise<void>
// UPDATE batches SET qty = qty - :qty WHERE id=:id AND tenant=:t AND qty >= :qty
// throws StockInsufficientError if any row updates 0

statutoryRegisters.appendScheduledSale(tx, { billId, tenantId, locationId, lines, patient, doctor, pharmacist, actor }): Promise<void>
// only H1 and X lines (and H if that register is configured — v1 legal printout is H1 and X)

khata.postSale(tx, { tenantId, customerId, billId, amountPaise, actor }): Promise<void>

crm.earnAndBurn(tx, { tenantId, customerId, billId, burnPoints, earnPoints, netCollectedPaise }): Promise<void>

booksGst.postSaleJournal(tx, { bill }): Promise<{ journalId: string }>
// Dr Cash in till | Dr Khata receivable
// Cr Sales (taxable)
// Cr GST output CGST/SGST or IGST
// Dr COGS / Cr Inventory
// Dr/Cr Round-off
// Dr Loyalty payable (redeem); Cr Loyalty payable (earn) as catalogue §3.23

audit.append(tx, { type: "bill.posted", actor, tenantId, before: null, after: bill })
```

IRN **outside** TX:

```ts
booksGst.requestIrn({ tenantId, draftPayload, idempotencyKey: client_charge_id }): Promise<IrnResult>
```

### 7.8 Event `BillPosted` (after commit)

Topic: `bill.posted`. Payload:

```json
{
  "event": "BillPosted",
  "billId": "uuid",
  "tenantId": "uuid",
  "locationId": "uuid",
  "invoiceNo": "INV-260001",
  "fy": "2026-27",
  "channel": "counter",
  "tender": "cash",
  "invoiceTotalPaise": 11800,
  "lines": [
    { "skuId": "uuid", "batchId": "uuid", "qty": 2, "schedule": "H", "lineSpPaise": 11800, "gstPaise": 1800 }
  ],
  "gst": { "taxablePaise": 10000, "cgstPaise": 900, "sgstPaise": 900, "igstPaise": 0, "roundOffPaise": 0 },
  "customerId": "uuid-or-null",
  "doctor": { "name": "Dr A", "registrationNo": "KA12345" },
  "pharmacistOnDuty": { "employeeId": "uuid", "name": "...", "registrationNo": "..." },
  "irn": null,
  "loyalty": { "redeemPoints": 0, "earnPoints": 1 },
  "kioskTokenId": null,
  "prescriptionId": null,
  "actor": { "userId": "uuid", "role": "cashier" },
  "postedAt": "2026-08-31T16:01:00.000Z"
}
```

Subscribers (do not re-compute GMV): `inventory` (already decremented; may refresh cache), `khata` (already written; ageing views), `statutory-registers` (already appended), `crm` (already lots), `books-gst` (already journal; event is for GSTR projection), `customers` (history), `orders` / `sales-ledger` / `dashboard` / `reports` / `admin-rx-compliance` (read models), `audit`.

**Assumption (normative for v1):** side effects are applied **synchronously in the Charge TX** via domain services. The event is for read models and HQ. If a subscriber is down, the Bill still stands; read models catch up.

### 7.9 Settings POS reads

`GET /settings/pos` → `{ hold_ttl_minutes: 30 }` (10–120).  
`GET /settings/invoice` → prefix, template=`thermal`|`modern`|`minimal`, toggles: `show_you_saved`, `include_doctor`, `show_hsn`, `print_bank`, `print_irn`.  
`GET /go-live/status` → `{ can_post_bills }`.  
`GET /statutory/duty/current` → `{ on_duty: bool, employee: {...} }`.  
`GET /plan/features` → booleans listed in §3.

### 7.10 UI props (React)

```ts
type PosAppProps = {
  locationId: string;
  features: {
    khata: boolean;
    customers: boolean;
    offers: boolean;
    crm: boolean;
    statutory: boolean;
    eInvoice: boolean;
  };
  canPostBills: boolean;
  holdTtlMinutes: number;
  invoiceSettings: InvoiceSettings;
  duty: { onDuty: boolean; pharmacistName?: string };
};

type PosPaymentStepProps = {
  tender: "cash" | "khata"; // no other union members in v1
  tenderedPaise: number | null;
  changeDuePaise: number;
  onCharge: () => void;      // "Charge & invoice" | "Record on credit"
  showUpi?: never;
  showCard?: never;
};
```

Screens: `PosCartPage`, `PosPaymentPage`, `HoldResumeDrawer`, `InvoiceModal` (print, pdf, whatsapp, Return, Cancel→returns), `SubstituteDialog`, `AllergyAckModal`, `PinDialog`, `DoctorPicker`.

No console chrome changes beyond the POS route. Kiosk fullscreen is `kiosk`.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Walk-in cash OTC**  
Given go-live is complete, cart has only OTC lines, no customer, Free plan  
When cashier tenders cash ≥ total and taps Charge & invoice  
Then a posted Bill exists, stock decremented, CGST+SGST invoice printed, no IRN, no H1/X line, till journal Dr Cash.

**US-2 Scanner auto-add**  
Given a unique in-stock barcode  
When the scanner types the barcode into the search box and sends Enter  
Then qty 1 of the FEFO batch is in the cart and the box is empty.

**US-3 Cannot oversell batch**  
Given batch qty = 2  
When stepper goes to 3  
Then increment is blocked; Charge with qty 3 returns `STOCK_INSUFFICIENT`.

**US-4 Concurrent last unit**  
Given batch qty = 1 and two cashiers Charge qty 1 at once  
When both requests commit  
Then exactly one Bill is posted and qty = 0; the other sees `CONCURRENT_STOCK` or `STOCK_INSUFFICIENT`; no negative qty.

**US-5 FEFO override**  
Given two in-date batches  
When cashier picks the later expiry  
Then PIN `fefo_override` + reason is required; without it Charge returns `FEFO_PIN_REQUIRED`; with it the later batch is billed and audit has reason.

**US-6 Expired batch hidden**  
Given only an expired batch  
When cashier opens the picker  
Then it is hidden; with PIN `expired_batch` it can be selected; Charge without token fails.

**US-7 Banned / DPCO**  
Given a banned SKU or MRP > DPCO  
When search or add occurs  
Then it cannot enter the cart (`BANNED_SKU` / `ABOVE_DPCO`).

**US-8 Substitutes**  
Given SKU is Out and a cheaper in-stock generic exists  
When cashier adds the Out SKU  
Then substitute prompt lists in-stock substitutes **and** the cheapest generic; replacing without confirm does not change the cart; confirm swaps the line.

**US-9 Scheduled without duty**  
Given an H1 line and no pharmacist on duty  
When Charge is attempted  
Then `NO_PHARMACIST_ON_DUTY` and no stock move.

**US-10 Scheduled without doctor reg**  
Given duty on, doctor name filled, registration empty  
When Charge  
Then `DOCTOR_REQUIRED`.

**US-11 Named + phone for scheduled and khata**  
Given walk-in cart with H SKU or tender khata  
When Charge  
Then blocked until named customer with phone is attached.

**US-12 Allergy ack**  
Given named customer with allergies  
When staff reaches Charge  
Then a modal lists allergies; Charge without ack fails; after Acknowledge (logged) Charge may proceed.

**US-13 Walk-in no allergy check**  
Given walk-in  
When Charge  
Then no allergy modal.

**US-14 Discount stack**  
Given items ₹1000, coupon ₹100, manual 10%, 50 loyalty pts, payable before loyalty = ₹810, cap = ₹162  
When cashier tries 50 pts  
Then redeem ₹50; a second coupon is rejected; invoice = round(items − coupon − manual − loyalty).

**US-15 Loyalty 20% cap**  
Given payable before redeem = ₹1000 and 400 points  
When redeem 400  
Then server applies 200 points (₹200) and preview shows `LOYALTY_CAPPED`.

**US-16 Below-cost PIN**  
Given stack drives line SP below batch cost  
When Cashier charges  
Then warn + `BELOW_COST_PIN_REQUIRED`; Owner/Manager PIN allows; Pharmacist PIN does not.

**US-17 Cash tendered and change**  
Given rounded total ₹118.00, tendered ₹200.00  
When Charge & invoice  
Then change due ₹82.00; Payment.method=cash; journal Dr Cash ₹118.00.

**US-18 Khata over limit**  
Given limit ₹500, outstanding ₹400, bill ₹200  
When Record on credit without PIN  
Then `CREDIT_LIMIT_EXCEEDED`; with Owner/Manager PIN the sale posts to khata.

**US-19 Walk-in khata blocked**  
Given no customer_id, tender khata  
When Charge  
Then `WALKIN_KHATA_BLOCKED`.

**US-20 Hold does not move stock**  
Given cart with qty 1 of the last unit, Hold tapped  
When 1 minute later another cashier charges that unit  
Then the second cashier succeeds; the hold still has a snapshot but Charge of the expired/conflicted hold later fails `STOCK_INSUFFICIENT`; hold itself never reduced qty.

**US-21 Hold expiry**  
Given TTL 30 min  
When 31 min pass  
Then hold is `expired`, cart discarded, qty unchanged.

**US-22 Abandoned cash drawer is a hold**  
Given Payment step open and network error / navigation away before post  
When staff returns to POS  
Then a HeldCart exists; no Bill; no stock move.

**US-23 Idempotent retry**  
Given Charge succeeded for `client_charge_id=X`  
When the client retries Charge with X after a timeout  
Then HTTP 200, same `bill_id`, `idempotent_replay=true`, stock decremented only once.

**US-24 Network drop**  
Given Charge in flight and the connection drops before response  
When stock is checked  
Then either 0 or 1 decrement, never 2; retry with same id is safe.

**US-25 IRN down default**  
Given B2B + e-invoicing on and IRP timeout  
When Charge  
Then `IRN_UNAVAILABLE`, `draft_irn` saved, stock unchanged.

**US-26 Issue without IRN**  
Given US-25 draft  
When Owner PIN `issue_without_irn`  
Then bill posts without IRN, stock deducts, audit logged.

**US-27 B2C never IRN**  
Given walk-in cash  
When Charge  
Then no IRP call.

**US-28 Printer fail**  
Given Charge 200 and printer offline  
Then Bill remains posted; Reprint works.

**US-29 Invoice unique per FY**  
Given two Charges in FY 2026-27  
Then invoice numbers differ; a voided draft does not reuse a posted number.

**US-30 Cancel never deletes**  
Given posted bill  
When staff taps Cancel  
Then they are sent to `returns` to issue a credit note; `DELETE /bills/:id` is not offered; GET still returns the bill.

**US-31 Kiosk token cash**  
Given a valid kiosk token hold  
When staff Charge cash against the token  
Then channel=kiosk, tender=cash, stock deducts now (not at token print).

**US-32 Locked period backdate**  
Given July locked  
When Charge with `bill_date` in July  
Then `PERIOD_LOCKED`.

**US-33 Go-live block**  
Given KYC pending  
When Charge  
Then `GO_LIVE_INCOMPLETE`.

**US-34 No UPI**  
Given Payment step  
Then only Cash and Credit (khata) [khata hidden if Starter locked]; no UPI/Card widgets.

---

## 9. Edge Cases & Error Handling (include §10 failure catalogue rows that apply)

Catalogue §10 rows that **apply to POS** and required behaviour:

| Catalogue event | POS behaviour |
|---|---|
| Network drop during Charge | Error toast; no second decrement; retry same `client_charge_id`. |
| Thermal printer offline | Bill posted; reprint. |
| IRP down / IRN reject | B2B not posted (default); Owner banner + WhatsApp from `books-gst`; POS shows `IRN_UNAVAILABLE` + draft. |
| Plan expired | POS cash remains; khata/coupon/loyalty/duty UI lock; scheduled charge still legally blocked without duty. |
| Banned / above DPCO | Cannot add to cart. |
| No pharmacist on duty | Cannot charge scheduled POS. |
| Walk-in + khata | Cannot charge. |
| Credit over limit | PIN required; else blocked. |
| Loyalty redeem > 20% | Cap applied; cannot exceed. |
| Second coupon on one bill | Blocked. |
| Expired batch | Hidden from default FEFO unless PIN. |
| Hold expired (30 min) | Cart discarded; no stock. |
| Locked period | Cannot post backdated bill into it. |
| Wizard / KYC incomplete | Cannot post first bill. |
| Concurrent last unit | One succeeds; other out of stock. |

Additional:

- **GST odd paisa:** leftover paisa on CGST when splitting halves.
- **Coupon + line deleted:** re-validate coupon; if applies-to that product only and line gone, drop coupon with toast.
- **Duty lapses while Payment is open:** Charge re-reads duty; fail `NO_PHARMACIST_ON_DUTY`; WhatsApp to chemist is `statutory-registers` (POS may toast).
- **Customer deleted between preview and charge:** `CUSTOMER_GONE`.
- **Zero invoice after discounts:** allow ₹0 cash bill (tendered 0, change 0); still post (samples/100% discount) with below-cost PIN if under cost.
- **Loose qty:** integer tablets only; no fractional qty in v1.
- **IGST without GSTIN:** never; missing GSTIN always intra B2C.
- **Khata + loyalty earn:** earn still computed on net collected (the khata amount).
- **Resume hold then charge with new lines:** allowed; snapshot replaced; `client_charge_id` stays.
- **Two devices resume same hold:** first wins; second `HOLD_NOT_OPEN`.
- **Scanner in Payment step:** ignored or still allowed to add? **v1: scanner only on Cart step** so Payment totals do not change under the cashier’s fingers. If they need to add, Back to Cart (abandoned payment becomes a hold per FR-81).
- **WhatsApp share fail:** it is a `wa.me` link — if WhatsApp not installed, browser shows the URL; no SMS fallback.
- **Feature flag shop-floor GMV:** POS **ignores** it in v1 and never shows UPI/Card even if HQ turns a flag on (flag is for a later release).

---

## 10. Open Questions / Assumptions

**Assumptions (implement these; do not block):**

1. Amounts are **integer paise** on the wire and in the DB.
2. Financial year is **1 April–31 March** `Asia/Kolkata`. Invoice seq is per location per FY.
3. Charge Lambda uses **one Postgres transaction** for domain services in §7.5; IRN HTTP is **before** that TX.
4. `BillPosted` is emitted **after commit** for read models; source of truth is the TX, not the bus.
5. H1 **and** X lines append to the pharmacy legal register; schedule `H` (non-H1) still requires doctor + duty but follows whatever `statutory-registers` specifies for the H register (if no H book, still snapshot doctor on the Bill).
6. Loyalty `percent` manual uses **basis points**; 10% = `1000`.
7. Earn uses `floor(invoice_total_rupees / 100)`.
8. Hold TTL default 30, Owner range 10–120, stored in `account-settings`.
9. Kiosk tokens are HeldCarts charged here as cash; TTL 30 min same as holds unless kiosk config overrides idle-reset (token unpaid expiry is **30 min** per catalogue even if idle-reset differs).
10. Multiple sessions allowed; PIN lockout 5 fails / 15 min is `auth`, not a POS-specific counter (except kiosk exit, which is `kiosk`).
11. English UI; i18n keys required.
12. `client_charge_id` UUID v4 generated when Payment opens or Hold is created.
13. No UPI/Card **rendered**, even as disabled buttons.
14. Regular GST dealers only; composition dealers cannot go-live (enforced in `go-live-kyc`, POS still checks).
15. “Pay later” is not a state — khata **is** Record on credit.
16. Invoice modal Return is a **route** to `returns?billId=`; POS does not POST credit notes.

**Open (safe defaults in parentheses):**

- Q1: Exact thermal CSS from Invoice Settings vs a POS-owned 80 mm layout? **Assume POS renders using `account-settings` template HTML.**
- Q2: Should schedule `H` (not H1/X) write a legal register row? **Assume Bill snapshot always; register append only H1/X as catalogue §3.22.**
- Q3: Reprint audit — **assume not required** for money log; optional `bill.reprinted`.
- Q4: Zero-value bills — **allow** with below-cost PIN if under cost.
- Q5: Interstate B2C without GSTIN — **assume intra-state B2C** (pharmacy state) per catalogue “typical counter intra-state B2C”.
