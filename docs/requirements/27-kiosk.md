# Requirement Doc: Self-Order Kiosk (`kiosk`)

**Plan gate:** Pro. Non-Pro: sidebar lock + paywall; **no working kiosk preview**.  
**Surface:** Same tablet/browser as staff POS — fullscreen OTC self-order. Not a separate app.  
**Owner module:** `modules/kiosk/{ui,api,docs}`  
**Does not post Bills.** Creates `HeldCart` + pickup token; **staff POS** (`pos-billing`) charges **Cash** against the token. Stock deducts only when that staff bill is posted.

---

## 1. Summary

Kiosk is in-shop **OTC** self-order on the **same browser/tablet** as POS. The shopper sees a locked fullscreen catalogue (no console sidebar, no Account/Settings, no other tabs, no URL bar they can use). The only way back to the staff console is the **staff exit PIN**.

v1 settlement: **no processor on the kiosk**. Shopper prints a **pickup token** and pays **Cash at staff POS** (one tender). UPI/Card must not be shown. Catalogue is **OTC only**; H/H1/X are hidden. Substitutes are OTC only. No Rx upload, no doctor, no khata, no loyalty redeem.

Named customer is **optional**: phone + WhatsApp OTP attaches or creates a named OTC profile and **enables allergy check**. Skip = walk-in OTC, no allergy check.

Idle reset clears the cart. Token unpaid after **30 minutes**: cart expired, **no stock move**. Exit PIN brute-force: **5 tries / 10 minutes** (kiosk-specific; not the 15-minute auth lock).

Software cannot fully lock the OS. Production install guide: dedicated tablet + OS kiosk/fullscreen as **ops**, not a v1 product module.

---

## 2. Scope (in / out)

### In scope

- Kiosk config (Owner/Manager): display name, welcome message, staff exit PIN (set via `auth` PIN or dedicated kiosk PIN — **assumption: uses the launching user’s counter PIN unless a location-level kiosk exit PIN is set in config**), idle-reset timer, theme Green/Dark/Gold, show prices.
- Launch kiosk mode from console (Pro only).
- Fullscreen shopper UI: category chips, tap-to-add, optional identify, print token, thank-you.
- OTC catalogue filter; substitute prompt OTC-only; cheapest in-stock generic OTC-only.
- Optional WhatsApp OTP identify (`auth` / `whatsapp` / `customers`).
- Allergy check at token-print if identified and allergies exist (acknowledge to continue).
- `HeldCart` + `kiosk_token_id` via POS holds API; TTL 30 min unpaid.
- Staff POS: lookup token, Charge cash (POS FRs).
- Exit PIN dialog; lockout 5 / 10 min.
- Non-Pro paywall on the console kiosk nav item.
- Ops note in-module docs: OS kiosk recommended.

### Out of scope

- Posting a Bill from the kiosk process.
- Khata, loyalty redeem, doctor, scheduled SKUs, Rx upload.
- UPI/Card/Cashfree on kiosk.
- Offline kiosk queue.
- Separate kiosk APK / OS MDM as a sold module.
- HQ remote camera / shopper analytics product.
- Letting shopper open `/account`, `/settings`, `/pos`, other console routes.
- Preview mode on Starter/Growth that actually adds to a live hold.

---

## 3. Dependencies (be specific: APIs/events needed from other slugs)

| Other slug           | Need                                                    | Contract                                                                                                                                          |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plan-gating`        | Pro feature `kiosk`                                     | 403 + paywall if locked                                                                                                                           |
| `pos-billing`        | Holds + later cash charge                               | `POST /pos/holds` `{ channel: "kiosk", kiosk_token_id, cart_snapshot }`; staff `GET /pos/holds/by-token/:token`; `POST /bills/charge` tender cash |
| `inventory`          | OTC SKUs in stock                                       | Search with `schedule=OTC` only (kiosk API wraps)                                                                                                 |
| `master-catalogue`   | Substitutes                                             | Filter `schedule=OTC` and in-stock                                                                                                                |
| `customers`          | Attach/create named OTC profile                         | `POST /customers` `{ phone, name?, source: "kiosk" }`; allergies                                                                                  |
| `auth`               | Exit PIN verify; WhatsApp OTP for shopper               | `POST /kiosk/exit-pin` (this module) wrapping PIN hash; `POST /auth/otp/request` `{ purpose: "kiosk_identify" }`                                  |
| `whatsapp`           | OTP send from Namma WABA                                | via `auth`                                                                                                                                        |
| `account-settings`   | Shop display name default                               |                                                                                                                                                   |
| `tenancy`            | location_id                                             |                                                                                                                                                   |
| `audit`              | Kiosk launch, exit, lockout, token printed, allergy ack |                                                                                                                                                   |
| `pos-billing` Charge | Stock                                                   | Kiosk **never** calls decrement                                                                                                                   |

---

## 4. Functional Requirements (FR-n: The system shall ... ATOMIC)

### 4.1 Plan and launch

- **FR-1:** The system shall unlock working kiosk only when plan is **Pro** and feature `kiosk` is true.
- **FR-2:** The system shall, on non-Pro, show sidebar lock + paywall naming Pro (₹2,999 + 18% GST) and **shall not** mount shopper catalogue, shall not create holds, shall not print tokens.
- **FR-3:** The system shall launch kiosk from staff console (Owner/Manager/Pharmacist if permitted) on the same origin.
- **FR-4:** The system shall enter software fullscreen: hide console sidebar, Account, Settings, Help, other app routes. Shopper must not see a usable URL bar or tab strip — use Fullscreen API + in-app chrome that has no nav. Escape key shall not exit without PIN.
- **FR-5:** The system shall make **Exit PIN** the only staff path back to the console (`POST /kiosk/exit`).
- **FR-6:** The system shall document that OS-level kiosk mode is ops, not product.

### 4.2 Config

- **FR-7:** The system shall store per location: `display_name`, `welcome_message`, `idle_reset_seconds` (allowed 30–600, default 90), `theme` ∈ {`green`,`dark`,`gold`}, `show_prices` boolean, `exit_pin` hashed (or reference to location kiosk PIN).
- **FR-8:** The system shall not put GSTN secrets in kiosk config.
- **FR-9:** The system shall apply theme tokens to shopper UI only.

### 4.3 Catalogue and cart

- **FR-10:** The system shall list only SKUs with `schedule=OTC` mapped and not banned. H, H1, X **must not appear** (search, chips, substitutes, deep links).
- **FR-11:** The system shall use the same category chips as POS: Fever, Cough, Diabetes, Heart, Stomach, Vitamins, Skin, Baby, Devices, Personal, Ayurveda, First Aid — results still OTC-filtered (empty chip OK).
- **FR-12:** The system shall tap-to-add FEFO in-stock batch only. Out-of-stock cards are not addable.
- **FR-13:** The system shall not increment beyond batch qty (same as POS; still **no stock reserve**).
- **FR-14:** The system shall hide DPCO-violating and banned SKUs.
- **FR-15:** The system shall show prices only if `show_prices`; amounts GST-inclusive MRP.
- **FR-16:** The system shall offer substitutes **OTC only** (short/out + cheapest in-stock generic). Shopper confirms replace.
- **FR-17:** The system shall not show doctor, khata, coupon staff-PIN, loyalty redeem, or Rx upload.
- **FR-18:** The system shall allow coupon display of already-public shelf price only — **no coupon entry in v1 kiosk** unless Offers apply automatically? Catalogue: “Applies at POS (and kiosk price display). One coupon per bill.” **Assumption: kiosk does not collect coupon codes; staff may apply coupon when charging the token at POS.** Shopper sees MRP/list.
- **FR-19:** The system shall idle-reset: after `idle_reset_seconds` without interaction, clear cart and return to welcome. **No hold created** for idle-clear (not a token).

### 4.4 Identify (optional)

- **FR-20:** The system shall offer Skip (walk-in OTC) or Identify (phone + WhatsApp OTP).
- **FR-21:** The system shall send OTP via Namma WABA (`auth` rules: 4-digit, 10 min, 5 attempts then lock 15 min for **that phone**, resend 30 s). Shopper lock does not lock staff POS.
- **FR-22:** The system shall on correct OTP attach existing customer by phone or create named OTC profile (name optional prompt; phone required).
- **FR-23:** The system shall, if identified and allergies exist, run allergy check **before printing token**; shopper must acknowledge (logged) or remove conflicting lines. Walk-in skip: **no** allergy check.
- **FR-24:** The system shall not enable loyalty redeem or khata after identify.

### 4.5 Token (not a bill)

- **FR-25:** The system shall, on Confirm order, create HeldCart `channel=kiosk` with unique `kiosk_token_id` (6-char alphanumeric, unambiguous charset) and `expires_at = now + 30 minutes` (catalogue token unpaid 30 min — **not** idle-reset length).
- **FR-26:** The system shall **not** decrement stock at token print.
- **FR-27:** The system shall print a **thermal 80 mm pickup token** (shop display name, token, time, line names + qty, “Pay cash at counter”). Print fail: still show token on screen huge; staff can reprint from hold.
- **FR-28:** The system shall then show thank-you + token; next shopper starts clean (or idle reset).
- **FR-29:** The system shall expire unpaid tokens at 30 min: hold `expired`, no stock, not an unpaid bill.
- **FR-30:** The system shall not offer kiosk-side “Pay later”, khata, or UPI.

### 4.6 Staff settlement (POS)

- **FR-31:** The system shall instruct staff to charge **Cash** on POS against the token (`GET /pos/holds/by-token/:token` then `POST /bills/charge` with `kiosk_token_id`, `tender=cash`).
- **FR-32:** The system shall refuse staff khata on a kiosk hold (`TENDER_INVALID` in POS).
- **FR-33:** The system shall deduct stock only when that Charge posts (POS).
- **FR-34:** The system shall set Bill.channel=`kiosk`.

### 4.7 Exit PIN lockout

- **FR-35:** The system shall verify exit PIN (hashed) against kiosk config / staff counter PIN policy in `auth`.
- **FR-36:** The system shall lock **kiosk exit** after **5 failed tries for 10 minutes** (catalogue §9). Show “Locked until {time}”. Does not necessarily lock the staff user’s console login on other devices.
- **FR-37:** The system shall audit failed exits and lockouts.
- **FR-38:** The system shall not reveal whether PIN is wrong vs locked in a way that leaks length; generic “Incorrect PIN”.

### 4.8 Hardware / chrome

- **FR-39:** The system shall assume internet; no offline token queue.
- **FR-40:** The system shall use the same thermal printer path as POS for tokens.
- **FR-41:** The system shall not require a barcode scanner for kiosk (tap UI). If a scanner is plugged in, it may type into a hidden field only if it does not open console search.

---

## 5. Non-Functional Requirements

- **NFR-1:** Shopper UI large tap targets ≥ 44 px; English; i18n keys.
- **NFR-2:** Fullscreen best-effort; document OS kiosk for production.
- **NFR-3:** OTC filter enforced **server-side** on every kiosk product API (never trust client).
- **NFR-4:** Token uniqueness per tenant; unguessable enough (no sequential 000001 without rate limit). **6-char from 32-symbol alphabet**.
- **NFR-5:** PII: OTP phone only if shopper opted in; walk-in tokens have no phone.
- **NFR-6:** Theme contrast AA for Green/Dark/Gold.
- **NFR-7:** Idle timer uses shopper interaction (touch/click), not staff POS.

---

## 6. Data Model / Entities

### 6.1 `KioskConfig` (this module)

| Column                     | Type                 |
| -------------------------- | -------------------- |
| `tenant_id`, `location_id` | PK                   |
| `display_name`             | TEXT                 |
| `welcome_message`          | TEXT                 |
| `idle_reset_seconds`       | INT                  |
| `theme`                    | ENUM green/dark/gold |
| `show_prices`              | BOOL                 |
| `exit_pin_hash`            | TEXT                 |
| `updated_at`               |                      |

HeldCart lives in `pos-billing`. Kiosk does not own Bill.

### 6.2 `KioskExitAttempt`

| Column                | Notes                  |
| --------------------- | ---------------------- |
| `location_id`, window | fail count; lock_until |

### 6.3 Token

Stored as `HeldCart.kiosk_token_id`.

---

## 7. API / Interface Contracts (REST JSON, events, UI props)

Kiosk shopper APIs authenticate with a **short-lived kiosk session** issued at launch (`POST /kiosk/session` by staff). That session can only hit `/kiosk/*` shopper routes, not `/bills/charge`.

### 7.1 Staff

`GET /kiosk/config` `PUT /kiosk/config` (Owner/Manager, Pro).  
`POST /kiosk/session` → `{ kiosk_access_token, expires_in }` after Pro check.  
`POST /kiosk/exit` `{ pin }` with kiosk token **or** from overlay.

### 7.2 Shopper (kiosk_access_token)

`GET /kiosk/catalogue?category=&q=` — OTC only, in-stock first.  
`GET /kiosk/skus/:id/substitutes` — OTC in-stock + cheapest generic OTC.  
`POST /kiosk/otp/request` `{ phone }`.  
`POST /kiosk/otp/verify` `{ phone, code }` → `{ customer_id, allergies }`.  
`POST /kiosk/allergy-ack` `{ customer_id, lines }`.  
`POST /kiosk/token` `{ lines, customer_id|null, allergy_ack_token|null, client_hold_id }`  
→ creates POS hold; returns `{ token, expires_at, print_html }`.

Server validates every sku schedule=OTC, qty ≤ sellable, not banned.

### 7.3 Exit PIN

`POST /kiosk/exit-pin`

```json
{ "location_id": "uuid", "pin": "1234" }
```

Success: `{ ok: true }` + clear fullscreen, destroy kiosk session.  
Fail: `{ code: "PIN_INVALID", remaining_attempts }`.  
Locked: `{ code: "KIOSK_PIN_LOCKED", unlock_at }` HTTP 429. **5 fails / 10 minutes.**

This is **not** `POST /pos/pin-verify`.

### 7.4 Events

`KioskTokenPrinted` `{ token, holdId, tenantId, locationId, customerId, lines }` — no stock.  
`KioskExited` `{ actor }`.  
BillPosted with `channel=kiosk` is emitted by POS later.

### 7.5 UI props

```ts
type KioskTheme = 'green' | 'dark' | 'gold';

type KioskShopperProps = {
  displayName: string;
  welcomeMessage: string;
  theme: KioskTheme;
  showPrices: boolean;
  idleResetSeconds: number;
  categories: typeof POS_CHIPS;
};

type KioskPayStep = 'token_only'; // never upi | card | khata
```

Routes: `/kiosk/run` shopper; `/kiosk/settings` staff config (console chrome, Pro).

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Non-Pro**  
Given Growth  
When staff taps Kiosk  
Then paywall; no catalogue; no token API 403.

**US-2 Fullscreen**  
Given Pro launch  
When shopper uses the tablet  
Then no sidebar, no Settings; hardware Back does not show console without PIN.

**US-3 OTC only**  
Given an H1 SKU in inventory  
When shopper searches its name  
Then 0 results; substitutes never include it.

**US-4 Token no stock**  
Given qty 1 on shelf  
When shopper prints token for qty 1  
Then batch qty still 1 until staff cash Charge.

**US-5 Staff cash**  
When cashier charges token cash  
Then Bill channel kiosk, stock 0, cash till.

**US-6 Khata blocked**  
When cashier tries khata on token  
Then POS `TENDER_INVALID`.

**US-7 Unpaid 30 min**  
When 31 min without charge  
Then hold expired; qty unchanged; token invalid.

**US-8 Idle reset**  
Given idle 90 s  
Then cart cleared; no hold if they never confirmed.

**US-9 Identify allergy**  
Given OTP customer with allergies  
When confirm order  
Then ack required; Skip identify has no ack.

**US-10 Exit lockout**  
Given 5 wrong PINs  
Then lock 10 minutes; sixth attempt `KIOSK_PIN_LOCKED`.

**US-11 No UPI**  
Then shopper payment step is print token only.

**US-12 Print fail**  
Then on-screen token still shown; hold exists.

**US-13 Theme**  
When Gold selected  
Then shopper UI uses Gold theme.

**US-14 Show prices off**  
Then cards omit ₹; token may still omit totals if show_prices false — **assumption: token always shows names/qty; prices follow flag.**

---

## 9. Edge Cases & Error Handling (include §10 failure catalogue rows that apply)

| Catalogue event            | Kiosk behaviour                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kiosk + H/H1/X SKU         | Not listed (server-enforced).                                                                                                                                                                                          |
| Kiosk UPI/Card             | Not offered; token → staff cash POS.                                                                                                                                                                                   |
| OTP / PIN wrong 5×         | OTP: 15 min phone lock (`auth`). **Exit PIN: 5 / 10 min.**                                                                                                                                                             |
| Hold expired (30 min)      | Token dead; no stock.                                                                                                                                                                                                  |
| Network drop during Charge | Staff POS problem; token remains hold until success/expiry.                                                                                                                                                            |
| Thermal printer offline    | Token on screen; hold exists.                                                                                                                                                                                          |
| Plan expired               | Kiosk locks; unpaid holds still chargeable on POS as cash until they expire (do not strand a shopper mid-pay — **assumption: existing open kiosk holds can still be cashed on Free POS**; launching new kiosk cannot). |
| Banned / above DPCO        | Not listed.                                                                                                                                                                                                            |
| Concurrent last unit       | Two tokens may both hold snapshots of last unit; first Charge wins; second `STOCK_INSUFFICIENT` — tokens do not reserve.                                                                                               |
| Walk-in + khata            | Impossible on kiosk.                                                                                                                                                                                                   |

Additional:

- Shopper opens DevTools: software cannot fully prevent; ops OS lock.
- Double-tap Confirm: idempotent `client_hold_id` → same token.
- Identified customer is scheduled-only patient: still **cannot** buy H on kiosk.
- Loyalty points visible? **No.**
- Coupon at kiosk: staff applies at POS charge (FR-18).

---

## 10. Open Questions / Assumptions

1. Kiosk **never** posts a Bill.
2. Token TTL **30 min** even if idle-reset is 90 s.
3. Exit PIN lockout **10 min / 5 tries** (not 15).
4. No UPI/Card widgets.
5. No coupon box on kiosk; staff can apply one coupon at POS charge on the resumed hold.
6. `show_prices` false hides ₹ on grid; token still lists items.
7. Expired Pro: cannot launch kiosk; open tokens still cashable at POS.
8. Exit PIN stored hashed on `KioskConfig`; may equal a designated staff PIN.
9. OS kiosk is documentation only.
10. Categories same 13 chips as POS, OTC filtered.
11. WhatsApp OTP from Namma WABA only; no SMS.
12. Theme enum exactly Green / Dark / Gold.
