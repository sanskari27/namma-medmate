# Requirement Doc: Khata (`khata`)

**Status:** v1  
**Plan gate:** Starter  
**Surface:** Pharmacy Partner Console  
**Owner module:** `modules/khata/{ui,api,docs}`  
**Canonical entity:** KhataLedger  
**Stack:** React + TypeScript AWS Lambdas  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.7, §2.4 (Khata, ageing, reminders); `docs/requirements/00-glossary.md`; `docs/requirements/00-decomposition-plan.md`

---

## 1. Summary

Khata is the pharmacy’s **only receivables ledger** (digital *udhaar*). POS **Record on credit** and any credit sale started from this screen write the **same** ledger. Walk-in cannot take credit. A named Customer with phone is required.

The Owner may set an optional credit limit on the Customer (`customers` owns the field). At charge, POS calls `checkCreditLimit`; this module returns `allowed` or `over_limit`. Over-limit charge needs Owner/Manager PIN (POS collects PIN; this module does not hash PINs). The override is logged.

Staff collect cash repayments here (quick chips ₹500 / ₹1000 / ₹2000 / Half / Full). Repayment is idempotent. Books listen: **Dr Cash; Cr Khata**. Reminders are WhatsApp via the `whatsapp` module (Namma WABA, `khata remind` template). Ageing buckets: current / 30–60 / 60d+. Overdue 30+ is flagged.

---

## 2. Scope (in / out)

### In scope

- KhataLedger per named Customer: credit bills, cash repayments, running balance, ageing.
- POS `Record on credit` posting into this ledger (same ledger as “New credit sale” shortcut).
- `checkCreditLimit(customerId, additionalAmount)` → `allowed` | `over_limit`.
- Credit-limit overage is **not** charged here; POS applies Owner/Manager PIN and then posts with an override flag this module stores on the bill-link.
- KPIs: total outstanding, overdue 30d+, collected this month (and collection rate), all-time credit given.
- Ageing chart (current / 30–60 / 60d+); click band to filter.
- Tabs: Outstanding · Payment history. Overdue-only toggle. Sort by amount or oldest.
- WhatsApp Remind per outstanding row (via `whatsapp`).
- New credit sale shortcut → staff POS with customer and khata tender intent.
- Khata modal: repayment chips (cash v1), WhatsApp reminder, unpaid bills oldest-first, full ledger.
- Idempotent repayment (`client_repayment_id`).
- Domain event for `books-gst`: repayment and credit-sale receivable (sale event originates in POS; this module confirms ledger write).
- Embeddable panel on Customer 360 (`customers`).
- Plan gate Starter. Tenant + `location_id`.

### Out of scope

- Walk-in credit.
- Split tender, UPI, card, Cashfree GMV, customer debit notes.
- Loyalty earn/burn (CRM). Referral ₹100 **posts through** this ledger when `crm` requests a promotional credit (this module records the entry; `crm` owns the programme).
- GST invoice / IRN / stock (POS).
- PIN capture/hash (auth / Manage Users). This module only records that an override was asserted by POS with `actor_user_id`.
- Marketing campaigns (CRM). Khata remind is not a campaign.
- Payables / distributor outstanding (`distributors-reorder`).
- Period lock enforcement on backdated bills (POS + `books-gst`); this module refuses repayment into a locked period if books say the period is locked.

---

## 3. Dependencies

| Module | Why |
|---|---|
| `tenancy` | Tenant + `location_id`. |
| `plan-gating` | Starter. |
| `customers` | Named Customer + phone required; `credit_limit` read; 360 embed. |
| `whatsapp` | Only send path. Template `khata_remind`. Shop name in body. |
| `pos-billing` | Posted khata Bills; New credit sale; PIN override at charge. |
| `books-gst` | Listens `khata.repayment.posted` (Dr Cash; Cr Khata) and khata sale from bill journal. Period lock. |
| `auth` / `manage-users` | Cashier default includes khata collect; Owner/Manager PIN is verified by POS/`auth` before override post. |
| `audit` | Repayment, remind requested, over-limit override flag stored from POS. |
| `crm` | May post referral ₹100 as a ledger credit via published API (not SaaS credit). |

---

## 4. Functional Requirements

**FR-1:** The system shall require Starter (or higher) for khata console routes and APIs; otherwise `403 PLAN_REQUIRED` / paywall. Ledgers already stored shall be retained.

**FR-2:** The system shall scope every KhataLedger row and query to tenant + `location_id`.

**FR-3:** The system shall be the **only** receivables ledger for shop GMV credit. POS “Record on credit” and recording a credit sale from this screen shall insert into the same KhataLedger.

**FR-4:** The system shall reject any credit sale or repayment that is not attached to a named Customer with a phone (`400 NAMED_CUSTOMER_REQUIRED`). Walk-in shall never receive a KhataLedger (`walk-in cannot khata`).

**FR-5:** The system shall create or update the customer’s KhataLedger when a posted Bill has tender `khata`: debit (increase outstanding) by the bill total (GST-inclusive, after discounts). Idempotent on `bill_id` (duplicate post does not double the receivable).

**FR-6:** The system shall expose `checkCreditLimit(customerId, additionalAmount)` that loads `customers.credit_limit`. If `credit_limit` is `null`, return `allowed`. If `outstanding + additionalAmount > credit_limit`, return `over_limit` with current outstanding, limit, and overflow; else `allowed`.

**FR-7:** The system shall not itself prompt for PIN. When POS posts a khata bill with `credit_limit_override: true`, the system shall accept the receivable even if over limit, persist `override_by_user_id` and timestamp on the ledger line, and emit audit. If over limit and override is false/absent, reject with `403 CREDIT_OVER_LIMIT`.

**FR-8:** The system shall record cash repayments against a customer ledger: amount > 0, ≤ outstanding (no negative receivable from cash collect in v1 except as in §10 referral credits already on the book), tender cash only, `client_repayment_id` unique per tenant for idempotency. Duplicate id returns the original repayment (`200` same body), no second cash post.

**FR-9:** The system shall apply repayment FIFO to unpaid khata bills **oldest first**. Partial allocation is allowed. Payment-history tab lists repayments.

**FR-10:** The system shall emit `khata.repayment.posted` so `books-gst` posts **Dr Cash; Cr Khata**. The module shall not write journals itself.

**FR-11:** The system shall compute ageing from each unpaid bill’s posted date vs now (location local date): **current** (0–29 days), **30–60** (30–60 inclusive), **60d+** (> 60 days). Overdue 30+ = ageing not in current (i.e. 30 days or more). Flag those customers/rows.

**FR-12:** The system shall show KPIs for the location: total outstanding; overdue 30d+ amount; collected this month (sum of repayments with `posted_at` in current calendar month, location TZ); collection rate = collected this month / (collected this month + outstanding at month-start) or the equivalent defined in §10; all-time credit given = sum of khata bill totals (not net of repayments).

**FR-13:** The system shall render an ageing chart with three bands (current / 30–60 / 60d+). Clicking a band shall filter the outstanding list to that bucket.

**FR-14:** The system shall provide tabs **Outstanding** and **Payment history**, an overdue-only toggle (outstanding tab), and sort by **amount** (desc) or **oldest** (asc by oldest unpaid bill date).

**FR-15:** The system shall provide **WhatsApp Remind** per outstanding row. Send only via `whatsapp` with template key `khata_remind`, params including shop name, customer name, outstanding amount. Dedupe key `khata_remind:{customer_id}:{local_date}` so at-most-once per customer per day unless staff confirm a second send (second send uses a new nonce; see §10). Honour dedicated khata-remind opt-out if present; otherwise send when phone is present (transactional; not marketing consent). If `whatsapp` returns failed after retries, show Failed and do not SMS.

**FR-16:** The system shall provide **New credit sale** shortcut navigating to POS with `customer_id` and tender intent `khata`.

**FR-17:** The system shall open a khata modal per customer with: outstanding, credit limit, record repayment (chips **₹500 / ₹1000 / ₹2000 / Half / Full** — cash in v1; Half = 50% of outstanding rounded to 2 dp; Full = outstanding), WhatsApp reminder, unpaid bills oldest-first, full ledger (bills, repayments, referral credits, running balance).

**FR-18:** The system shall reject repayment of `0` or negative (`400 AMOUNT_INVALID`) and amount > outstanding (`400 AMOUNT_EXCEEDS_OUTSTANDING`).

**FR-19:** The system shall reject khata bill post if period is locked for that bill date (`423 PERIOD_LOCKED`) when `books-gst` reports lock; repayment into a locked period likewise blocked — collect in the open period dated today.

**FR-20:** The system shall expose the ledger for Customer 360 embed (same modal data).

**FR-21:** The system shall accept an internal promotional credit posted by `crm` (patient referral ₹100) as a ledger credit (reduces outstanding / may create a credit balance used on the next khata sale). Idempotent on `crm_referral_id`. This is not SaaS Refer & Earn.

**FR-22:** The system shall emit AuditEvent on repayment, remind request, over-limit override line, and referral credit.

**FR-23:** The system shall not allow two concurrent repayments to drive outstanding below zero except when a promotional credit balance already existed; cash collect is capped at outstanding.

---

## 5. Non-Functional Requirements

- English UI; i18n-ready (including ageing labels and chips).
- Repayment is **idempotent** (`client_repayment_id`), same class as charge/GRN.
- PII (customer name/phone on this screen) tenant-scoped.
- WhatsApp only through `whatsapp`; retry/failure per catalogue (3× backoff, no SMS).
- Money: 2 decimal places INR. No split tender.
- Cashier default access includes khata collect; Owner/Manager/Pharmacist per role matrix (Cashier: credit collect; Manager: credit).
- List p95 < 1.5s. `checkCreditLimit` p95 < 200ms (POS charge path).
- Persistence via `libs/db-services`. UI via `@namma-medmate/api-client`.

---

## 6. Data Model / Entities

### KhataLedger (header per customer)

| Field | Type | Notes |
|---|---|---|
| `ledger_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `customer_id` | UUID | unique per location; named only |
| `outstanding` | decimal(14,2) | ≥ 0 unless promotional credit balance (see §10) |
| `updated_at` | timestamptz | |

### KhataEntry (lines)

| Field | Type | Notes |
|---|---|---|
| `entry_id` | UUID | PK |
| `ledger_id` | UUID | |
| `entry_type` | enum `sale\|repayment\|referral_credit\|cn_reversal` | |
| `amount` | decimal(14,2) | sale increases outstanding; repayment/credit decreases |
| `bill_id` | UUID | nullable; required for `sale` |
| `credit_note_id` | UUID | nullable; refund-to-khata / reverse sale |
| `client_repayment_id` | string | unique per tenant when type=repayment |
| `credit_limit_override` | boolean | sale lines only |
| `override_by_user_id` | UUID | nullable |
| `actor_user_id` | UUID | |
| `posted_at` | timestamptz | |
| `allocation` | JSON | repayment → `{ bill_id, amount }[]` oldest-first |

### CreditLimitCheck (not stored; computed)

Uses `customers.credit_limit` + `outstanding`.

Returns / CN that refund “back to khata” (`returns` module) increase outstanding via `cn_reversal` or a dedicated increase line — this module applies what `returns` posts; it does not invent refund UX.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/v1/locations/{location_id}/khata`  
Auth: session Bearer. Tenant from session.

### 7.1 REST

**GET** `/v1/locations/{location_id}/khata/kpis`

```json
{
  "total_outstanding": 125000.00,
  "overdue_30d_plus": 42000.00,
  "collected_this_month": 18000.00,
  "collection_rate": 0.36,
  "all_time_credit_given": 410000.00
}
```

**GET** `/v1/locations/{location_id}/khata/ageing`

```json
{
  "current": { "amount": 80000.00, "count": 40 },
  "days_30_60": { "amount": 25000.00, "count": 12 },
  "days_60_plus": { "amount": 20000.00, "count": 8 }
}
```

**GET** `/v1/locations/{location_id}/khata/outstanding`

Query: `bucket=current|days_30_60|days_60_plus`, `overdue_only=true|false`, `sort=amount|oldest`, `page`, `page_size`.

```json
{
  "items": [
    {
      "customer_id": "c_01",
      "name": "Anita Sharma",
      "phone": "9876543210",
      "outstanding": 2400.00,
      "oldest_unpaid_at": "2026-07-01T11:00:00+05:30",
      "overdue_30d": true,
      "ageing_bucket": "days_60_plus",
      "credit_limit": 5000.00
    }
  ],
  "page": 1,
  "total": 60
}
```

**GET** `/v1/locations/{location_id}/khata/payments`

Payment history (repayments). Query: `from`, `to`, `page`.

```json
{
  "items": [
    {
      "repayment_id": "r_01",
      "customer_id": "c_01",
      "name": "Anita Sharma",
      "amount": 1000.00,
      "tender": "cash",
      "posted_at": "2026-08-15T18:00:00+05:30",
      "actor_user_id": "u_09"
    }
  ]
}
```

**GET** `/v1/locations/{location_id}/khata/customers/{customer_id}`

Modal + 360 embed:

```json
{
  "customer_id": "c_01",
  "outstanding": 2400.00,
  "credit_limit": 5000.00,
  "unpaid_bills": [
    {
      "bill_id": "b_88",
      "invoice_no": "INV-2026-0201",
      "posted_at": "2026-07-01T11:00:00+05:30",
      "original_total": 1800.00,
      "open_amount": 1800.00
    }
  ],
  "ledger": [
    {
      "entry_id": "e_1",
      "entry_type": "sale",
      "amount": 1800.00,
      "bill_id": "b_88",
      "posted_at": "2026-07-01T11:00:00+05:30",
      "running_balance": 1800.00
    }
  ]
}
```

Unpaid bills **oldest-first**. Ledger chronological with running balance.

**POST** `/v1/locations/{location_id}/khata/check-credit-limit`  
`checkCreditLimit`

```json
{ "customer_id": "c_01", "additional_amount": 3000.00 }
```

```json
{
  "result": "over_limit",
  "outstanding": 2400.00,
  "credit_limit": 5000.00,
  "additional_amount": 3000.00,
  "overflow": 400.00
}
```

or `"result": "allowed"` (`overflow` 0). No `credit_limit` → `"result": "allowed"`, `"credit_limit": null`.

Walk-in / unknown customer: `400 NAMED_CUSTOMER_REQUIRED` / `404`.

**POST** `/v1/locations/{location_id}/khata/sales`  
Called by `pos-billing` after a posted khata bill (or in the same transaction via db-service). Idempotent on `bill_id`.

```json
{
  "bill_id": "b_99",
  "customer_id": "c_01",
  "amount": 430.00,
  "posted_at": "2026-08-31T10:00:00+05:30",
  "credit_limit_override": false,
  "override_by_user_id": null,
  "actor_user_id": "u_02"
}
```

**201/200:** `{ "ledger_id", "entry_id", "outstanding" }`  
If over limit and override false: `403 CREDIT_OVER_LIMIT`.

**POST** `/v1/locations/{location_id}/khata/repayments`

```json
{
  "customer_id": "c_01",
  "amount": 1000.00,
  "tender": "cash",
  "client_repayment_id": "rep_pos_20260831_abc",
  "actor_user_id": "u_09"
}
```

Chips are UI-only; they post the numeric `amount`.

**201:**

```json
{
  "repayment_id": "r_01",
  "outstanding": 1400.00,
  "allocated": [{ "bill_id": "b_88", "amount": 1000.00 }]
}
```

Duplicate `client_repayment_id`: `200` same resource.

**POST** `/v1/locations/{location_id}/khata/customers/{customer_id}/remind`

```json
{ "nonce": "optional-second-send" }
```

```json
{
  "accepted": true,
  "whatsapp_message_id": "wa_01",
  "dedupe_key": "khata_remind:c_01:2026-08-31"
}
```

This module calls `whatsapp` send; it does not contact Meta. If phone missing: `400 PHONE_REQUIRED`. If dedicated opt-out: `403 KHATA_REMIND_OPTED_OUT`.

**POST** `/v1/locations/{location_id}/khata/referral-credits`  
`crm` only (service auth).

```json
{
  "customer_id": "c_01",
  "amount": 100.00,
  "crm_referral_id": "ref_77",
  "reason": "patient_referral"
}
```

Idempotent on `crm_referral_id`.

### 7.2 Events emitted

| Event | Body (min) | Listeners |
|---|---|---|
| `khata.sale.posted` | `bill_id`, `customer_id`, `amount` | `books-gst` (Dr Khata; with bill income — POS may emit the full bill journal instead; this event is the receivable confirmation). Prefer single bill journal from POS; this event updates CRM due-tag projections. |
| `khata.repayment.posted` | `repayment_id`, `customer_id`, `amount`, `client_repayment_id` | `books-gst` **Dr Cash; Cr Khata**; `audit`; `customers` due tag |
| `khata.balance_changed` | `customer_id`, `outstanding` | `customers`, `crm`, `dashboard` |
| `khata.remind.requested` | `customer_id`, `dedupe_key` | `whatsapp` (if not inline), `audit` |

POS posted bill with tender khata is the source document; `books-gst` posts Dr Khata / Cr Sales / GST from the **bill** event. This module must not double-post income.

### 7.3 Events consumed

| Event | From | Effect |
|---|---|---|
| `bill.posted` tender=khata | `pos-billing` | FR-5 |
| `credit_note.posted` refund=khata | `returns` | increase outstanding |
| `period.lock` | `books-gst` | block backdated posts |
| `customer.credit_limit_changed` | `customers` | next checkCreditLimit |

### 7.4 UI

- Route `/khata` (Credit · Khata). Starter lock on Free.
- KPI row, ageing chart (click filter), tabs Outstanding / Payment history, overdue toggle, sort, row **WhatsApp Remind**, **New credit sale**.
- Row opens modal: chips ₹500 / ₹1000 / ₹2000 / Half / Full, cash submit, remind, unpaid bills oldest-first, ledger.
- Same modal on Customer 360.

---

## 8. User Stories & Acceptance Criteria

### US-1: Walk-in cannot take credit

**Given** a POS cart with no named customer  
**When** staff select tender Credit (khata)  
**Then** `checkCreditLimit` / sale post is not allowed (`NAMED_CUSTOMER_REQUIRED`) and no ledger row is created.

### US-2: Over-limit needs override; repayment is idempotent

**Given** named customer outstanding ₹4,800, limit ₹5,000  
**When** POS checks an additional ₹500  
**Then** the API returns `over_limit` and a sale without override is `403 CREDIT_OVER_LIMIT`.

**Given** Owner/Manager PIN succeeded at POS and sale posts with `credit_limit_override: true`  
**When** the same `bill_id` is posted again  
**Then** outstanding increases once and audit retained the override actor.

**Given** cashier submits repayment ₹1,000 with `client_repayment_id=R1` twice  
**When** both requests complete  
**Then** cash and outstanding move once; second response matches the first.

### US-3: Ageing filter and WhatsApp remind

**Given** unpaid bills aged 10, 45, and 70 days  
**When** the Owner opens Khata and clicks the 60d+ band  
**Then** only the 70-day customer rows show, flagged overdue 30+.

**When** they tap WhatsApp Remind on a named customer with phone  
**Then** `whatsapp` is asked to send `khata_remind` (shop name in body) and marketing consent is not required.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Walk-in + khata | Blocked |
| No phone on named customer | Should not exist (`customers` requires phone); if inconsistent, block credit |
| Limit null | `allowed` |
| Limit 0 | any positive additional amount is `over_limit` |
| Amount > outstanding repayment | `400 AMOUNT_EXCEEDS_OUTSTANDING` |
| Duplicate `client_repayment_id` | Replay original |
| Duplicate `bill_id` sale | Replay original |
| WhatsApp fail | Retry via `whatsapp`; Failed in inbox; no SMS; UI toast |
| Locked period | `423 PERIOD_LOCKED`; date repayment today |
| Concurrent last rupee collect | one succeeds; other `400 AMOUNT_EXCEEDS_OUTSTANDING` |
| Half chip on odd outstanding | round to 2 dp; never exceed outstanding |
| Plan expired | module locked; POS khata tender locked with Starter paywall; data retained |
| Referral credit + cash collect | outstanding can be 0; cash collect capped at max(outstanding, 0) |

---

## 10. Open Questions / Assumptions

1. **Khata reminder is transactional:** send whenever the named customer has a phone. Distinct from marketing consent. If a dedicated khata-remind opt-out is added later, honour it; v1 has no separate flag unless `customers` adds one.
2. **Collection rate** = `collected_this_month / (collected_this_month + total_outstanding)` as a simple v1 ratio (collected vs still open). Documented so QA is not blocked. Month-start snapshot is not required in v1.
3. **Ageing 30–60** is days 30 through 60 inclusive; **current** is 0–29; **60d+** is 61 calendar days or more. “Overdue 30d+” = not current.
4. **Timezone:** pharmacy location local date (IST for v1 India shops).
5. **Cash only** for repayment in v1. No UPI/card collect on khata.
6. **PIN** is verified by `auth` at POS; khata stores override metadata only.
7. **Income journal** for the sale is owned by the posted Bill (`books-gst` from POS). This module’s repayment event is Dr Cash; Cr Khata only.
8. **Referral ₹100** from `crm` may credit the ledger below zero outstanding (store credit against the next khata sale). Not a customer debit note document.
9. **Second remind same day** requires a UI confirm and a new nonce; default dedupe is one per customer per local date.
10. Returns that refund “back to khata” increase outstanding; this module does not own CN UX.
11. New credit sale is a shortcut to POS, not a second billing engine.
