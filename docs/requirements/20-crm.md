# Requirement Doc: CRM (`crm`)

**Status:** v1  
**Plan gate:** Growth  
**Surface:** Pharmacy Partner Console  
**Owner module:** `modules/crm/{ui,api,docs}`  
**Canonical entity:** LoyaltyLot  
**Stack:** React + TypeScript AWS Lambdas  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.8, loyalty §2.4, campaigns consent §2.3, DPDP §9; `docs/requirements/00-glossary.md`; `docs/requirements/00-decomposition-plan.md`

---

## 1. Summary

CRM is patient retention: overview, segments, refill reminders, loyalty lots, WhatsApp campaigns (Namma WABA), feedback, and analytics. Named customers and clinical/consent fields live in `customers`; this module **reads** them. Loyalty **lots** are owned here. Patient referral ₹100 for both parties is applied **via Khata**, not SaaS credit.

Loyalty: earn **1 point per ₹100 net collected** (GST-inclusive total after coupon, manual discount, **and** redeem). Khata bills earn. Redeem **1 pt = ₹1**, capped at **20% of payable before this redeem**. Named customer required. Redeem allowed on khata. Kiosk **never** redeems. Lots expire **12 months** after earn (FIFO). Return/CN reverses earn and burn on that bill.

Campaigns go only to patients with a **phone and marketing consent**. Opt-out stops further campaigns. Owner can revoke marketing consent on `customers`; this module honours it. Transactional messages (OTP, user-requested bill share, licence alerts to Owner) do not need marketing consent and are not sent by this module.

WhatsApp only through `whatsapp`.

---

## 2. Scope (in / out)

### In scope

- Tabs exactly: **Overview**, **Patients & Segments**, **Reminders**, **Loyalty**, **Campaigns**, **Feedback**, **Analytics**.
- Overview KPIs: patients, active (30d), at-risk, refills due, loyalty points, avg rating; segment bars (Chronic, High value, Lapsed, New, On credit, Regular); at-risk table with WhatsApp **Win back**.
- Patients & Segments: filter by segment; RFM score, loyalty tier, points, orders, last visit, LTV.
- Reminders: refills due in 14 days; WhatsApp refill + follow-up (logged). Requires phone + **refill** consent.
- Loyalty: points outstanding and ₹ liability (1 pt = ₹1); tiers Silver 12+ / Gold 50+ / Platinum 120+ visits; per-customer Redeem; referral both parties ₹100 via `khata`; expiry of lots older than 12 months.
- `quoteRedeem(customerId, payable)`, `applyEarnBurn` on bill posted, `reverseForCreditNote`.
- Campaigns: target segment, WhatsApp from Namma WABA, optional offer, editable template; history with attributed revenue (bills with that offer code in the next 14 days). Phone **and** marketing consent only.
- Feedback: log stars + NPS + comment, or request via WhatsApp; promoters / detractors.
- Patient 360 CRM actions: WhatsApp / Call (`tel:` — no telephony product) / Refill / Redeem / New sale; medicines bought; clinical profile from `customers` (age, gender, blood group, conditions, allergies, address, consent).
- DPDP: honour opt-out; do not campaign without marketing consent.
- Growth gate. Tenant + `location_id`.

### Out of scope

- Customer master write (except loyalty display updates to `customers` projection). Consent **revoke** is Owner action on `customers`.
- Khata cash collect UI (embed/use `khata`; referral posts through its API).
- SaaS Refer & Earn ₹500 (`saas-billing`).
- Kiosk loyalty redeem.
- Staff POS charge math beyond redeem quote / apply (POS calls this module).
- Ingesting patient WhatsApp media / Rx (`prescriptions` is staff upload only).
- Telephony, SMS, chemist-owned WhatsApp number.
- HQ SaaS CRM (`admin-saas-crm`).

---

## 3. Dependencies

| Module | Why |
|---|---|
| `tenancy` | Tenant + `location_id`. |
| `plan-gating` | Growth. |
| `customers` | Named customer, phone, LTV, orders, last visit, allergies, conditions, consents. |
| `khata` | On-credit segment; referral ₹100 credit; outstanding. |
| `offers` | Optional campaign offer code; attribution by code on bills. |
| `whatsapp` | All CRM sends (campaign, refill, win-back, feedback request). |
| `pos-billing` | `applyEarnBurn` on post; redeem on payable; visit count; medicines bought. |
| `returns` | `reverseForCreditNote`. |
| `books-gst` | Loyalty earn Cr loyalty payable; redeem Dr loyalty payable (from bill journal using this module’s point rupees). |
| `audit` | Redeem, campaign launch, referral, consent-honouring sends. |
| `kiosk` | Must **not** call redeem. |

---

## 4. Functional Requirements

**FR-1:** The system shall require Growth (or Pro) for CRM routes and loyalty/campaign APIs; otherwise paywall / `403 PLAN_REQUIRED`. LoyaltyLot rows are retained if the plan expires; POS must not redeem while gated off.

**FR-2:** The system shall scope LoyaltyLot, Campaign, Feedback, and send log to tenant + `location_id`. PII reads only that tenant’s customers.

**FR-3:** The system shall render tabs **Overview · Patients & Segments · Reminders · Loyalty · Campaigns · Feedback · Analytics** with the capabilities in §3.8 of the catalogue (this document §1 and FR-4–FR-20).

**FR-4:** The system shall show Overview: count of named patients; active = last visit within 30 days; at-risk (see §10); refills due (Reminders set); loyalty points = sum of remaining unexpired lots; avg rating from Feedback. Segment bars: Chronic, High value, Lapsed, New, On credit, Regular (definitions §10). At-risk table with action **Win back** (WhatsApp via `whatsapp`, marketing consent + phone required).

**FR-5:** The system shall list Patients & Segments filterable by those segments, columns: RFM score, loyalty tier, points remaining, orders, last visit, LTV.

**FR-6:** The system shall list Reminders: named customers with a refill due within **14 days**. Staff may send WhatsApp refill and a follow-up (logged). Send only if phone **and** `refill_consent`. Template `refill`. Shop name in body.

**FR-7:** The system shall earn loyalty only for a **named** `customer_id` on a posted Bill: `points_earned = floor(net_collected / 100)` where `net_collected` is GST-inclusive total **after** coupon, manual discount, and loyalty redeem (round-off included as on the invoice). Khata bills earn. Cash bills earn. Points 0 if net_collected < 100.

**FR-8:** The system shall create a LoyaltyLot `{ points, remaining, earned_on_bill_id, expires_at = earned_at + 12 months }` on earn. Liability ₹ = remaining points × ₹1.

**FR-9:** The system shall expose `quoteRedeem(customerId, payable)` returning `max_points = min(remaining_unexpired, floor(0.20 * payable))` and `max_rupees = max_points` (1 pt = ₹1). `payable` is the bill total **before this redeem** (after coupon and manual discount). Named customer required; else error. Cap cannot be exceeded.

**FR-10:** The system shall apply redeem FIFO against lots (nearest expiry first, then oldest earn). Kiosk shall never call redeem.

**FR-11:** The system shall expose `applyEarnBurn` in one bill post: burn quoted points (if any), then earn on net collected after burn. Idempotent on `bill_id`. Redeem is allowed when tender is khata.

**FR-12:** The system shall expose `reverseForCreditNote(credit_note_id, original_bill_id, ...)` to reverse earn and burn that originated on that bill (full or in proportion to returned value — §10). Idempotent on `credit_note_id`.

**FR-13:** The system shall drop remaining points on lots with `expires_at <= now` from liability (FIFO expiry). Expiry does not edit posted bills.

**FR-14:** The system shall compute loyalty **tier from visit count** (posted bills for that customer): Silver if visits ≥ 12; Gold if ≥ 50; Platinum if ≥ 120. Highest matching tier wins. Below 12: no tier.

**FR-15:** The system shall record a patient referral: referrer and referee are named customers; both receive **₹100 via `khata` referral-credit API** (not SaaS). Idempotent on `crm_referral_id`. Both parties required.

**FR-16:** The system shall launch a Campaign: name, target segment, optional `offer` code (must exist in `offers` if set), editable template body using an approved WABA campaign template. Recipients = named customers in segment with phone **and** `marketing_consent === true`. Opt-out / revoked consent excludes them. Send via `whatsapp` only.

**FR-17:** The system shall store campaign history and **attributed revenue** = sum of posted Bills whose `coupon_code` equals the campaign’s offer code and `posted_at` in `[campaign_sent_at, campaign_sent_at + 14 days]`, same location. If the campaign has no offer, attributed revenue is 0 (do not invent last-click).

**FR-18:** The system shall stop further campaign sends to a customer when `marketing_consent` is false (`customer.marketing_consent_revoked` or flag read at send time). In-flight template to that number is not retried for campaign purpose.

**FR-19:** The system shall log Feedback: stars (1–5), NPS (0–10), comment; or request via WhatsApp (marketing consent + phone). Promoters NPS 9–10; detractors 0–6; passives 7–8. Overview avg rating uses stars.

**FR-20:** The system shall show Patient 360 CRM chrome: WhatsApp (opens send via `whatsapp` / pre-filled as product does for bill share — campaign/refill use APIs), **Call** as `tel:` URI (no telephony product), **Refill** (FR-6), **Redeem** (quote + POS New sale with redeem intent), **New sale** (POS). Medicines bought from posted bill lines. Clinical profile **read** from `customers`.

**FR-21:** The system shall not require marketing consent for transactional traffic owned elsewhere (OTP, user-requested bill share, licence alerts to Owner). CRM shall not classify those as campaigns.

**FR-22:** The system shall show Analytics: avg LTV, retention %, churn risk, campaign sales (attributed), RFM leaders.

**FR-23:** The system shall emit AuditEvent for applyEarnBurn, reverse, campaign launch, referral, win-back/refill send.

**FR-24:** The system shall update `customers.loyalty_points_display` (event `loyalty.balance_changed`) after earn, burn, reverse, expiry.

---

## 5. Non-Functional Requirements

- English UI; i18n-ready templates (WABA templates remain English in v1; keys ready).
- DPDP: campaigns honour opt-out; Owner deletes marketing consent on `customers`; bill history retained for GST (not deleted by CRM).
- PII tenant-scoped. No CA pack patient dump.
- WhatsApp: at-least-once with dedupe `template+to+campaign_id` (or bill_id where applicable). Retry 3× in `whatsapp`. No SMS.
- `quoteRedeem` / `applyEarnBurn` p95 < 300ms (POS charge). Idempotent apply.
- Loyalty liability must match sum of remaining lots (trial balance listens to bill journal amounts this module quotes).
- Growth gate; lots retained; redeem blocked when gated.

---

## 6. Data Model / Entities

### LoyaltyLot (`crm` owned)

| Field | Type | Notes |
|---|---|---|
| `lot_id` | UUID | PK |
| `tenant_id` / `location_id` | UUID | |
| `customer_id` | UUID | named |
| `earned_bill_id` | UUID | |
| `points_earned` | int | |
| `remaining` | int | |
| `expires_at` | timestamptz | earned_at + 12 months |
| `earned_at` | timestamptz | |
| `reversed_by_cn_id` | UUID | nullable |

### LoyaltyBurn

| Field | Type | Notes |
|---|---|---|
| `burn_id` | UUID | |
| `bill_id` | UUID | redeem bill |
| `lot_id` | UUID | FIFO |
| `points` | int | |
| `rupees` | decimal | = points |
| `reversed_by_cn_id` | UUID | nullable |

Unique earn per `earned_bill_id`. Unique burn set per `bill_id` (idempotent apply).

### Campaign

| Field | Type | Notes |
|---|---|---|
| `campaign_id` | UUID | |
| `name` | string | |
| `segment` | enum | Chronic, High value, Lapsed, New, On credit, Regular, or At-risk |
| `offer_code` | string | nullable |
| `template_key` | string | WABA |
| `body_params` | JSON | editable fields allowed by template |
| `status` | enum `draft\|sent\|paused` | |
| `sent_at` | timestamptz | |
| `attributed_revenue` | decimal | computed |

### CampaignRecipient

`campaign_id`, `customer_id`, `phone`, `whatsapp_message_id`, `status`.

### Feedback

| Field | Type | Notes |
|---|---|---|
| `feedback_id` | UUID | |
| `customer_id` | UUID | nullable if anonymous walk-in log — **v1 require named** (§10) |
| `stars` | int 1–5 | nullable if NPS-only |
| `nps` | int 0–10 | nullable |
| `comment` | string | |
| `source` | enum `console\|whatsapp` | |
| `created_at` | timestamptz | |

### Referral

`crm_referral_id`, `referrer_customer_id`, `referee_customer_id`, `khata_credit_referrer_id`, `khata_credit_referee_id`, `created_at`. Unique pair programme instance.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/v1/locations/{location_id}/crm`  
Auth: session Bearer.

### 7.1 Overview & people

**GET** `/v1/locations/{location_id}/crm/overview`

```json
{
  "patients": 128,
  "active_30d": 40,
  "at_risk": 11,
  "refills_due": 7,
  "loyalty_points": 3200,
  "loyalty_liability_rupees": 3200.00,
  "avg_rating": 4.6,
  "segments": {
    "chronic": 22,
    "high_value": 15,
    "lapsed": 18,
    "new": 9,
    "on_credit": 20,
    "regular": 44
  }
}
```

**GET** `/v1/locations/{location_id}/crm/at-risk`

```json
{
  "items": [
    {
      "customer_id": "c_01",
      "name": "Anita Sharma",
      "phone": "9876543210",
      "marketing_consent": true,
      "last_visit_at": "2026-06-01T00:00:00+05:30",
      "ltv": 18000.00
    }
  ]
}
```

**POST** `/v1/locations/{location_id}/crm/at-risk/{customer_id}/win-back`  
Requires marketing consent. Calls `whatsapp`.

**GET** `/v1/locations/{location_id}/crm/patients?segment=chronic&page=`

```json
{
  "items": [
    {
      "customer_id": "c_01",
      "name": "Anita Sharma",
      "rfm_score": 555,
      "tier": "gold",
      "points": 42,
      "orders": 51,
      "last_visit_at": "2026-08-20T00:00:00+05:30",
      "ltv": 21800.00
    }
  ]
}
```

**GET** `/v1/locations/{location_id}/crm/patients/{customer_id}/360`  
Composes customer profile (from `customers`), medicines bought, points, tier, khata outstanding (from `khata`), consents.

### 7.2 Reminders

**GET** `/v1/locations/{location_id}/crm/refills?within_days=14`

**POST** `/v1/locations/{location_id}/crm/refills/{customer_id}/whatsapp`

```json
{ "kind": "refill" | "follow_up" }
```

`403 REFILL_CONSENT_REQUIRED` if no refill consent. `400 PHONE_REQUIRED` if no phone.

### 7.3 Loyalty

**GET** `/v1/locations/{location_id}/crm/loyalty/summary`

```json
{
  "points_outstanding": 3200,
  "liability_rupees": 3200.00,
  "tiers": { "silver": 10, "gold": 4, "platinum": 1 }
}
```

**POST** `/v1/locations/{location_id}/crm/loyalty/quote-redeem`  
`quoteRedeem(customerId, payable)`

```json
{ "customer_id": "c_01", "payable": 1000.00 }
```

```json
{
  "customer_id": "c_01",
  "payable": 1000.00,
  "remaining_points": 42,
  "max_points": 42,
  "max_rupees": 42.00,
  "cap_rupees": 200.00
}
```

If remaining 500 and payable 1000: `max_points` 200 (20% cap). Walk-in / missing customer: `400 NAMED_CUSTOMER_REQUIRED`.

**POST** `/v1/locations/{location_id}/crm/loyalty/apply-earn-burn`  
`applyEarnBurn` — POS after totals known, same transaction as bill post preferred.

```json
{
  "bill_id": "b_99",
  "customer_id": "c_01",
  "tender": "khata",
  "net_collected_before_redeem": 1000.00,
  "redeem_points": 42,
  "client_charge_id": "chg_1"
}
```

Validate `redeem_points ≤ quote(max)` using `net_collected_before_redeem` as payable. Then `net_collected = that − redeem_rupees`; `earn = floor(net_collected / 100)`.

```json
{
  "bill_id": "b_99",
  "burned_points": 42,
  "burned_rupees": 42.00,
  "earned_points": 9,
  "lot_id": "lot_new",
  "remaining_points": 9
}
```

Idempotent on `bill_id`. Kiosk callers: `403 KIOSK_REDEEM_FORBIDDEN` if a kiosk flag is set; POS must not send kiosk channel with redeem_points > 0.

**POST** `/v1/locations/{location_id}/crm/loyalty/reverse-for-credit-note`  
`reverseForCreditNote`

```json
{
  "credit_note_id": "cn_1",
  "original_bill_id": "b_99",
  "returned_fraction": 1.0
}
```

**POST** `/v1/locations/{location_id}/crm/loyalty/referrals`

```json
{
  "referrer_customer_id": "c_01",
  "referee_customer_id": "c_02"
}
```

Posts two `khata` referral credits ₹100. `409 REFERRAL_EXISTS` if duplicate pair.

**POST** `/v1/locations/{location_id}/crm/loyalty/expire-lots`  
Internal/scheduler: zero `remaining` where `expires_at <= now`.

### 7.4 Campaigns

**GET** `/v1/locations/{location_id}/crm/campaigns`

**POST** `/v1/locations/{location_id}/crm/campaigns`

```json
{
  "name": "Diwali refill",
  "segment": "chronic",
  "offer_code": "MONSOON10",
  "template_key": "campaign_generic",
  "body_params": { "headline": "10% off this week" }
}
```

**POST** `/v1/locations/{location_id}/crm/campaigns/{campaign_id}/send`  
Resolves recipients (phone AND marketing_consent). Each send → `whatsapp`. Skip without consent (count `skipped_no_consent`).

**GET** `/v1/locations/{location_id}/crm/campaigns/{campaign_id}`  
Includes `attributed_revenue`, `attributed_bill_count` (offer code on bills in 14 days).

### 7.5 Feedback & analytics

**POST** `/v1/locations/{location_id}/crm/feedback`

```json
{
  "customer_id": "c_01",
  "stars": 5,
  "nps": 9,
  "comment": "Quick service"
}
```

**POST** `/v1/locations/{location_id}/crm/feedback/request-whatsapp`  
`{ "customer_id" }` — marketing consent required.

**GET** `/v1/locations/{location_id}/crm/feedback/summary`  
`{ "promoters", "passives", "detractors", "avg_stars" }`

**GET** `/v1/locations/{location_id}/crm/analytics`

```json
{
  "avg_ltv": 4200.00,
  "retention_pct": 0.62,
  "churn_risk_count": 11,
  "campaign_sales": 18000.00,
  "rfm_leaders": []
}
```

### 7.6 Events

| Event | Direction |
|---|---|
| `bill.posted` | in from POS → applyEarnBurn (or POS calls API in-band) |
| `credit_note.posted` | in → reverseForCreditNote |
| `customer.marketing_consent_revoked` | in → exclude from campaigns |
| `loyalty.balance_changed` | out → `customers` display, `books-gst` amounts already on bill journal |
| `campaign.sent` | out → audit |

Books: loyalty earn/redeem lines on the **same bill journal** (POS/`books-gst` using figures this API returns). CRM does not post journals.

### 7.7 UI

- Route `/crm` with the seven tabs in catalogue order.
- Patient 360: WhatsApp, Call (`tel:{phone}`), Refill, Redeem, New sale; medicines; clinical profile (read-only from customers; deep-link to edit profile on `/customers/:id`).
- Win back / refill / campaign compose use `whatsapp` templates; shop name in body.
- No telephony UI beyond `tel:`.

---

## 8. User Stories & Acceptance Criteria

### US-1: Earn, cap redeem, khata, no kiosk redeem

**Given** a named customer and a posted khata bill with net collected ₹1,050 after coupon, manual, and ₹0 redeem  
**When** `applyEarnBurn` runs  
**Then** the customer earns `floor(1050/100)=10` points in a lot expiring in 12 months.

**Given** remaining 500 points and payable before redeem ₹1,000  
**When** POS calls `quoteRedeem`  
**Then** max redeem is 200 points (₹200 = 20% cap), not 500.

**Given** a kiosk OTC cart  
**When** any client requests redeem_points > 0  
**Then** the system refuses (`KIOSK_REDEEM_FORBIDDEN` / POS never offers the control).

### US-2: Campaigns honour marketing opt-out

**Given** a Chronic segment of 10 patients, 3 without marketing consent  
**When** the Owner sends a campaign with offer `MONSOON10`  
**Then** WhatsApp goes to 7 numbers only, via `whatsapp`, from the Namma WABA.

**Given** one of the 7 later has marketing consent revoked  
**When** a second campaign sends  
**Then** that patient is skipped.

**Given** bills with coupon `MONSOON10` in the next 14 days  
**When** campaign history is opened  
**Then** attributed revenue equals those bill totals.

### US-3: Referral ₹100 via khata; CN reverses lots

**Given** two named customers and a new referral  
**When** staff save the referral  
**Then** `khata` receives two ₹100 referral credits (not SaaS ₹500).

**Given** a bill that earned 10 and burned 20  
**When** a full credit note posts  
**Then** `reverseForCreditNote` restores burn to lots and reverses the earn lot; liability matches.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Walk-in | no earn, no redeem, no campaign |
| Redeem > 20% | cap applied; cannot exceed (`400 REDEEM_CAP`) |
| Redeem > remaining | `400 INSUFFICIENT_POINTS` |
| Duplicate applyEarnBurn | replay |
| Expired lots | remaining 0; not redeemable |
| Return partial | reverse proportional (§10) |
| Campaign no offer | attributed revenue 0 |
| Offer code unknown | `400 OFFER_NOT_FOUND` at campaign save |
| WhatsApp fail | retry in `whatsapp`; recipient Failed; no SMS |
| Plan expired | CRM locked; no redeem; lots retained |
| Win-back without marketing consent | `403 MARKETING_CONSENT_REQUIRED` |
| Refill without refill consent | `403 REFILL_CONSENT_REQUIRED` |
| Self-referral | `400 REFERRAL_SAME_CUSTOMER` |
| FIFO burn across lots | nearest `expires_at` first |

---

## 10. Open Questions / Assumptions

1. **Earn = `floor(net_collected / 100)`** in rupees (not rounded to nearest).
2. **FIFO lots:** burn order = earliest `expires_at`, then earliest `earned_at`.
3. **Tier** uses count of posted bills (visits), not points.
4. **Segment definitions (v1, testable):**  
   - **Chronic:** `customers.conditions` non-empty or `has_rx`.  
   - **High value:** LTV in top 20% of named customers at that location (min 1).  
   - **Lapsed:** last visit > 60 days and < 365 days, `order_count >= 1`.  
   - **New:** first visit within 30 days.  
   - **On credit:** khata outstanding > 0.  
   - **Regular:** `order_count >= 4` and last visit ≤ 60 days and not solely classified as New. A customer may appear in more than one bar (counts are independent).  
   - **At-risk:** Lapsed **or** (Regular/Chronic with no visit in 45+ days). Used for Overview at-risk table.
5. **RFM score:** three digits 1–5 (recency, frequency, monetary) using quintiles at the location. Display as e.g. `555`.
6. **Refill due in 14 days:** last posted line for an Rx-tagged or Chronic customer’s SKU; estimated days of supply = billed `qty` (1 unit = 1 day) from last sale; due date = last_visit + qty days; show if due date is in [today, today+14]. Crude but testable; pack-duration master is not in v1.
7. **Retention %:** named customers with a visit in the last 90 days who also had a visit in the prior 90 days, divided by those who had a visit in the prior 90 days.
8. **CN reverse:** `returned_fraction` = CN GST-inclusive total / original bill total; reverse that fraction of earn (floor points) and restore that fraction of burn (ceil to not exceed burned). Full CN → fraction 1.
9. **Feedback v1** is named-customer only (360 context).
10. **Win back** uses marketing consent (promotional). **Refill** uses refill consent. Both need phone.
11. **Attributed revenue** is offer-code match in 14 days, not incrementality testing.
12. **Patient referral** may be recorded by staff on Loyalty tab; there is no public referral code product in v1.
13. Call button is `tel:` only.
14. Transactional OTP / licence / bill-share are other modules; CRM must not require marketing consent for those paths because it does not send them.
15. Kiosk never redeems even if a named OTC profile is attached.
