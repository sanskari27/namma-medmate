# Requirement Doc: SaaS Billing (`saas-billing`)

## 1. Summary (one paragraph)

SaaS Billing is the pharmacy-facing subscription and Refer & Earn module: the chemist pays Namma for the plan (Free / Starter / Growth / Pro) via **Cashfree**, receives GST invoices at 18% SAC 9983, and can earn **₹500 SaaS credit** (not shop **KhataLedger**) when another chemist joins through their personal code. The Pharmacy Partner Console Subscription screen is always reachable: status banner, auto-renew, Monthly / Annual, plan grid, billing history, Cashfree checkout. The Owner may switch Monthly ↔ Annual, upgrade, downgrade, or renew. An expired paid plan revokes paid modules immediately; data is retained; Free modules stay. `plan-gating` **reads** the **SaasSubscription** status this module **writes**. Cashfree pending or timeout must not mark the subscription paid and must not affect pharmacy POS. Duplicate webhooks are ignored after the first successful post (idempotent). HQ CRM Software UI is `admin-saas-crm`; shop-floor GMV Cashfree is out of v1. UI in `modules/saas-billing/ui` via `@namma-medmate/api-client`; API in `modules/saas-billing/api`. Every pharmacy query includes tenant + `location_id`.

## 2. Scope (in / out)

### In scope

- Pharmacy **Subscription** screen (always on Free): status banner, auto-renew toggle, Monthly / Annual, plan grid, billing history, Cashfree checkout for **SaaS fees**.
- **SaasSubscription** system of record for the pharmacy (plan, cycle, period, auto-renew, status, Cashfree ids, SaaS credit balance).
- **Payment** rows for SaaS (not GMV). GST invoice 18% SAC 9983, downloadable history.
- Owner: upgrade, downgrade, switch Monthly ↔ Annual, renew after expiry.
- Auto-renew toggle. Period-end charge when on. Failure → `past_due` then `expired` (see §10 grace).
- Expired paid plan: write status that `plan-gating` interprets as Free entitlements; retain data; do not delete **Bill** / stock / Users.
- **Refer & Earn** (always): personal code, copy, WhatsApp share deep-link (not auto-send), both parties ₹500 SaaS credit, referrals table. Same programme as HQ (`admin-saas-crm` reads/writes the same credit).
- Cashfree order create, verify, webhook. Idempotent webhook. Pending / timeout ≠ paid.
- Events for `plan-gating` and HQ. Dunning WhatsApp **request** to `whatsapp` (template send owned there).
- English, i18n-ready.

### Out of scope

- HQ CRM Software screens (pipeline, MRR tiles, Mark paid UI, dunning queue chrome) — `admin-saas-crm`. This module may still expose APIs HQ calls (e.g. apply credit, read invoices).
- Shop-floor GMV Cashfree, UPI/Card on POS/kiosk, Namma GMV settlement.
- Attachable add-on SKUs, extra seat SKUs, extra branch SKUs.
- Shop **KhataLedger** / patient referral ₹100 (`crm` / `khata`).
- SMS, Tally, payroll.

## 3. Dependencies (modules + external)

| Dependency                  | Why                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tenancy`                   | **Pharmacy** / **Location**; referral code stored per pharmacy.                                                     |
| `plan-gating`               | Reads `plan` + `subscription_status` this module writes. Does not own billing.                                      |
| `whatsapp`                  | Share referral deep-link only from UI; dunning / payment-fail templates requested as send (not from share buttons). |
| `go-live-kyc`               | Referral credit grant timing (assumption: KYC approved).                                                            |
| `audit`                     | Plan change, checkout, webhook apply, credit post, auto-renew toggle.                                               |
| `admin-platform-settings`   | Platform Cashfree keys (not chemist-facing).                                                                        |
| `admin-saas-crm`            | Same Refer & Earn programme; HQ may call mark-paid / adjust.                                                        |
| `@namma-medmate/api-client` | Console HTTP.                                                                                                       |
| **Cashfree**                | SaaS checkout and webhooks only.                                                                                    |

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall persist one **SaasSubscription** per **Pharmacy** tenant (`tenant_id`) with `location_id` on every pharmacy query (`LOCATION_REQUIRED`).

**FR-2:** The system shall start every new **Pharmacy** on plan `free`, `status=active`, `billing_cycle=null`, `seat_limit=2`, `auto_renew=false`, `saas_credit_paise=0`.

**FR-3:** The system shall recognise plans `free`, `starter`, `growth`, `pro` with these exclusive-of-GST prices in paise and seat limits:

| Plan      | Monthly paise | Annual paise (saving) | Seats              |
| --------- | ------------- | --------------------- | ------------------ |
| `free`    | 0             | —                     | 2                  |
| `starter` | 69900         | 796900 (~5% off)      | 2                  |
| `growth`  | 149900        | 1529000 (~15% off)    | 5                  |
| `pro`     | 299900        | 2879000 (~20% off)    | unlimited (`null`) |

Annual paise = round_half_up(monthly_inr × 12 × (1 − saving), 0) × 100.

**FR-4:** The system shall charge GST 18% (SAC 9983) on the **taxable SaaS fee after applying SaaS credit**, rounded to nearest paise. `taxable_paise = max(0, list_paise - credit_applied_paise)`; `gst_paise = round_half_up(taxable_paise × 18 / 100)`; `payable_paise = taxable_paise + gst_paise`.

**FR-5:** The system shall not collect Cashfree when `payable_paise=0` (fully covered by credit or Free). It shall still write a GST history row with zeros if a paid plan is activated by credit, and set **SaasSubscription** as paid/active.

**FR-6:** The system shall expose Subscription status banner from `status` ∈ `{ active, past_due, expired, cancelled }` plus `plan` and `current_period_end`. Free never shows as expired solely for non-payment.

**FR-7:** The system shall allow the **Owner** only to change plan, cycle, auto-renew, and to start checkout (`OWNER_ONLY`). Other staff may GET the read-only subscription card (plan name) for Account KPIs.

**FR-8:** The system shall create a Cashfree order for payable checkouts with `order_id` unique, `order_amount` = payable INR with 2 decimals, customer = pharmacy GSTIN / Owner contact, `order_note` = SAC 9983, and metadata `{ tenant_id, location_id, plan, billing_cycle, client_checkout_id }`.

**FR-9:** The system shall require `client_checkout_id` (uuid) from the client for checkout create. Retries with the same id return the existing Cashfree order (idempotent). A different body with the same id returns `IDEMPOTENCY_CONFLICT`.

**FR-10:** The system shall **not** set plan paid on order create. Status remains unchanged until webhook success or zero-payable FR-5 path.

**FR-11:** The system shall treat Cashfree pending, user-dropped, and timeout as unpaid: no plan change, no **Payment** success row, pharmacy POS unaffected (no GMV call).

**FR-12:** The system shall verify Cashfree webhooks with the platform secret. Invalid signature → 401, no side effect.

**FR-13:** The system shall process a successful payment webhook **once** per `cashfree_payment_id` (or `cf_order_id` + success). Duplicates return 200 with `{ "duplicate": true }` and shall not create a second invoice or extend the period twice.

**FR-14:** The system shall on first successful paid webhook: insert **Payment** (`purpose=saas`), insert GST invoice row (18% SAC 9983), decrement `saas_credit_paise` by `credit_applied_paise`, set `plan`, `billing_cycle`, `status=active`, `current_period_start/end`, store `cashfree_order_id`, emit `saas-billing.subscription.changed`, **AuditEvent**, and notify `plan-gating`.

**FR-15:** The system shall set `current_period_end` to start + 1 calendar month (Monthly) or + 1 calendar year (Annual), using Asia/Kolkata date boundaries.

**FR-16:** The system shall **upgrade** (Free→paid or lower paid→higher paid) immediately after successful payment: new plan entitlements apply at once; a new period starts now at the new list price; unused time is not refunded in cash and is not converted to SaaS credit (no proration in v1).

**FR-17:** The system shall **downgrade** as a scheduled change: store `pending_plan` + `pending_cycle` effective at `current_period_end` if the period is already paid. If `status=expired`, downgrade / switch to Free is immediate without Cashfree. Owner may cancel a pending downgrade before period end.

**FR-18:** The system shall **switch Monthly ↔ Annual** by a new checkout for the target cycle’s list price (Owner confirms). On success, cycle and period reset from now (same as upgrade payment). Not a shop GMV charge.

**FR-19:** The system shall **renew** an `expired` or `cancelled` subscription via checkout of the selected plan/cycle; on success, entitlements restore immediately.

**FR-20:** The system shall toggle `auto_renew` (Owner). When true at `current_period_end` for a paid plan, the system shall create a Cashfree charge for the same plan/cycle (credit applied). Failure: `status=past_due`, request WhatsApp dunning template via `whatsapp` (Owner OTP mobile / Owner WhatsApp). After grace (assumption §10), `status=expired`.

**FR-21:** The system shall on `status=expired` set entitlements_plan write to `free` for `plan-gating` while retaining `last_paid_plan` for display (“Growth expired”). Paid modules lock immediately. Free modules remain. Data retained. Seats limit becomes 2.

**FR-22:** The system shall list billing history: GST invoices with number, date, plan, cycle, taxable, GST, total, status `paid|void`, PDF URL. Newest first, paginated.

**FR-23:** The system shall number SaaS GST invoices uniquely for Namma (platform sequence), format `NMM/{FY}/{seq}` (FY = April–March). Never reuse.

**FR-24:** The system shall generate a personal `referral_code` unique per **Pharmacy** (8 alphanumeric, no ambiguous characters) at tenant creation if missing.

**FR-25:** The system shall expose copy-referral and `wa.me` share URL with i18n body including shop name and code. `sent=false`; no automatic **WhatsAppMessage**.

**FR-26:** The system shall record a **Referral** when a new **Pharmacy** is created with `referred_by_code`. Self-referral (same tenant, same GSTIN, or same Owner `otp_mobile`) shall be rejected (`REFERRAL_SELF`). Invalid code is ignored (signup continues without referral).

**FR-27:** The system shall grant **₹500 SaaS credit** (`50000` paise) to **both** referrer and referee **once** when the referee **Pharmacy** `kyc_status` becomes `approved` (`go-live-kyc` event). Duplicate grant is impossible (`referral_id` unique credit post). This credit is not **KhataLedger**.

**FR-28:** The system shall list referrals for the current pharmacy: referee shop name (or “Pending KYC”), status `pending_kyc|credited|ineligible`, `credited_at`, credit paise.

**FR-29:** The system shall apply available `saas_credit_paise` automatically at checkout (FR-4). Credit never pays out as cash or shop khata. Credit cannot go negative.

**FR-30:** The system shall not offer add-on SKUs, extra seats SKU, or branches on the plan grid. Extra seats = upgrade plan (Growth 5 / Pro unlimited).

**FR-31:** The system shall not call Cashfree for shop **Bill** tenders. v1 GMV remains cash / khata in `pos-billing`.

**FR-32:** The system shall publish `GET` entitlements snapshot for `plan-gating`: `{ plan, status, seat_limit, billing_cycle, current_period_end, auto_renew }`. When `status=expired|cancelled` (and not Free-native), `plan` returned to gating is `free`.

**FR-33:** The system shall write **AuditEvent** for checkout created, payment applied, plan changed, auto-renew toggled, credit granted, webhook duplicate ignored (optional debug, no PII).

**FR-34:** The system shall never log Cashfree secrets, card data, or full bank details. Webhook payloads stored redacted.

**FR-35:** The system shall keep Subscription and Refer & Earn reachable on Free (no `PLAN_REQUIRED`).

**FR-36:** The system shall use English UI with i18n keys `saasBilling.*`.

## 5. Non-Functional Requirements

- **Tenancy:** `location_id` on every pharmacy query. Webhook looks up tenant from order metadata, not from caller session.
- **Idempotency:** Checkout `client_checkout_id`; webhook `cashfree_payment_id`; credit grant `referral_id`. Charge, webhook handling are idempotent (catalogue invariant 12).
- **Reliability:** Cashfree timeout → unpaid, POS unaffected. Retry webhook is safe.
- **Security:** Platform Cashfree keys only. Owner-only mutations. Webhook signature required.
- **Money:** Integer paise. GST 18% SAC 9983.
- **i18n:** English ships.
- **Audit:** FR-33.
- **Performance:** GET subscription P95 < 200 ms. Checkout create dominated by Cashfree.
- **No SMS.** No shop-floor Cashfree GMV.

## 6. Data Model / Entities

### SaasSubscription (this module; also read by `admin-saas-crm`)

| Field                      | Type             | Notes                                                                                    |
| -------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `tenant_id`                | uuid             | PK                                                                                       |
| `location_id`              | uuid             |                                                                                          |
| `plan`                     | enum             | `free` \| `starter` \| `growth` \| `pro` — **current billed/entitled plan while active** |
| `entitlements_plan`        | enum             | What `plan-gating` consumes; `free` when expired                                         |
| `status`                   | enum             | `active` \| `past_due` \| `expired` \| `cancelled`                                       |
| `billing_cycle`            | enum null        | `monthly` \| `annual`                                                                    |
| `auto_renew`               | boolean          |                                                                                          |
| `seat_limit`               | int null         | 2 / 5 / null                                                                             |
| `current_period_start`     | timestamptz null |                                                                                          |
| `current_period_end`       | timestamptz null |                                                                                          |
| `pending_plan`             | enum null        | Scheduled downgrade                                                                      |
| `pending_cycle`            | enum null        |                                                                                          |
| `last_paid_plan`           | enum null        | Banner after expiry                                                                      |
| `saas_credit_paise`        | int              | ≥ 0                                                                                      |
| `referral_code`            | string           | Unique                                                                                   |
| `cashfree_order_id`        | string null      | Last order                                                                               |
| `cashfree_subscription_id` | string null      | If auto-renew mandate used                                                               |
| `updated_at`               | timestamptz      |                                                                                          |

### Payment (SaaS)

| Field                 | Type        | Notes                            |
| --------------------- | ----------- | -------------------------------- |
| `payment_id`          | uuid        |                                  |
| `tenant_id`           | uuid        |                                  |
| `location_id`         | uuid        |                                  |
| `purpose`             | enum        | `saas` only in this module       |
| `provider`            | enum        | `cashfree` \| `credit` \| `zero` |
| `cashfree_order_id`   | string null |                                  |
| `cashfree_payment_id` | string null | Unique when present              |
| `amount_paise`        | int         | Payable captured                 |
| `status`              | enum        | `pending` \| `paid` \| `failed`  |
| `client_checkout_id`  | uuid        |                                  |
| `created_at`          | timestamptz |                                  |

GMV **Payment** (`cash` \| `khata`) is `pos-billing`, not this table’s `purpose=saas` rows (same entity name, partitioned by purpose / module).

### SaasInvoice (GST tax invoice Namma → chemist)

| Field                  | Type        | Notes                   |
| ---------------------- | ----------- | ----------------------- |
| `invoice_id`           | uuid        |                         |
| `invoice_no`           | string      | `NMM/{FY}/{seq}` unique |
| `tenant_id`            | uuid        |                         |
| `location_id`          | uuid        |                         |
| `payment_id`           | uuid        |                         |
| `plan`                 | enum        |                         |
| `billing_cycle`        | enum        |                         |
| `list_paise`           | int         | Before credit           |
| `credit_applied_paise` | int         |                         |
| `taxable_paise`        | int         |                         |
| `gst_rate`             | int         | 18                      |
| `sac`                  | string      | `9983`                  |
| `gst_paise`            | int         |                         |
| `total_paise`          | int         |                         |
| `issued_at`            | timestamptz |                         |
| `pdf_object_key`       | string      |                         |

### Referral

| Field                | Type             | Notes                                       |
| -------------------- | ---------------- | ------------------------------------------- |
| `referral_id`        | uuid             |                                             |
| `referrer_tenant_id` | uuid             |                                             |
| `referee_tenant_id`  | uuid             | Unique (one referrer per referee)           |
| `code_used`          | string           |                                             |
| `status`             | enum             | `pending_kyc` \| `credited` \| `ineligible` |
| `credit_paise`       | int              | 50000 when credited                         |
| `credited_at`        | timestamptz null |                                             |

## 7. API / Interface Contracts (REST JSON + events + UI)

Base: `/saas-billing`. Bearer on pharmacy routes. Webhook unauthenticated except signature.

### 7.1 Pharmacy REST

#### `GET /saas-billing/subscription?location_id=`

Any authenticated staff (read). Mutations Owner-only.

**200 data:**

```json
{
  "plan": "free",
  "entitlements_plan": "free",
  "status": "active",
  "billing_cycle": null,
  "auto_renew": false,
  "seat_limit": 2,
  "unlimited_seats": false,
  "current_period_end": null,
  "pending_plan": null,
  "last_paid_plan": null,
  "saas_credit_paise": 0,
  "banner": "free_forever"
}
```

`banner` ∈ `{ free_forever, active_paid, past_due, expired_to_free, pending_downgrade }`.

#### `GET /saas-billing/plans?location_id=&cycle=monthly`

**200 data:** plan grid rows with `plan`, `list_paise`, `gst_paise`, `payable_paise` (after this shop’s credit), `seats`, `highlights[]` i18n keys matching catalogue unlocks. No “unlimited branches”.

#### `PATCH /saas-billing/subscription/auto-renew?location_id=`

Owner. `{ "auto_renew": true }`. **200** subscription.

#### `POST /saas-billing/checkout?location_id=`

Owner. Header `Idempotency-Key` optional (in addition to body id).

**Request:**

```json
{
  "client_checkout_id": "11111111-1111-1111-1111-111111111111",
  "plan": "growth",
  "billing_cycle": "monthly"
}
```

**200 data (payable > 0):**

```json
{
  "payment_id": "pay_01",
  "status": "pending",
  "payable_paise": 176882,
  "credit_applied_paise": 0,
  "cashfree": {
    "order_id": "order_xyz",
    "payment_session_id": "session_xyz"
  }
}
```

**200 data (payable = 0):** `{ "payment_id", "status": "paid", "payable_paise": 0, "cashfree": null }` and FR-14 side effects immediately.

UI loads Cashfree JS checkout with `payment_session_id`. Failure / close → remain unpaid (FR-11).

#### `POST /saas-billing/downgrade?location_id=`

Owner. `{ "plan": "starter", "billing_cycle": "monthly" }` — must be lower than current paid plan (rank free < starter < growth < pro). **200:** `{ "pending_plan": "starter", "effective_at": "..." }`.

#### `DELETE /saas-billing/downgrade?location_id=`

Cancels pending downgrade.

#### `GET /saas-billing/invoices?location_id=&page=1&page_size=20`

**200:** `{ "items": [ { "invoice_id", "invoice_no", "issued_at", "plan", "billing_cycle", "taxable_paise", "gst_paise", "total_paise", "pdf_url" } ], "page", "total" }`.

#### `GET /saas-billing/invoices/{invoice_id}.pdf?location_id=`

PDF. Owner or `account-settings` permission.

### 7.2 Refer & Earn

#### `GET /saas-billing/referrals?location_id=`

**200:**

```json
{
  "code": "KRISHNA8",
  "saas_credit_paise": 50000,
  "share_url": "https://wa.me/?text=...",
  "sent": false,
  "items": [
    {
      "referral_id": "r_01",
      "referee_name": "Lakshmi Medicals",
      "status": "credited",
      "credit_paise": 50000,
      "credited_at": "2026-08-20T00:00:00Z"
    }
  ]
}
```

#### `POST /saas-billing/referrals/share-link?location_id=`

**200:** `{ "url": "https://wa.me/?text=...", "sent": false }`.

Signup (`tenancy`) passes `referral_code` query into this module: `POST /saas-billing/internal/referrals` `{ referee_tenant_id, code }` (service-to-service).

### 7.3 Webhook

#### `POST /saas-billing/webhooks/cashfree`

Headers: Cashfree signature (as per Cashfree dashboard). Body: provider payload.

**200:** `{ "ok": true, "duplicate": false }` or `{ "ok": true, "duplicate": true }`.

On `PAYMENT_SUCCESS` / equivalent: FR-13 / FR-14. On failure events: mark **Payment** `failed` if pending; do not change plan.

### 7.4 Gating snapshot (for `plan-gating`)

#### `GET /saas-billing/entitlements?location_id=`

**200:** `{ "plan": "free", "status": "expired", "seat_limit": 2, "billing_cycle": "monthly", "current_period_end": "...", "auto_renew": false }`.

`plan` here is `entitlements_plan`.

### 7.5 HQ-consumed (no HQ UI in this module)

`POST /saas-billing/admin/pharmacies/{tenant_id}/mark-paid` (offline collection) — same FR-14 without Cashfree, **AuditEvent** actor = Namma admin. Used later by `admin-saas-crm`. Not chemist-facing.

### 7.6 Events

| Event                               | Payload                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `saas-billing.subscription.changed` | `{ tenant_id, location_id, entitlements_plan, status, seat_limit }` |
| `saas-billing.payment.paid`         | `{ tenant_id, location_id, payment_id, invoice_no }`                |
| `saas-billing.payment.failed`       | `{ tenant_id, location_id, payment_id }`                            |
| `saas-billing.referral.credited`    | `{ referrer_tenant_id, referee_tenant_id, credit_paise: 50000 }`    |
| `saas-billing.dunning.requested`    | `{ tenant_id, location_id }`                                        |

UI: `'saas-billing.subscription.updated': { location_id: string }`.

### 7.7 UI

- `/account/subscription` — banner, auto-renew, cycle toggle Monthly/Annual, plan grid (Free / Starter / Growth / Pro) with seats and module highlights, CTA Upgrade / Renew / Downgrade, billing history table + PDF.
- `/account/refer` — code, copy, Share WhatsApp, credit balance, referrals table.
- Cashfree checkout overlay; on dismiss without success, banner “Payment not completed — plan unchanged”.
- Expired: paid module routes still paywalled by `plan-gating`; this screen explains renew.
- No UPI on POS. No add-on cards. No unlimited branches on Pro card.
- i18n English.

## 8. User Stories & Acceptance Criteria (Given/When/Then, 2-3 each)

### US-1: Owner upgrades Free → Growth via Cashfree

**Given** a **Pharmacy** on Free, Owner, `saas_credit_paise=0`  
**When** they POST checkout `{ plan: "growth", billing_cycle: "monthly", client_checkout_id }`  
**Then** a Cashfree order is created for taxable 149900 + GST 26982 = 176882 paise, **SaasSubscription** remains `free` until webhook, and POS still works as Free.

**Given** a valid signed `PAYMENT_SUCCESS` webhook for that order  
**When** Cashfree delivers it  
**Then** entitlements_plan becomes `growth`, seat_limit 5, a GST invoice SAC 9983 is stored, **AuditEvent** is written, and `saas-billing.subscription.changed` fires.

**Given** the same webhook delivered again  
**When** the handler runs  
**Then** the response is 200 `duplicate: true`, invoice count is unchanged, and period is not extended twice.

### US-2: Expiry revokes paid modules; POS Free path stays

**Given** Growth `status=active`, `auto_renew=false`, `current_period_end` in the past  
**When** the period-end job runs  
**Then** `status=expired`, `entitlements_plan=free`, `plan-gating` locks Employees / CRM / books, and Inventory / POS / Manage Users (2 seats) remain.

**Given** that expired shop  
**When** the Owner renews Growth and payment succeeds  
**Then** entitlements restore immediately and billing history has a new invoice.

**Given** Cashfree timeout after checkout  
**When** no success webhook arrives  
**Then** subscription is not marked paid and POS GMV is unaffected.

### US-3: Refer & Earn ₹500 SaaS credit both sides

**Given** Pharmacy A has code `KRISHNA8`  
**When** Pharmacy B signs up with that code  
**Then** a **Referral** `pending_kyc` exists and neither credit balance changes yet.

**Given** B’s KYC is approved  
**When** `go-live-kyc.kyc.approved` is handled  
**Then** both A and B gain 50000 paise `saas_credit_paise`, referral status is `credited`, and neither **KhataLedger** moves.

**Given** Owner A shares the code  
**When** they click Share  
**Then** a `wa.me` URL is returned with `sent: false` and no template is sent via WABA automatically.

## 9. Edge Cases & Error Handling

| Case                         | Behaviour                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| Missing `location_id`        | 400 `LOCATION_REQUIRED`                                            |
| Non-Owner checkout           | 403 `OWNER_ONLY`                                                   |
| Invalid plan / cycle         | 400 `VALIDATION_ERROR`                                             |
| Checkout while Cashfree down | 502 `CASHFREE_UNAVAILABLE`; plan unchanged                         |
| Pending / user dropped       | Plan unchanged; Payment `failed` or remains `pending` then expires |
| Duplicate webhook            | 200 duplicate; no second invoice                                   |
| Bad webhook signature        | 401; no side effect                                                |
| `payable_paise=0`            | Skip Cashfree; activate; invoice zeros                             |
| Self-referral                | 409 `REFERRAL_SELF` or ignore at signup                            |
| Double KYC approved event    | Credit once (`referral_id`)                                        |
| Downgrade to higher plan     | 400 `NOT_A_DOWNGRADE`                                              |
| Expired + Add 6th user       | `manage-users` seat cap 2; this module only writes limit           |
| Shop-floor UPI               | Not offered                                                        |
| Add-on SKU                   | Not offered                                                        |
| Credit > list price          | payable 0; leftover credit remains                                 |
| Auto-renew fail              | `past_due` + WhatsApp dunning request; then `expired`              |

## 10. Open Questions / Assumptions

1. **Assumption — proration:** v1 upgrade / cycle switch starts a **new period now** at the new list price. No cash refund. No unused-time SaaS credit. Simple and testable. HQ Mark paid uses the same period rule.
2. **Assumption — grace:** `past_due` keeps paid entitlements for **3 days** after failed auto-renew; then `expired` and entitlements_plan `free`. Catalogue “expired revokes immediately” applies at the expire transition, not during grace.
3. **Assumption — referral grant:** both parties receive ₹500 when the referee KYC is **approved**, once. Not on signup, not on first Cashfree payment.
4. **Assumption — self-referral:** same GSTIN or same Owner mobile or same tenant is ineligible.
5. **Assumption — invalid referral code at signup:** shop is created without a **Referral** row; no error to the chemist beyond optional UI ignore.
6. **Assumption — invoice FY:** India FY April–March in `NMM/{FY}/{seq}` using Asia/Kolkata.
7. **Assumption — GST on credit:** credit reduces taxable value; GST 18% on the reduced taxable amount (FR-4).
8. **Assumption — HQ Mark paid** API exists for `admin-saas-crm` later; no HQ UI here.
9. **Assumption — auto-renew** implementation may use Cashfree recurring / stored mandate; if mandate is missing, treat as failed auto-renew (past_due).
10. **Assumption — amounts** are integer paise. Annual prices as FR-3.
11. **Assumption — Payment entity:** SaaS rows use `purpose=saas`; GMV cash/khata remain `pos-billing`.
12. Vague “same programme as HQ” means one **Referral** table and one credit balance, not two ledgers.
