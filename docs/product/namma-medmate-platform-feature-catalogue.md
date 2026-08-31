# Namma MedMate — v1 Product & Application Spec

**Status:** v1 spec — all product calls in this file are settled.  
**Who this is for:** founders, product, engineering, QA, sales.  
**What this is:** the product we will sell **and** the application rules to build it. If a behaviour is not in this file, it is not in v1.

**Surfaces:** Pharmacy Partner Console (chemist) and Platform Admin HQ (Namma). English UI. All WhatsApp (alerts, campaigns, OTP) sends from **one Namma MedMate WABA**.

**How to use this file**

| You are | Use |
|---|---|
| Product / sales | Sections 1–4, 6 — what is sold and how it is gated |
| Engineering / QA | Sections 2, 5, 7–10 — invariants, failures, tenancy, security |
| Implementers | A module is done only when its **invariants** and **failure** rows pass |

---

## 1. What Namma MedMate is

Pharmacy SaaS: ERP + CRM for a neighbourhood **retail** chemist. The chemist pays a subscription. **One bill writes stock, GST invoice (with IRN when eligible), statutory registers, and ledgers.**

| Product | Who uses it | Job |
|---|---|---|
| **Pharmacy Partner Console** | Chemist / retail pharmacy | Counter + kiosk, stock, returns, khata, CRM, full GST books, staff |
| **Platform Admin HQ** | Namma MedMate | Sell and run subscriptions: plans, dunning, onboarding, master catalogue, Rx audit, GST on SaaS invoices |

**Scope:** standalone retail pharmacy. Design the data model for one shop; do not block branches (no stock-transfer or chain-HQ screens). **Branches are not a sold feature** — Pro is unlimited **seats**. Hospital / IPD, wholesale, diagnostics, insurance/TPA, and Jan Aushadhi are out of scope.

### 1.1 Personas

| Persona | Surface | Job |
|---|---|---|
| **Owner** | Pharmacy console | Run the shop, pay SaaS (Cashfree), KYC, GSTN credentials, period lock (Growth books), go-live wizard |
| **Manager** | Pharmacy console | Bills, stock, purchases, reports, CRM — not user-admin unless granted |
| **Pharmacist** | Pharmacy console | POS, Rx queue, inventory, duty clock-in |
| **Cashier** | Pharmacy console | POS, khata collect |
| **Kiosk shopper** | Kiosk mode | OTC self-order; cannot reach the console |
| **CA** | No-login share link | Read selected reports; files GSTN outside Namma |
| **Namma Super admin / Ops / Finance / Support / Compliance** | Admin HQ | SaaS, catalogue, Rx audit, dunning |

### 1.2 Tenancy

- One **pharmacy tenant** = one location (branch-ready id; UI is one shop).
- All stock, bills, customers, khata, registers, books, GSTN credentials belong to that tenant.
- Staff logins are tenant-scoped. A Namma admin is not a pharmacy user.
- The CA link is a time-bounded, report-scoped capability URL — not a console login.

---

## 2. How features are enforced

### 2.1 Subscription plan (pharmacy console)

Every pharmacy starts on **Free**. Core billing is free forever. Richer modules lock until the owner pays. An **expired** paid plan behaves like Free until renewed.

Prices (plus **18% GST** on checkout):

| Plan | Monthly | Annual (saving) | Seats | What it unlocks |
|---|---|---|---|---|
| **Free** | ₹0 | — | 2 users | Billing / POS & GST invoices · **Orders (today + last 7 days)** · Inventory (batches & expiry) · Purchases / goods-inward · Returns · Opening stock CSV · Invoice Settings · **Manage Users** (up to 2 seats) |
| **Starter** | ₹699 | ~5% off | 2 users | Everything in Free + **Prescriptions, Customers, Credit / Khata, H1/X registers, pharmacist-on-duty, licence alerts, Employees** + WhatsApp support |
| **Growth** | ₹1,499 | ~15% off | 5 users | Everything in Starter + **Sales ledger (365-day + export), Reports, CRM, CA sharing, full books + GSTN prepare + IRN, stock take, Reorder, Distributors, Offers, Expenses, Rack map** |
| **Pro** | ₹2,999 | ~20% off | Unlimited | Everything in Growth + **locked Self-Order Kiosk, unlimited seats**, priority WhatsApp support |

**Not sold in v1:** extra branches as a feature, attachable add-ons (e-invoice / WhatsApp / extra seat / API / analytics SKUs). Seats and modules come **only from the plan**. Extra seat = upgrade plan.

**Always reachable, even on Free:** Dashboard, **Orders (7-day)**, Account, Subscription, Settings, Help & Support, Refer & Earn, **Manage Users** (seat-capped).

Locked pages show a lock icon. Opening one shows a paywall naming the required plan and price. **SaaS checkout** is **Cashfree** (UPI / card / net-banking). The owner can switch Monthly ↔ Annual, upgrade, downgrade, or renew. Billing history keeps GST invoices. Auto-renew can be toggled. An expired paid plan **revokes** Growth/Pro/Starter modules immediately; data is retained; Free modules stay usable.

### 2.2 Staff roles and module permissions

HR records (**Employees**) and logins (**Manage Users**) are separate.

| Role | Default access |
|---|---|
| **Owner** | Everything. Role and access cannot be reduced. |
| **Manager** | Dashboard, billing, orders, prescriptions, credit, inventory, purchases, racks, distributors, reports, CRM — not user-admin / settings unless granted |
| **Pharmacist** | Billing, orders, prescriptions, inventory, racks, CRM |
| **Cashier** | Billing / POS, counter bills, credit (khata) |

The owner can tick/untick per-module permissions, reset to role defaults, or select all. Adding a user is blocked once the **plan seat limit** is reached (2 / 5 / unlimited). Inactive users can be toggled off without deleting the HR record.

**Login (Owner configures per user in Manage Users):**

- At least one of **password** or **WhatsApp OTP** must be enabled. Both may be on — staff picks at the login screen.
- **Counter PIN** (4–6 digits, hashed): kiosk exit, FEFO override, below-cost / credit-limit override, and **saved-device unlock**.
- **Saved login (faster return):** after a successful password or OTP on a device, staff may tick “Remember this device” (30 days). Next visit on that device: **PIN only**. Owner can revoke all saved devices for a user. New browser / cleared storage = full password or OTP again.
- Credentials (login ID, temp password if set) can be copied or shared via **WhatsApp** as a pre-filled message — nothing is sent automatically.

### 2.3 Clinical and legal rules (not plan-based)

- **Schedule tags** on every SKU: OTC, H, H1, X. Scheduled items show a tag on the product card and on invoices.
- **Prescribing doctor is mandatory** on a **staff POS** bill that contains a scheduled medicine.
- **Registered pharmacist on duty** is mandatory before a scheduled sale at the **staff POS**.
- **Kiosk sells OTC only.** H, H1, and X SKUs do not appear on the kiosk. Scheduled stays at the staff POS.
- **2-hour prescription SLA** on the in-console queue. Overdue items ping the chemist on WhatsApp.
- **DPCO / price ceiling** on the platform master; pharmacies cannot sell above it.
- **Banned SKUs** are un-mapped from every pharmacy.
- **H1 and X registers in the pharmacy console are the legal record** (print/export for the drug inspector). HQ keeps a **read-only audit copy** (flag / verify only — not the inspector’s copy).
- **Allergy check** at charge if the named customer has allergies on file. Staff may proceed only after an on-screen acknowledge (logged). Walk-in with no profile: no check.
- **Substitute prompt:** (1) when the SKU is short or out, offer in-stock substitutes; (2) always offer the cheapest in-stock generic. Pharmacist confirms before replace. On the kiosk, substitutes are **OTC only**.
- **Kiosk** is software fullscreen on the **same browser / tablet as POS**: no console chrome, no other screens, no browser chrome the shopper can use to leave kiosk mode. Staff **exit PIN** is the only way back to the console. Non-Pro cannot open kiosk UI.
- **Licence expiry** (drug licence, FSSAI, pharmacist registration) alerts on WhatsApp at 60 / 30 / 7 days.
- **H1/X bill line** must carry: patient identity (name + phone if named), **doctor name + registration number**, drug, batch, qty, bill no, pharmacist on duty. Name-only doctor is not enough for production.
- Campaigns and refill WhatsApp go only to patients with a phone **and** marketing/refill **consent** on the 360. Opt-out stops further campaigns. Transactional (OTP, bill share the user requested, licence alerts to the owner) do not need marketing consent.

### 2.4 Money, GST, and credit

**v1 pharmacy tenders (GMV):** **Cash** or **Credit (khata)** only. One tender per bill. No split. **No UPI, no card, no Cashfree on the shop floor in v1.**

**Later (not v1):** UPI / Card via **Cashfree on Namma’s merchant account**; pharmacy bills tagged by tenant; Namma **settles GMV to the chemist T+1 or weekly, minus nothing** (SaaS fee is a separate invoice). Until that ships, do not show UPI/Card on POS or kiosk.

- **Cash:** staff enters **tendered** (notes/coins); system shows **change due**. Cash posts to till. No payment processor.
- **Khata:** “Pay later” and “Record on credit” are the **same ledger**. Named customer with phone required. Walk-in cannot take credit. Optional **credit limit** (Owner sets on the customer). Over-limit charge needs **Owner/Manager PIN** (logged).
- Khata dues **age** into current / 30–60 / 60+ day buckets. Overdue 30+ days is flagged. Reminders on WhatsApp.
- **SaaS invoices** (the chemist paying Namma) remain **GST 18% (SAC 9983)**, collected via **Cashfree**. That is not shop GMV.

**GST on a retail bill**

- **MRP is GST-inclusive.** Tax is recomputed on the **discounted selling price** after coupon + manual discount + loyalty redeem.
- Per line: `taxable = SP × 100 / (100 + rate)`; `GST = SP − taxable`; split CGST+SGST or IGST from place of supply.
- **Round-off:** invoice total rounds to **2 decimal places**; round-off line posts to the books (not silently eaten). Cash **change due** is from the rounded total.
- **Regular GST dealers only.** Chemist **prepares** GSTR-1 / GSTR-2B / GSTR-3B and the CA pack. **The CA files** on GSTN. **GSTN and IRP credentials are stored per pharmacy in Namma** (encrypted; Owner only to view/edit).
- **B2C (walk-in / no GSTIN on the bill):** GST tax invoice, **never IRN**.
- **B2B (customer GSTIN on the bill):** request **IRN** only when **e-invoicing is enabled** on that pharmacy GSTIN. If IRP is down, bill is **held as draft** — stock must not deduct until IRN success or Owner confirms “issue without IRN” (logged). Default: do not deduct on IRN failure. Credit notes follow the original IRN.
- **Place of supply:** same state as the pharmacy → CGST+SGST. Other state + GSTIN → IGST. Kiosk and typical counter are intra-state B2C.
- **Invoice number:** unique per pharmacy per financial year. Never reuse. Credit notes have a separate prefix.
- **GSTR-2B:** pull from GSTN and **match** to GRNs (matched / mismatch / missing). Chemist marks ITC claim / unclaim. CA still files.
- **Credit notes:** GST reason (sales return / post-sale discount / other). **No customer debit notes** in v1.
- **TDS/TCS:** profile flags only. Report rows exist but **do not auto-withhold** in v1 (always empty unless later specified).

**Stock and hold**

- **Cannot sell more than available batch qty.** No negative stock.
- **FEFO default.** Pharmacist may pick a later batch with **PIN + reason** (logged).
- **Hold / park bill:** cart can be parked; **stock is not deducted** until Charge. Auto-expire after **30 minutes** (Owner can set 10–120). Expired hold discards the cart; no stock movement. A failed or abandoned cash drawer is a hold — not an unpaid bill.

**Loyalty (earn / burn)** — Growth CRM; redeem at POS when the module is unlocked

- Earn **1 point per ₹100** of **net collected** (GST-inclusive total after coupon, manual discount, and redeem). Khata bills **earn**.
- Redeem **1 point = ₹1**, capped at **20% of that bill’s payable** (before this redeem). Named customer required. Redeem allowed on khata.
- Points **expire 12 months** after earn (FIFO lots).
- A **return / credit note reverses** earn and burn that originated on that bill.
- **Stacking on one bill:** exactly **one coupon + loyalty redeem + one manual ₹ or %**. Below-cost after stack: warn; Owner/Manager PIN (logged).
- Shop **Refer & Earn ₹500** is **SaaS credit** (both chemists), not shop khata. CRM patient referral remains **₹100 via khata**.

**Period lock:** Owner locks a month or FY. Posted documents in a locked period cannot be edited. Corrections = credit note or reversing journal **in the open period**. FY lock **carries opening balances** into the next FY (cash, bank, khata, AP, inventory, GST control, loyalty liability, equity).

Bill = items (GST-inclusive) − coupon − manual − loyalty (+ round-off). No delivery fee.

### 2.5 WhatsApp is the only channel (alerts + OTP)

Every automated ping to chemist, staff, or named shop customer is **WhatsApp**. Login OTP (when that method is enabled) is **WhatsApp**. All of it sends from **one Namma MedMate WABA** (the chemist does not connect their own WhatsApp number). The shop name appears in the template body.

**OTP:** 4-digit, 10-minute expiry, 5 attempts then lock 15 minutes, resend cooldown 30 seconds. Password and PIN use the same 5-fail / 15-minute lock. **v1: multiple sessions allowed, each audited.**

**Send failures:** retry 3 times with backoff. No SMS fallback. Failed sends sit in WhatsApp inbox as Failed. Owner WhatsApp for GSTN/IRN/licence failures is mandatory-path (must succeed or surface a console banner until acknowledged). If WhatsApp OTP cannot be delivered, staff uses **password** (if enabled) or Owner resets PIN/password. No SMS backup code.

Printing, in-app toasts, and on-demand “share bill” (pre-filled WhatsApp the user taps send) stay.

Prescriptions enter the queue **only when staff uploads** a photo/PDF at the counter. The product does not ingest patient WhatsApp media. If a patient sent an Rx on personal WhatsApp, staff still uploads it.

### 2.6 Language and branches

**English** ships. The console, invoices, and WhatsApp templates are **i18n-ready** so language packs can be added later without a rewrite. Per-pharmacy default + per-user override when packs exist.

Every shop record is a **location**. UX is one location. **`location_id` is on every query (schema-ready).** Pro does **not** include a branches product: no stock-transfer, no extra GSTIN, no chain HQ. Do not put “unlimited branches” on the Pro card.

### 2.7 Hardware

Browser POS (internet assumed — **no offline queue**). If the network drops mid-charge, show error; **do not** deduct stock twice. Charge is idempotent on `client_charge_id`.

**Thermal printer** (80mm GST invoice / token). Print failure does not roll back the bill; staff reprints.

**Barcode scanner** types into the same search box (USB / HID).

**Kiosk** uses that **same browser / tablet**. Staff launches **kiosk mode**: software fullscreen so the shopper cannot switch screens, open another tab, or reach the rest of the console. Exit PIN. No separate kiosk OS profile. (Software cannot fully lock the OS; production install guide: dedicated tablet, OS kiosk/fullscreen recommended as ops, not a v1 product module.)

**Kiosk payments (v1):** **no processor on the kiosk.** Shopper gets a **pickup token** and pays **Cash at staff POS** (one tender). UPI/Card on kiosk wait for the Cashfree GMV release.

### 2.8 Audit

Every bill, return, GRN, write-off, khata repayment, duty clock, plan change, GSTN credential edit, IRN request, login-method change, and admin action stores: actor, role, tenant, timestamp, before/after where money or stock moved. The Audit Trail report reads this log. Logs are append-only.

### 2.9 Go-live wizard (Owner)

No console **posted bill** until Namma **KYC is approved** and the Owner completes the wizard (or confirms skips where allowed):

1. Pharmacy profile — GSTIN, licences + expiry, registered pharmacist, e-invoicing on/off.
2. Opening stock CSV — may be **zero**.
3. Opening books — cash in till; optional opening khata and AP. **“Start at ₹0”** skip allowed.
4. Invoice prefix + thermal **print sample**.
5. First user (if not Owner-only) + counter PIN.

Re-run from Settings. KYC reject blocks go-live even if the wizard is filled.

---

## 3. Pharmacy Partner Console

Sidebar groups: **Main · Catalogue · Business · Account**. Live badges: pending **Prescriptions**.

### 3.1 Dashboard — always on

Time-aware greeting, month-to-date revenue, average bill today, items sold today, **Dues to collect** when khata is outstanding.

KPI cards: today’s sales (counter vs kiosk, day-over-day %, 7-day sparkline); bills today; prescriptions pending review; stock alerts (low + expiring).

Quick actions: **New sale · New purchase · Prescriptions · Reorder**.

Sales analytics: metric (Revenue / Orders), window (7D / 30D / 12M), chart (Donut / Grouped bars / Line). Legend: Counter, Kiosk.

Breakdown: channel split, payment-mode mix (v1: Cash vs Khata), top categories.

**Needs your attention:** prescriptions to Verify, low-stock to Restock.

Also: expiring-soon list, top sellers (7 days), recent transactions that open the bill.

Numbers come from the same sales and stock as the rest of the console.

---

### 3.2 Billing / POS — *Free forever*

Two-step flow: **Cart & customer → Payment**.

- Scan or type barcode / batch. Search by name, salt, brand, or rack. Category chips (Fever, Cough, Diabetes, Heart, Stomach, Vitamins, Skin, Baby, Devices, Personal, Ayurveda, First Aid).
- Product cards: pack, rack, price, stock (OK / Low / Out), schedule tag. **Loose** sells per tablet. Prices shown are **GST-inclusive MRP** (capped by DPCO).
- Cart: quantity stepper, **batch picker (FEFO by default)**; later batch needs **pharmacist PIN + reason**. GST %, line totals, Clear cart, **Hold bill**.
- Customer name + phone (phone optional for walk-in; scheduled sale and **any khata** require a named customer with phone). **Doctor name + registration number** mandatory if any scheduled medicine is in the cart (picker from the shop’s doctor list; can add inline).
- Substitute prompt and allergy check as in 2.3. Scheduled sale blocked unless a pharmacist is on duty.
- Discount stack: **one** coupon (Growth Offers) + **one** manual flat ₹ or % + **loyalty redeem** (named customer; 1 pt = ₹1; max 20% of payable). Below-cost: warn; Owner/Manager PIN (logged).
- Pay with **exactly one** of: **Cash** · **Credit (khata)**. Cash: tendered → change due. Khata: credit-limit check; over-limit = Owner/Manager PIN.
- **Hold:** park the cart (no stock move). Resume from Holds / Orders. Auto-expire 30 min (10–120).
- Finish with **Charge & invoice** (cash) or **Record on credit** (khata). There is no separate “Pay later” state. Charge is idempotent. Stock deducts only after the bill is **posted** (cash confirmed or khata confirmed). B2B + e-invoice on: wait for IRN as in 2.4.
- Invoice: GST tax invoice (B2C) or IRN invoice (eligible B2B), share WhatsApp, thermal print / Save PDF. Reprint anytime. **Cancel = credit note**, never delete.
- **Return against this bill** (credit note) from the invoice modal.

**POS failures:** scanner miss → manual search. Printer fail → bill stands, reprint. Network fail → no double stock. Allergy warn → acknowledge. Out of stock → cannot increment qty. Scheduled without duty/doctor → cannot charge. Walk-in + khata → blocked. Locked period → cannot post a backdated bill into it. Credit over limit without PIN → cannot charge.

Stock deducts on sale. The same bill appears in Orders (7-day on Free; full on Growth Sales), GST reports (Growth), H1/X registers when scheduled, and the named customer’s history.

---

### 3.3 Orders — bill board  · *Free (today + last 7 days)*

One board for every bill (counter + kiosk) in the **last 7 days including today**. Extra filter: **Held** (parked carts, not yet billed). Bills older than 7 days: row links to **Sales** (Growth paywall if not on Growth).

Filters: **All · Counter · Kiosk · Khata outstanding · Held**. Search by invoice, name, or phone.

| State | Staff can |
|---|---|
| Khata outstanding | **Record repayment** (same as 3.7) |
| Any posted | History, Share bill (WhatsApp), Print invoice, **Return** |
| Held | Resume / discard |

Detail: facts, status timeline, linked prescription, itemised bill.

---

### 3.4 Sales — full sales ledger  · *Growth*

Every sale from day one for audit.

Date range (default last 365 days). Export **Excel + formatted PDF**. Summary: period, bill count, units, gross, GST, net collected. Filters: channel, payment mode (Cash / Khata), paid-status. Sortable table with a totals footer. Row actions: Record repayment (if khata), History, Share, Invoice.

POS and 7-day Orders remain Free so a shop can still bill and find today’s invoice on day one.

---

### 3.5 Prescriptions — review & dispense  · *Starter*

Clinical queue for **staff-uploaded** paper prescriptions (photo/PDF at the counter).

KPIs: Pending review (with over-SLA count), Awaiting dispense, Dispensed today (count + value), Average turnaround, SLA on-time %. Overdue banner at **2 hours**.

Status tabs: Pending / Approved / Dispensed / Rejected / All. Source: **Uploaded at counter**.

Cards (urgent first): patient, doctor (name + reg. no.), verified medicines with stock and price, out-of-stock warnings, estimated bill.

Actions: **Reject** (preset reasons: illegible, unverified prescriber, expired, not stocked — or custom; patient is asked to re-send via WhatsApp) · **Approve** · **Dispense** · **Dispense → billing** (verified basket lands in POS).

Allergy and substitute checks run when dispensing into POS. H1/X lines post to the **pharmacy legal register** (3.22). SLA clock starts at upload. Reject reasons are logged. A rejected Rx cannot be dispensed. Dispense without stock on a line is blocked.

---

### 3.6 Customers — database & history  · *Starter*

Named customers vs walk-ins.

KPIs: named customers, lifetime sales, repeat customers, patients on chronic Rx, credit outstanding.

Search, sort (Top spenders / Most orders / Recent), export Excel + PDF.

Table: Rx tag, Due tag, phone, order count, units, last visit, loyalty points (**1 point per ₹100** net collected), lifetime value, **credit limit**.

Customer 360: summary, khata with repayment + reminder, **credit limit**, full ledger, purchase history, **New sale** shortcut.

Walk-ins still bill on Free; named CRM starts here. Go-live may import customers later; v1 named customers are created at POS / this screen.

---

### 3.7 Credit · Khata — receivables  · *Starter*

Digital *udhaar*. **This is the only receivables ledger.** POS “Record on credit” writes here.

KPIs: total outstanding, overdue 30d+, collected this month (collection rate), all-time credit given.

Ageing chart (current / 30–60 / 60d+) — click a band to filter. Tabs: Outstanding · Payment history. Overdue-only toggle. Sort by amount or oldest. **WhatsApp Remind** per row. **New credit sale** shortcut.

Khata modal: record repayment (quick chips ₹500 / ₹1000 / ₹2000 / Half / Full — **cash** in v1), WhatsApp reminder, unpaid bills oldest-first, full ledger.

Recording a khata sale here and charging on credit at the counter are the same ledger.

---

### 3.8 CRM · Patients — retention  · *Growth*

| Tab | What the owner can do |
|---|---|
| **Overview** | Patients, active (30d), at-risk, refills due, loyalty points, avg rating. Segment bars (Chronic, High value, Lapsed, New, On credit, Regular). At-risk table with WhatsApp **Win back**. |
| **Patients & Segments** | Filter by segment. RFM score, loyalty tier, points, orders, last visit, LTV. |
| **Reminders** | Refills due in 14 days. WhatsApp refill + follow-up (logged). |
| **Loyalty** | Points outstanding and **₹ liability** (1 pt = ₹1). Tiers: **Silver 12+ / Gold 50+ / Platinum 120+** visits. Per-customer Redeem. Referral: both parties **₹100** (applied via Khata). Expiry: lots older than 12 months drop off the liability. |
| **Campaigns** | Target a segment, WhatsApp from the **Namma MedMate WABA**, optional offer, editable template. History with attributed revenue (bills with that offer code in the next 14 days). |
| **Feedback** | Log stars + NPS + comment, or request via WhatsApp. Promoters / detractors. |
| **Analytics** | Avg LTV, retention %, churn risk, campaign sales, RFM leaders. |

Patient 360: WhatsApp / **Call** (`tel:` — no telephony product) / Refill / Redeem / New sale; medicines bought; clinical profile (age, gender, blood group, conditions, **allergies**, address, **consent** for refill + marketing). Allergy list is what POS and kiosk check.

Campaigns only go to patients with a phone **and marketing consent**. **Loyalty redeem at POS** reduces points and the payable in the same bill posting; Dr loyalty liability. Earn credits loyalty liability. Kiosk never redeems.

---

### 3.9 Inventory — stock, batches, expiry  · *Free forever*

KPIs (click to filter): total SKUs & units, stock value at cost (with margin %), retail value at MRP, low-on-stock, expiring ≤ 4 months (₹ at risk), dead stock > 90 days.

Tabs: All · Alerts · Low stock · Expiring · Rx-only · Out of stock · Unallocated.

Search by name/salt/brand or rack code. Export Excel/PDF. Shortcuts to Rack map and Add-stock-via-purchase.

Per row: schedule tag, rack chip, batch count + earliest expiry, stock pill, MRP, stock value, **loose-selling toggle**, Edit.

Product 360: in-stock, cost/MRP, margin, units sold 30/90d, days of cover, last sold, batch table, recent movement.

Edit: name, composition, manufacturer, pack, category, form, schedule, HSN, GST %, racks, reorder level, photo, loose toggle.

**New products are created through Purchases, not here.** Opening stock for go-live is **Excel/CSV** (and a books journal in 3.23 if needed). Stock moves from purchases (in), sales (out), returns, write-offs, and **stock take**. FEFO at billing (override: pharmacist PIN + reason).

**Stock take** · *Growth:* count sheet (by rack or SKU) → system vs counted → variance → **Post adjustment** (journal + batch qty). Cannot post into a locked period. Export blank count sheet; import counted qty.

After GRN: **Print batch / barcode labels** (SKU, batch, expiry, MRP) for the thermal printer. Rack labels remain on Rack map.

---

### 3.10 Rack & Locations  · *Growth*

KPI: racks created, zones, medicines mapped, unlocated items.

Tabs: **Rack map** (create by code, grid of racks, add/remove medicines, delete empty racks) · **Assign locations** (Rack / Shelf / Bin builder, bulk-assign, “only unlocated”, inline set-location). Print cut-and-stick rack labels. Export storage audit.

POS still searches by rack on Free if locations were already assigned.

---

### 3.11 Purchases — goods inward  · *Free forever*

KPIs: purchases this month, **input-GST credit claimable**, total GRNs.

List: GRN id, distributor, invoice no, date, lines, taxable, GST, total, Stocked status.

New purchase: distributor + invoice + date; **bulk CSV import** (template download; matches existing products, creates new ones); per-line picker or new-product creation with batch, expiry, qty, **free qty (scheme)**, PTR, MRP, GST %. **Save & update stock** tops up matching batches or creates new ones and refreshes MRP/cost. Duplicate distributor invoice no for the same distributor in the same FY is blocked.

This is the path new SKUs enter the shop (alongside opening-stock CSV). Input GST here is what GSTR-2B / GSTR-3B later subtract. GRN cannot post a batch with expiry in the past. Free qty (scheme) has cost 0 and still enters stock. After save: **Print labels** for each new/updated batch.

---

### 3.12 Reorder · Distributor  · *Growth*

KPIs: items below reorder level, distributors to order from, estimated savings vs priciest source, open POs.

Suggested orders **grouped by cheapest distributor** (including free-goods schemes). Each row: in-stock, reorder level, landed price with **Best price** badge, savings/pack, “switch to cheaper distributor”, quantity stepper. **Send order** raises a PO.

PO table: Draft / Sent / Received, with **Record GRN** and **Mark received**.

---

### 3.13 Distributors  · *Growth*

- **Directory** — firm, contact, GSTIN, drug licence, address, payment terms, outstanding, active toggle. Add / edit / remove.
- **Supply list** — which SKUs each distributor supplies, purchase price, scheme, landed cost, MRP, margin, price rank, preferred-source star.
- **Price compare** — side-by-side quotes, best price, saving/pack, “only multi-source” toggle.

Outstanding payable here is the shop’s accounts-payable view.

---

### 3.14 Offers  · *Growth*

Create: title, coupon code, % or flat ₹, applies-to (all / category / one product), running/paused, delete. Applies at **POS** (and kiosk price display). **One coupon per bill.**

---

### 3.15 Self-Order Kiosk  · *Pro*

In-shop **OTC** self-order on the **same tablet/browser as POS**.

Config: display name, welcome message, **staff exit PIN**, idle-reset timer, theme (Green / Dark / Gold), show prices. v1 accepted settlement: **cash at staff POS via token** only.

**Fullscreen kiosk mode:** software covers the whole screen. No console sidebar, no Account/Settings, no other tabs, no URL bar the shopper can use. They cannot change screens. **Exit PIN** is the only way back to the staff console. Idle reset clears the cart. **Non-Pro:** sidebar lock + paywall; no working kiosk preview.

**Catalogue:** OTC SKUs only. H / H1 / X are hidden. Substitute suggestions are OTC only. No prescription upload. No doctor field. No khata. No loyalty redeem.

**Named customer (optional):** shopper may enter **phone + WhatsApp OTP** to attach an existing profile (or create a named OTC profile). That enables **allergy check**. Skip = walk-in OTC (no allergy check). Still no loyalty, no khata, no scheduled SKUs.

**Flow:** category chips → tap-to-add → optional identify → **print pickup token** → staff POS charges **Cash** against that token (one tender). Stock deducts only when the staff bill is **posted**. Token unpaid after 30 min: cart expired, no stock move.

---

### 3.16 Reports — *Growth*

Searchable catalogue, grouped:

**Favourite:** Balance Sheet · **Trial Balance** · GSTR-1 (Sales) · Profit And Loss · Sales Summary

**GST:** GSTR-2 (Purchase) · **GSTR-2B match** · GSTR-3B · GST Purchase (with HSN) · GST Sales (with HSN) · HSN-wise Sales Summary · TDS Payable · TDS Receivable · TCS Payable *(TDS/TCS reports are stubs in v1)*

**Transaction:** Audit Trail · Bill-wise Profit · Cash and Bank · Daybook · Expense Category · Expense Transaction · Purchase Summary · Credit notes · Purchase / expiry returns · Stock take variance

**Item:** Item Report by Party · Item Sales and Purchase Summary · Low Stock Summary · Rate List · Stock Detail (batch & expiry) · Stock Summary

**Party:** Receivable Ageing · Party Report by Item · Party Statement (Ledger) · Party-wise Outstanding · Sales Summary – Category Wise

Each report: period (Day / Month / Year / FY / Custom / All), table with totals, **Excel + PDF**.

Analytics dashboard: Overview (net revenue, gross profit, margin, units, net GST, top items, channel/payment mix) · Sales register · Products (units, revenue, COGS, profit, margin, dead-stock flag) · Accounts & GST (P&L card, GST by slab with ITC and net payable, cash & collections, purchases, day book).

Figures are the same journals the books already posted.

---

### 3.17 Expenses  · *Growth*

Period + category + search. Categories include salaries, rent, electricity, telephone, stationery, repair, transport, raw material, marketing, bank charges, miscellaneous. **Recording an expense is not a payroll run.**

Create: date, paid-to, category, payment mode (v1: cash / bank / UPI recorded as bank — not Cashfree GMV), amount incl. GST, GST %, note — live taxable / GST / **input-credit** breakdown. Delete row. Excel + PDF.

GST on expenses feeds ITC; totals feed P&L.

---

### 3.18 CA / Accountant  · *Growth*

Share a **no-login link** with a CA: pick period, advisor, and reports (GST, Sales, P&L, stock, trial balance…). Manage advisors (firm, email, phone). Snapshot: GSTIN, net revenue, output GST, input credit, net GST. Sharing history.

**CA pack files:** **GSTR-1 JSON**, **GSTR-3B JSON**, and **Excel** of the selected reports. Not Tally XML in v1. Chemist prepares; **CA files on GSTN**. The CA sees selected reports only — not the whole console. Pack contains **no** GSTN/IRP secrets and **no** Rx images.

---

### 3.19 Account, staff, invoice, subscription, settings

**Account** (always): logo, name, plan, business type, member-since, **Run setup wizard** / Edit profile. KPI tiles (plan, team, seats, invoices, lifetime sales, profile-complete %). Plan & usage bars. Profile checklist (logo, signature, GSTIN, PAN, drug licence, FSSAI, bank) each linking to the right screen. KYC card: GSTIN, PAN, Drug Licence, FSSAI, registered pharmacist, e-Invoicing, bank. Sign out, export summary, contact support (WhatsApp).

**Employees** (Starter): **HR directory only** — not payroll. Distinct from logins. Position/status filters, CSV, Add Employee. Headcount and role-composition bars (not salary runs). Form: photo, personal, employment, PAN/Aadhaar, documents, salary bank (IFSC/UPI) as **master data**, emergency contact, **ID card** generator. Registered pharmacists from this list clock in for duty. No PF/ESI, no payslip, no salary posting.

**Manage Users** (Free, seat-capped): seats vs plan, Add user (disabled at cap). Role dropdown (Owner locked), login ID, **password** (set / reset / copy), **WhatsApp OTP on/off**, **counter PIN** set/reset, **saved devices** list + revoke, permission grid, active toggle, share credentials via WhatsApp, remove.

**Invoice Settings** (Free): template (modern / minimal / **thermal** — default for the counter printer), accent colour, logo, signature/seal, title, invoice prefix, signatory label, bank details, T&C, footer. Toggles: show “you saved…” on MRP, include doctor, show HSN, print bank, **print IRN / ACK when present**. Live preview + Print sample. Printer: browser print dialog to a thermal device (80mm). Label template for GRN batch stickers.

**Subscription** (always): status banner, auto-renew, Monthly/Annual, plan grid, billing history, **Cashfree** checkout for **SaaS fees**.

**Refer & Earn** (always): personal code, copy/share, both parties earn **₹500 SaaS credit**, referrals table.

**Settings — Pharmacy Profile** (always): identity & tax (GSTIN, e-Invoicing, PAN, Drug Licence, FSSAI, TDS/TCS flags, registered pharmacist); **licence expiry dates**; classification (retail, **Regular GST**); **GSTN / IRP credentials stored in Namma** (encrypted; Owner-only; used to pull GSTR-2B and request IRN; CA still files); **re-run setup wizard**. No chemist-facing Cashfree merchant keys (GMV processor is future, Namma-owned).

**Help & Support** (always): WhatsApp chat / call / help centre, FAQ, raise-ticket form.

---

### 3.20 Returns — customer credit notes  · *Free (tied to POS)*

Reverse a counter or kiosk bill without deleting history.

- Find original invoice → **Return**.
- Full or line-level qty. Reason mapped to GST: customer changed mind / wrong item / damaged / expired at home → **sales return**; owner-initiated price correction → **post-sale discount**; other.
- Destination: **Restock** (same batch) or **Write off**.
- Posts a GST **credit note** (prefix from Invoice Settings). IRN credit-note when the original had an IRN.
- Refund: **cash** or **back to khata**. Cannot return more than billed. Reverses loyalty earn/burn on that bill.

H1/X returns also reverse the **pharmacy legal register**.

---

### 3.21 Purchase & expiry returns to distributor  · *Free (tied to Purchases)*

- **Purchase return:** against a GRN (wrong / excess / damaged). Debit note, stock out, AP reduced.
- **Expiry return calendar:** batches expiring inside the distributor’s return window; raise return; track claimed / accepted / credit received.
- Near-expiry can go to **Offers** (markdown) instead of return — chemist chooses.

Cannot return more than remaining batch qty.

---

### 3.22 Pharmacy statutory registers & duty  · *Starter*

Tabs: **H1 register · X register · Pharmacist on duty · Licence desk**.

- Each scheduled sale / dispense / return appends: date, patient, doctor **name + registration number**, drug, batch, qty, running balance, bill no, pharmacist on duty.
- **Export / print for the drug inspector — this printout is the legal record.**
- **On duty:** clock-in the registered pharmacist (from Employees). **Scheduled staff-POS** is blocked if no one is on duty. WhatsApp if a scheduled POS cart is open and duty has lapsed. Kiosk is OTC-only, so it does not depend on duty.
**Licence desk:** drug licence, FSSAI, pharmacist registration — issue date, expiry. WhatsApp at 60 / 30 / 7 days.

**Doctors (shop list)** on this module: name, **registration number**, active. POS scheduled sale picks from this list (add-inline allowed). HQ doctor directory is the audit/verify copy, not a substitute for the shop list.

---

### 3.23 Books, GSTN, and e-invoice  · *Growth*

**Operational books** (not a blank accounting suite). No payroll run, no fixed assets, no cost centres.

**Default chart of accounts** (Owner may rename/add children; do not delete control accounts that auto-post):

| Group | Control accounts |
|---|---|
| Assets | Cash in till · Bank · Khata receivable · Inventory · GST input CGST/SGST/IGST |
| Liabilities | AP distributors · GST output CGST/SGST/IGST · Loyalty points payable · Round-off |
| Equity | Owner capital · Opening balances |
| Income | Sales |
| Cost | COGS |
| Expense | Salary (manual expense) · Rent · Electricity · Telephone · Stationery · Repair · Transport · Marketing · Bank charges · Miscellaneous |

**Auto-post (same event as the source document):**

| Event | Posting (summary) |
|---|---|
| Cash sale | Dr Cash; Cr Sales; Cr GST output; Dr COGS / Cr Inventory |
| Khata sale | Dr Khata; same income/GST/COGS as cash |
| Khata repayment (cash) | Dr Cash; Cr Khata |
| Loyalty earn | Cr Loyalty payable (points × ₹1); offset to sales contra / discount as one line on the bill journal |
| Loyalty redeem | Dr Loyalty payable; reduces cash/khata Dr on the same bill |
| Return / CN | Reverse the original bill path (stock restock or Dr write-off); reverse loyalty lots |
| GRN | Dr Inventory; Dr GST input; Cr AP (scheme qty cost 0) |
| Purchase return | Reverse GRN path |
| Expense | Dr Expense (+ GST input if eligible); Cr Cash or Bank |
| Stock take variance | Inventory vs COGS/write-off per posted variance |
| Opening wizard | Dr/Cr Cash, Khata, AP, Inventory as declared; Cr/Dr Opening balances |

- **Journals:** wastage, damage, opening balances, adjustments. Cannot post into a locked period.
- **Pay distributor** — record payment against AP (v1: cash / bank / NEFT recorded locally); outstanding on Distributors updates.
- **Day-end / till close** — declared cash vs system cash; variance logged. (UPI till line appears when Cashfree GMV ships.)
- **Bank reconciliation** — upload statement, match receipts/payments (SaaS is not in the shop bank rec).
- **Opening stock:** Excel/CSV template; match existing SKUs, create batches.
- **Trial balance** must tie; P&L and Balance Sheet read the same COA.
- **GSTN / IRP:** credentials **stored per pharmacy in Namma** (encrypted at rest; Owner-only). Pull GSTR-2B, **match to GRNs**, **prepare** GSTR-1 / GSTR-3B JSON + Excel CA pack. Chemist does not file. Request IRN from IRP for B2B when e-invoicing is on; IRN + ACK QR on PDF / thermal; credit notes cancel/amend IRN as required.
- **Period / FY lock:** Owner locks a month or FY. Posted bills, GRNs, journals, stock takes, and credit notes in that period cannot be edited or deleted. New reversing documents post in the **open** period only. FY lock writes **opening-balance carry-forward**.
- Failures (GSTN down, IRN reject) → WhatsApp to owner with the bill number **and** a console banner. IRN reject reasons shown verbatim from IRP. 2B pull fail → prepare from local books; banner that 2B is stale.

Free still prints a GST invoice; IRN + return *preparation* start at Growth.

---

### 3.24 WhatsApp inbox & templates

Transactional templates on every plan; bulk campaigns remain Growth.

All sends use the **Namma MedMate WABA**. Template catalogue: login OTP, khata remind, refill, low stock, licence expiry, IRN/GSTN fail, subscription dunning, Rx pending, kiosk token / bill share. Shop name in the template body.

English in v1. Send log (delivered / read / failed). Failed send retries. Campaigns (CRM) and login OTP use the same WABA.

---

## 4. Platform Admin HQ

Run the **SaaS** sold to chemists: subscriptions, catalogue, Rx audit, GST on your invoices.

Sidebar: Command center · Pharmacies · **CRM Software** · Master catalogue · Rx & compliance · Finance · Marketing · Analytics · Support · **Automation & rules** · Settings & RBAC.

Live badges: pending KYC, at-risk SaaS accounts. Global search, notifications. Actions save immediately.

### 4.1 Command center

SaaS tiles: MRR, active pharmacies, past-due subscriptions, KYC of chemist accounts, licence expiry, GSTN/IRN errors. Alerts strip. KYC queue with inline Approve / Reject.

### 4.2 Pharmacies (tenants)

Tenant list: plan, seats, KYC (GSTIN, drug licence, FSSAI, PAN, pharmacist), suspend/reactivate the **subscription**, licence expiry, notes, deep-link to CRM Software 360.

No console go-live until chemist KYC is approved **and** the pharmacy wizard has been completed (or skipped where allowed).

### 4.3 CRM Software — the SaaS you sell to chemists

This is **your subscription business**, not the chemist’s patient CRM.

Chips: MRR, ARR, active subscribers, on trial, past due, at risk.

| Tab | What you do |
|---|---|
| Overview | MRR by plan, SaaS metrics, at-risk list |
| Sales pipeline | Kanban: new → contacted → demo → trial → won. + New lead. Weighted forecast, win rate |
| Subscribers | Plan, seats used/limit, invoices/mo, NPS, health, renews-in. CSV export |
| Plans | Plan cards. **Module-availability matrix by tier only.** No attachable add-on SKUs in v1. Change plan = live billing |
| Modules | Feature adoption % per module; enable/disable per account **only as a support override** (logged); nudge eligible-but-not-using |
| Discounts | Subscription coupons (% / ₹ / extra trial days), cap, first-time-only, pause/delete |
| Billing | Collected / due / overdue, DSO, dunning queue with WhatsApp Remind. Invoice drawer GST @18% SAC 9983. **Cashfree** collection of **SaaS**; Mark paid if collected offline |
| Onboarding | Go-live stepper + per-stage checklist (KYC → wizard). Advance / Mark live |
| Adoption | Power / healthy / low / dormant. Last active |
| Success & support | Tickets, CSM book of business, NPS |
| Referrals | Chemist-to-chemist SaaS: both parties **₹500 SaaS credit**, personal code, Mark joined, top referrers. Same programme as pharmacy **Refer & Earn**. |
| Revenue analytics | MRR/ARR, NRR/GRR, Rule of 40, LTV:CAC, MRR bridge (new/expansion/contraction/churn), cohorts |
| Renewals & churn | Renewing in 30d, auto-renew, risk, churn reasons, save-play banner |

**Account-360 drawer:** health, usage & seats, change **plan**, billing/contract, support, activity timeline. Upgrade, Mark paid, Suspend, Reactivate. No add-on attach.

Dunning: WhatsApp reminders → grace → auto-suspend. Health score drop opens a CSM save-play. Near seat cap triggers an upgrade offer.

**Future GMV:** when shop UPI/Card ships, Finance will show GMV settlement (Namma Cashfree → chemist T+1/weekly, minus nothing). Not in v1.

### 4.4 Master catalogue

Platform medicine master every pharmacy maps to. Filter by category, schedule (OTC/H/H1/X), GST slab, Rx-only, Banned. **Ban/un-ban** platform-wide. Set a **price ceiling**. Add medicine. Drawer: composition, **substitutes** (feeds POS prompt), stocking pharmacies.

Banning un-maps the SKU everywhere. Ceiling blocks over-MRP (DPCO).

### 4.5 Rx & compliance

Tabs: **Audit queue · Schedule registers (H1 vs X) · Prescribing doctors · Reports**.

Verify / Flag inline. HQ register is the **audit copy** of the pharmacy **legal** register (3.22). Doctor directory with registration verify.

Schedule-X sales can be auto-flagged. **Do not treat HQ as the inspector’s legal record.**

### 4.6 Finance

SaaS invoice collection, GST on subscriptions (SAC 9983), refunds of SaaS fees. Ledger with running balance. GSTR-1 / GSTR-3B for *your* SaaS tax.

### 4.7 Marketing

WhatsApp campaigns to **chemist accounts** (renewals, onboarding). Launch / Pause, cost estimator.

### 4.8 Analytics & reports

SaaS: MRR, subscribers, churn, onboarding, adoption. Period selector + export. Scheduled CSV of the report library.

### 4.9 Support

Tabs: Overview · Tickets · Agents (online/offline) · SLA & escalations · Knowledge base.

Ticket drawer: thread, canned macros, assign, priority, Resolve / Reopen / Escalate. SLA breach auto-escalates.

### 4.10 Automation & rules

**Kill-switch** at the top. Auto-run interval: Off / 10s / 30s / 1 min. **Run all now**.

KPIs: active rules, actions automated today, awaiting approval, in simulation.

Tabs: Overview · Rules · Activity log · Approvals · Workflows (Dunning ladder, New-subscriber onboarding, At-risk win-back, Renewal playbook).

**v1 seed rules:**

1. Dunning on overdue **SaaS** invoices (suspend after 3 retries) — WhatsApp
2. Escalate SLA-breached tickets to L2
3. Open save-play when health score < 40
4. Flag Schedule-X / Rx sales for audit
5. Expansion nudge near seat cap

Simulation before live, value caps, approval queue, activity log, kill-switch. Automation may only press buttons a human already has.

### 4.11 Settings & RBAC

**Team & roles:** Super admin / Operations / Finance / Support / Compliance.  
**Feature flags.** Platform **WhatsApp WABA** (Namma MedMate) — chemists do not bring their own number. **Cashfree** platform keys for **SaaS checkout** (Admin HQ). Shop-floor GMV Cashfree is **off** until the flag is turned on; then Namma’s account, tenant-tagged charges, T+1/weekly settlement, **no GMV take-rate**.  
**Audit log:** actor, action, target, time — every critical admin action.

---

## 5. The connected flow

```
Counter bill (any SKU)  or  kiosk token → staff cash bill (OTC only)
        ↓
If scheduled (POS only): pharmacist on duty + doctor
Allergy / substitute checks (kiosk: only if shopper OTP-identified; substitutes = OTC only)
        ↓
Tender: Cash (tendered/change) or Khata (named + limit)
        ↓
Stock deducted from the correct batch (FEFO)
        ↓
GST invoice (inclusive MRP → tax on discounted SP) + IRN when e-invoice on and B2B
        ↓
H1/X pharmacy legal register updated (POS scheduled sales)
If credit → Khata ledger; loyalty lots earn/burn
If return → credit note + restock or write-off + reverse loyalty
        ↓
Daybook, trial balance, prepared GSTR-1/2B/3B, P&L, CA JSON+Excel all update from the same bill
        ↓
CA files on GSTN
```

POS, inventory, and accounts are not three tools. **One event writes all three.**

Automation on the same events: overdue SaaS invoice → WhatsApp dunning; health drop → save-play; Schedule-X sale → compliance flag; licence expiry → WhatsApp.

---

## 6. Packaging

| Module | Sold to | Plan gate |
|---|---|---|
| Core billing (cash + khata tender), inventory, purchases, returns, thermal print, scanner, CSV opening stock, **Orders (7-day)**, **Manage Users** (seat cap), hold bill | Pharmacy | **Free forever** |
| Prescriptions, customers, khata, H1/X **legal** register, pharmacist-on-duty, **Employees** (HR), licence alerts | Pharmacy | **Starter** |
| CRM (WhatsApp), full operational books + GSTN prepare + IRN, **period/FY lock**, **stock take**, CA JSON+Excel, reorder, reports | Pharmacy | **Growth** |
| Locked kiosk (OTC, token → cash at POS) + unlimited **seats** | Pharmacy | **Pro** |
| SaaS billing (Cashfree), catalogue, Rx **audit copy**, your GST, automation (dunning/compliance) | You (Admin HQ) | Internal |

Accounting + IRN / return *preparation* are a **Growth upsell**. Free still bills, prints, and lists 7 days of orders. CA files.

---

## 7. Operating principles

1. **Bill once; stock, GST (with IRN when eligible), registers, and ledgers move with it.** Returns reverse the same path. CA files what the chemist prepared.
2. **Free gets a chemist billing on day one. Paid plans buy intelligence and compliance depth.**
3. **Chemist console + Admin HQ only.**
4. **Automation may only press buttons a human already has**, under a cap, with a kill-switch. Alerts and OTP are **WhatsApp only**, from the **Namma MedMate WABA**.
5. **No scheduled drug moves without a prescription trail** — doctor on the staff POS bill, pharmacist on duty, H1/X **pharmacy** register. **Kiosk is OTC only.**
6. **One shop in the UI; `location_id` in the data model; branches are not sold.**
7. **Internet-assumed browser POS** + thermal printer + barcode scanner. Kiosk is **fullscreen software mode on that same device**.
8. **Kiosk is a locked portal** — shopper cannot change screens; staff PIN is the only exit.
9. **English ships; the product is i18n-ready** for later language packs.
10. **GSTN / IRP credentials live per pharmacy in Namma.** Chemist prepares; CA files.
11. **Refer & Earn (₹500 both sides, SaaS credit)** is in v1 for chemist-to-chemist referrals.
12. **One tender per bill.** v1 GMV is **Cash or Khata**. Cashfree on the shop floor is later (Namma merchant, settle GMV, minus nothing).
13. **Hold does not move stock.** Charge does.
14. **Owner period-lock / FY lock** is required for books. Locked periods are append-only via reversals.
15. **Staff login is password and/or WhatsApp OTP, plus PIN on saved devices.**
16. **Pharmacy H1/X printout is the legal register;** HQ is audit-only.

---

## 8. Domain objects (build these)

Tenant-scoped unless noted.

| Object | Identity | Must store |
|---|---|---|
| Pharmacy / Location | tenant + location_id | GSTIN, licences + expiry, plan, seats, Regular GST, e-invoicing flag, IRP/GSTN secret ref, wizard complete |
| User (login) | user_id | role, permissions, password hash (optional), OTP mobile, PIN hash, allowed methods, saved devices, active, seat |
| Employee (HR) | employee_id | may link to a User; pharmacist registration; **no payroll run** |
| SKU | sku_id, mapped to platform master | schedule, HSN, GST %, MRP (inclusive), loose, reorder, racks |
| Batch | sku + batch no | expiry, qty, cost, MRP, scheme flag |
| Bill | invoice no + FY | lines, GST breakup, round-off, **one tender (cash\|khata)**, tendered/change, loyalty redeem, doctor, pharmacist-on-duty, IRN, actor |
| Held cart | hold_id | cart snapshot, expiry, kiosk token id, **no stock reserve** |
| Credit note | CN no + FY | original bill, lines, restock vs write-off, GST reason |
| GRN | grn_id | distributor invoice no, lines, batches |
| Stock take | take_id | counts, variances, posted journal ids |
| Purchase return / expiry return | debit note no | original GRN, qty, status |
| Customer | phone unique per tenant when named | consent, allergies, points lots, khata, **credit limit** |
| Loyalty lot | customer + earn bill | points, remaining, expires_at |
| Khata ledger | customer | bills, repayments, ageing |
| Doctor (shop list) | reg. no. | name, reg. no., verify flag |
| Duty shift | pharmacist + start | clock-in/out |
| Journal / COA | account_id | default tree; postings from bills, GRN, expenses, write-offs, stock take, loyalty, openings |
| GSTR-2B match | 2B row + GRN | matched / mismatch / missing; ITC claim flag |
| Payment | payment_id | **cash \| khata** (v1 GMV); SaaS Cashfree on subscription invoices only |
| Platform master SKU | platform | schedule, substitutes, DPCO ceiling, banned |
| SaaS subscription | pharmacy | plan, seats, invoices, dunning state, Cashfree order id |
| WhatsApp message | message_id | template, to, status, tenant, purpose |

**Invariants:** qty on batch ≥ 0; bill lines reference a living batch; H1/X sale implies duty + doctor reg. no.; banned SKU cannot be billed; list price cannot exceed DPCO ceiling; one tender per posted bill; hold never decrements stock; locked period has no in-period edits; walk-in cannot khata; loyalty redeem ≤ 20% of payable; v1 GMV tender ∈ {cash, khata}; pharmacy register is the legal H1/X record.

---

## 9. Security, privacy, reliability

**Auth:** password and/or WhatsApp OTP as configured per user. Session token; logout. Counter PIN for kiosk exit, FEFO / below-cost / credit-limit override, and saved-device unlock. Owner role cannot be downgraded. Password and OTP/PIN lock after 5 failures / 15 minutes.

**Secrets:** GSTN/IRP credentials encrypted at rest, Owner-only UI, never in logs or CA pack. WhatsApp WABA token and **Cashfree** keys (SaaS) are **platform** secrets (Admin HQ), not pasted into the chemist console.

**PII:** patient name, phone, Rx image (staff upload only), allergies, address. Access only by that tenant’s staff. CA pack has no Rx images. Export summary on Account is shop business data, not a full patient dump unless Owner exports Customers (Starter+).

**DPDP:** consent flags on customer 360. Campaigns honour opt-out. Owner can delete a customer’s marketing consent; transactional history of bills is retained for GST (legal hold).

**Reliability:** charge, GRN post, repayment, IRN request, SaaS Cashfree webhook handling are **idempotent**. At-least-once WhatsApp with dedupe on template+to+bill_id. IRP/GSTN timeouts: fail visible, no silent stock move.

**Print:** bill persists if printer fails.

**Kiosk:** exit PIN brute-force lockout after 5 tries / 10 minutes.

**Multi-user:** two cashiers cannot deduct the last unit twice; stock decrement is transactional.

---

## 10. Failure catalogue (QA)

| Event | Product behaviour |
|---|---|
| Network drop during Charge | No stock change; staff retries; same `client_charge_id` cannot post twice |
| SaaS Cashfree pending / timeout | Subscription not marked paid; pharmacy POS unaffected |
| Duplicate SaaS Cashfree webhook | Ignored after first successful post |
| Thermal printer offline | Bill posted; reprint |
| WhatsApp send fail | Retry 3×; inbox Failed; no SMS; OTP users can use password if enabled |
| OTP / password / PIN wrong 5× | Lock 15 min |
| IRP down / IRN reject | B2B bill not posted (default); Owner banner + WhatsApp |
| GSTN pull fail | Prepare pack from local books; banner that 2B is stale |
| Plan expired | Paid modules lock; POS/inventory/purchases/returns/Orders 7-day/Manage Users stay if Free |
| Seat cap | Add user disabled |
| Banned / above DPCO | Cannot add to cart |
| No pharmacist on duty | Cannot charge scheduled POS |
| Kiosk + H/H1/X SKU | Not listed |
| Kiosk UPI/Card | Not offered in v1; token → staff cash POS |
| Walk-in + khata | Cannot charge |
| Credit over limit | PIN required; else blocked |
| Loyalty redeem > 20% | Cap applied; cannot exceed |
| Second coupon on one bill | Blocked |
| Expired batch | Cannot FEFO-pick; hidden from default picker unless PIN override |
| Hold expired (30 min) | Cart discarded; no stock move |
| Locked period | Cannot post or edit in that period; reverse in open period |
| Stock take vs locked month | Post blocked |
| Wizard / KYC incomplete | Cannot post first bill |
| CA link leaked | Owner can revoke; link expires (default 30 days) |
| Concurrent last unit | One bill succeeds; the other sees out of stock |

---

*v1 application spec from founder decisions through 31 August 2026. All product calls in this file are settled. This is the product to build.*
