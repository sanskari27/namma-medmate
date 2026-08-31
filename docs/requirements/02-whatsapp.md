# Requirement Doc: WhatsApp channel (`whatsapp`)

## 1. Summary

The `whatsapp` module is the only outbound messaging channel for Namma MedMate. Every automated ping to chemist, staff, or named shop Customer — login OTP, khata remind, refill, low stock, licence expiry, IRN/GSTN fail, subscription dunning, Rx pending, kiosk token, and CRM bulk campaigns — is sent from **one Namma MedMate WABA**. The chemist does not connect their own WhatsApp number. Location `display_name` (shop name) appears in every template body. This module owns template catalogue, send + retry, delivery status, pharmacy inbox, mandatory-path failure banners, and the on-demand share-bill deeplink helper. It does not own OTP lockout state (`auth`), campaign targeting (`crm` / `admin-marketing`), or printing / in-app toasts. There is no SMS fallback. English ships in v1; template copy is i18n-ready.

## 2. Scope

- In scope:
  - Send transactional WhatsApp templates from the single Namma MedMate WABA.
  - Send bulk campaign messages when `crm` or `admin-marketing` requests a send (this module sends; it does not choose the audience).
  - Persist **WhatsAppMessage** send log with status queued / sent / delivered / read / failed.
  - Retry a failed send 3 times with backoff; then mark Failed in the inbox.
  - Dedupe at-least-once sends on `template_key + to + bill_id` when `bill_id` is present; otherwise on caller `idempotency_key`.
  - OTP send only: accept plaintext OTP as a template parameter from `auth`; do not store OTP digits in the inbox body; do not enforce 5-attempt / 15-minute lock (that is `auth`).
  - Mandatory-path Owner WhatsApp for GSTN fail, IRN fail, and licence expiry/failure: retry as usual; if still failed, expose a Pharmacy Partner Console banner until an Owner acknowledges.
  - Pharmacy Partner Console WhatsApp inbox (list + status).
  - Share-deeplink helper for on-demand “share bill” / credentials-style pre-filled WhatsApp (user taps Send in WhatsApp; this module does not auto-send those).
  - Inject shop name into template bodies from Location via `tenancy`.
  - Meta status webhooks (delivered / read / failed).
- Out of scope:
  - Chemist connecting their own WhatsApp / WABA.
  - SMS, RCS, email, push, or backup codes.
  - Ingesting patient WhatsApp media (Rx photos never enter via WhatsApp; staff upload is `prescriptions`).
  - OTP generation, expiry, attempt counters, account lock, resend cooldown (`auth`).
  - Password reset UX (`auth` / `manage-users`).
  - Campaign segment targeting, consent checks, offer attribution (`crm`); chemist-account marketing campaigns (`admin-marketing`).
  - Printing invoices/tokens and in-app toasts (`pos-billing`, `account-settings`).
  - Auto-send of on-demand share-bill (deeplink only).
  - WABA token storage UI (`admin-platform-settings` stores platform secrets; this module reads them).
  - Plan paywalls (`plan-gating`): transactional templates are available on every plan; Growth gating of bulk campaigns is enforced by `crm` before it calls send.

## 3. Dependencies

- Other modules/slugs and what is needed:
  - `tenancy`: resolve `display_name` for `tenant_id` + `location_id`; every send is tenant-scoped with `location_id`.
  - `auth` (later): calls send for `login_otp`; owns lock/expiry/attempts; this module only delivers.
  - `audit`: send failures that are mandatory-path should be queryable; this module emits ingest events for mandatory ack and may ingest a send-failed AuditEvent for GSTN/IRN/licence (once `audit` exists).
  - `plan-gating`: not called on transactional send. `crm` must not call campaign send when CRM is locked.
  - Downstream callers (do not implement here): `khata`, `crm`, `statutory-registers`, `books-gst`, `saas-billing`, `prescriptions`, `kiosk`, `pos-billing`, `inventory`, `manage-users` (share deeplink only), `admin-marketing`, `admin-automation`.
- External services/APIs/libraries:
  - Meta WhatsApp Cloud API against the Namma MedMate WABA.
  - WABA access token and phone number id from platform SSM (not chemist console).
  - Persistence via `libs/db-services`.
  - UI via `@namma-medmate/api-client` only.
  - No SMS gateway.

## 4. Functional Requirements

- FR-1: The system shall send all automated WhatsApp messages from the single configured Namma MedMate WABA and shall not accept a per-pharmacy WhatsApp number or token.
- FR-2: The system shall insert Location `display_name` into every template body’s shop-name parameter before calling Meta.
- FR-3: The system shall accept send requests only with `tenant_id` and `location_id` and shall reject a mismatched pair via `tenancy` with `LOCATION_TENANT_MISMATCH`.
- FR-4: The system shall persist a **WhatsAppMessage** row for every accepted send with `message_id`, `tenant_id`, `location_id`, `template_key`, `to`, `purpose`, `status`, `bill_id` (nullable), `idempotency_key`, `mandatory`, `retry_count`, timestamps.
- FR-5: The system shall not persist OTP digits or full OTP body on **WhatsAppMessage**; OTP sends store `template_key=login_otp` and redacted params only.
- FR-6: The system shall expose template keys: `login_otp`, `khata_remind`, `refill`, `low_stock`, `licence_expiry`, `irn_fail`, `gstn_fail`, `subscription_dunning`, `rx_pending`, `kiosk_token`, `bill_share`.
- FR-7: The system shall treat `login_otp`, `khata_remind`, `refill`, `low_stock`, `licence_expiry`, `irn_fail`, `gstn_fail`, `subscription_dunning`, `rx_pending`, `kiosk_token` as transactional (sendable regardless of plan when a caller requests them).
- FR-8: The system shall send CRM/HQ bulk campaign payloads when `template_key` is accompanied by `campaign_id`; this module shall not compute the audience.
- FR-9: The system shall retry a failed Meta send up to 3 times with backoff and increment `retry_count`; after the third failure set `status=failed`.
- FR-10: The system shall not send SMS or any non-WhatsApp fallback when Meta fails.
- FR-11: The system shall update `status` to `sent`, `delivered`, `read`, or `failed` from Meta webhooks and show that status in the inbox.
- FR-12: The system shall, when `bill_id` is present, treat `template_key + to + bill_id` as a dedupe key and return the existing **WhatsAppMessage** for a duplicate send instead of calling Meta again.
- FR-13: The system shall, when `bill_id` is absent, require `idempotency_key` and dedupe on `template_key + to + idempotency_key`.
- FR-14: The system shall mark `mandatory=true` for purposes `irn_fail`, `gstn_fail`, and `licence_expiry` when the caller sets mandatory or when template_key is `irn_fail` | `gstn_fail` | `licence_expiry`.
- FR-15: The system shall, after a mandatory message remains `failed` (retries exhausted), include it in GET mandatory-failures for that `tenant_id` + `location_id` until acknowledged.
- FR-16: The system shall allow **Owner** to acknowledge a mandatory failure; after ack the banner omits that `message_id`.
- FR-17: The system shall keep unacknowledged mandatory failures visible as a console banner on every Pharmacy Partner Console route until ack (component consumed by the shell).
- FR-18: The system shall provide a share-deeplink API that returns a `https://wa.me/` URL with pre-filled text and shall not call Meta send for that helper.
- FR-19: The system shall reject inbound patient media / Rx-as-attachment handling; webhook message types other than status updates are ignored (no queue ingest).
- FR-20: The system shall list inbox rows tenant-scoped with `location_id` for pharmacy Users of that Pharmacy only.
- FR-21: The system shall ship English template copy in v1 and store i18n keys on each catalogue entry for later language packs.
- FR-22: The system shall validate `to` as an E.164 mobile number and reject landlines / empty values with `400 INVALID_WHATSAPP_TO`.
- FR-23: The system shall return `WHATSAPP_OTP_UNDELIVERABLE` to the caller when a `login_otp` send ends as `failed` after retries so `auth` can tell the staff to use password or Owner reset.
- FR-24: The system shall not expose WABA tokens, Cloud API credentials, or Meta business IDs to the Pharmacy Partner Console.

## 5. Non-Functional Requirements

- NFR-1: At-least-once delivery to Meta; callers must tolerate duplicate webhook status updates (status moves forward, never backwards from `read` to `sent`).
- NFR-2: Send path p95 (excluding Meta) ≤ 300 ms to persist queued + invoke Meta; retries are async.
- NFR-3: Backoff between the 3 retries is 2s, 10s, 60s (assumption in §10).
- NFR-4: English UI and English template bodies in v1; keys `whatsapp.inbox.*`, `whatsapp.banner.*`, `whatsapp.templates.*`.
- NFR-5: OTP parameters never appear in application logs, AuditEvent payloads, or inbox preview.
- NFR-6: WABA token is a platform secret; chemists cannot paste a token.
- NFR-7: Module layout `modules/whatsapp/{ui,api,docs}`; UI → API only via `@namma-medmate/api-client`.
- NFR-8: Every pharmacy query requires `location_id`.
- NFR-9: No shop-floor GMV processor; Cashfree is unrelated to this channel.
- NFR-10: Inbox list is paginated; default 50 rows, newest first.

## 6. Data Model / Entities

- Entities/fields this module owns:
  - **WhatsAppMessage**
    - `message_id` (UUID, PK)
    - `tenant_id` (UUID)
    - `location_id` (UUID)
    - `template_key` (enum: keys in FR-6)
    - `to` (E.164 string)
    - `purpose` (`otp` | `khata_remind` | `refill` | `low_stock` | `licence` | `irn_fail` | `gstn_fail` | `dunning` | `rx_pending` | `kiosk_token` | `bill_share` | `campaign` | `other`)
    - `status` (`queued` | `sent` | `delivered` | `read` | `failed`)
    - `bill_id` (nullable string; identity of **Bill** when applicable — this module does not own Bill)
    - `campaign_id` (nullable; owned meaning in `crm` / `admin-marketing`)
    - `idempotency_key` (string)
    - `mandatory` (boolean)
    - `acknowledged_at` (timestamptz, nullable)
    - `acknowledged_by_user_id` (nullable)
    - `retry_count` (int, 0–3)
    - `meta_message_id` (nullable)
    - `last_error_code` (nullable string, Meta or internal)
    - `params_redacted` (json: keys only / non-secret values; never OTP)
    - `created_at`, `updated_at`, `last_attempt_at`
  - **WhatsAppTemplateCatalogue** (seeded, not chemist-editable in v1)
    - `template_key`
    - `meta_template_name`
    - `language` (`en` in v1)
    - `i18n_key`
    - `body_preview_en` (with `{{shop_name}}` placeholder)
    - `transactional` (boolean)
  - Unique: `(template_key, to, bill_id)` where `bill_id` is not null; unique `(template_key, to, idempotency_key)` always.
- Relationships to entities owned elsewhere (reference by name, don't redefine):
  - **Pharmacy / Location** — `tenancy` (shop name, tenant pairing).
  - **User (login)** — `auth` (OTP recipient is the User’s OTP mobile; Owner ack actor).
  - **Bill** — `pos-billing` (optional `bill_id` on bill share / IRN fail).
  - **Customer** — `customers` / `khata` / `crm` (recipient for khata/refill/campaign; consent is enforced by caller).
  - **SaasSubscription** — `saas-billing` (dunning).
  - **AuditEvent** — `audit` (mandatory fail / ack may be ingested).

## 7. API / Interface Contracts

Pharmacy endpoints require `location_id`. Internal send is callable with service credentials from other Lambdas (still must pass `tenant_id` + `location_id`). Envelope `{ data }` / `{ error: { code, message, i18n_key } }`.

### 7.1 Send (internal + authorised modules via api-client)

**POST `/whatsapp/messages`**

Request:

```json
{
  "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
  "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
  "to": "+919876543210",
  "template_key": "login_otp",
  "purpose": "otp",
  "params": {
    "otp": "4821"
  },
  "bill_id": null,
  "campaign_id": null,
  "idempotency_key": "otp-challenge-550e8400-e29b-41d4-a716-446655440000",
  "mandatory": false
}
```

`params.shop_name` is optional; if omitted the service fills it from Location `display_name`. Callers must not omit `idempotency_key` when `bill_id` is null.

Response `202`:

```json
{
  "data": {
    "message_id": "3c9f1a22-1111-4b22-8333-444455556666",
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "status": "queued",
    "deduped": false
  }
}
```

Duplicate: `200` with `deduped: true` and the original `message_id` / current `status`.

Errors: `400 LOCATION_ID_REQUIRED`, `400 INVALID_WHATSAPP_TO`, `400 UNKNOWN_TEMPLATE`, `400 IDEMPOTENCY_KEY_REQUIRED`, `403 LOCATION_TENANT_MISMATCH`, `404` from tenancy.

If `template_key=login_otp` and after retries status is `failed`, subsequent GET of that message plus the send completion callback to `auth` uses code `WHATSAPP_OTP_UNDELIVERABLE` in the async result. The HTTP 202 still means “accepted for delivery”.

### 7.2 Inbox (Pharmacy Partner Console)

**GET `/whatsapp/messages?location_id={uuid}&status=&template_key=&cursor=&limit=50`**

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "message_id": "3c9f1a22-1111-4b22-8333-444455556666",
        "template_key": "khata_remind",
        "to": "+919876543210",
        "purpose": "khata_remind",
        "status": "delivered",
        "bill_id": "INV-24-00018",
        "mandatory": false,
        "retry_count": 0,
        "created_at": "2026-08-31T10:00:00.000Z",
        "preview": "Sri Krishna Medicals: payment reminder for your khata."
      }
    ],
    "next_cursor": null
  }
}
```

OTP rows appear with `preview` without digits, e.g. “Login code sent.”

### 7.3 Mandatory banner

**GET `/whatsapp/mandatory-failures?location_id={uuid}`**

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "message_id": "aa...",
        "template_key": "irn_fail",
        "bill_id": "INV-24-00019",
        "status": "failed",
        "last_error_code": "META_UNAVAILABLE",
        "created_at": "2026-08-31T11:00:00.000Z"
      }
    ]
  }
}
```

**POST `/whatsapp/messages/{message_id}/acknowledge`**

Request:

```json
{
  "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809"
}
```

Owner only. Response `200`: `{ "data": { "message_id", "acknowledged_at" } }`. Non-Owner: `403 FORBIDDEN_ROLE`. Non-mandatory or not failed: `409 NOT_MANDATORY_FAILURE`.

### 7.4 Share deeplink (no Meta send)

**POST `/whatsapp/share-deeplink`**

Request:

```json
{
  "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
  "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
  "to": "+919876543210",
  "text": "Sri Krishna Medicals — invoice INV-24-00018. Thank you."
}
```

Response `200`:

```json
{
  "data": {
    "url": "https://wa.me/919876543210?text=Sri%20Krishna%20Medicals%20%E2%80%94%20invoice%20INV-24-00018.%20Thank%20you."
  }
}
```

Does not create **WhatsAppMessage**. `to` may be omitted for a `wa.me/?text=` link the user shares to a chooser; if omitted, `url` has no phone path. This is the helper for on-demand share bill and for `manage-users` credential copy/share (nothing auto-sent).

### 7.5 Catalogue

**GET `/whatsapp/templates`**

HQ and pharmacy (read-only):

```json
{
  "data": {
    "items": [
      {
        "template_key": "login_otp",
        "meta_template_name": "namma_login_otp",
        "language": "en",
        "i18n_key": "whatsapp.templates.loginOtp.body",
        "transactional": true,
        "body_preview_en": "{{shop_name}}: your login code is {{otp}}. It expires in 10 minutes."
      }
    ]
  }
}
```

English bodies (v1 catalogue — implement these strings; Meta template names may differ in WABA but keys stay stable):

| template_key | English body (shop name always present) |
|---|---|
| `login_otp` | `{{shop_name}}: your login code is {{otp}}. It expires in 10 minutes.` |
| `khata_remind` | `{{shop_name}}: khata reminder. Amount due {{amount}}. Please visit the pharmacy.` |
| `refill` | `{{shop_name}}: your medicine refill is due. Reply or visit the pharmacy.` |
| `low_stock` | `{{shop_name}}: low stock alert for {{sku_name}}.` |
| `licence_expiry` | `{{shop_name}}: {{licence_type}} expires on {{expiry_date}}.` |
| `irn_fail` | `{{shop_name}}: IRN request failed for bill {{bill_no}}. Open the console.` |
| `gstn_fail` | `{{shop_name}}: GSTN request failed. Open the console. 2B may be stale.` |
| `subscription_dunning` | `{{shop_name}}: Namma MedMate subscription payment is due.` |
| `rx_pending` | `{{shop_name}}: a prescription has been waiting more than 2 hours.` |
| `kiosk_token` | `{{shop_name}}: your pickup token is {{token}}. Pay cash at the counter.` |
| `bill_share` | `{{shop_name}}: bill {{bill_no}} total {{amount}}.` |

`bill_share` exists for callers that truly want WABA send; POS on-demand share uses the deeplink helper instead of this send.

### 7.6 Meta webhook

**POST `/whatsapp/webhooks/meta`**

Meta Cloud API status callback. Verifies platform webhook secret. Updates **WhatsAppMessage.status**. Ignores inbound user text/media (no Rx ingest). Response `200` quickly.

### 7.7 Events emitted

- `WhatsAppMessageQueued` — `{ message_id, tenant_id, location_id, template_key, to, bill_id, mandatory }`
- `WhatsAppMessageStatusChanged` — `{ message_id, status, retry_count }`
- `WhatsAppMandatoryFailed` — `{ message_id, tenant_id, location_id, template_key, bill_id }`
- `WhatsAppMandatoryAcknowledged` — `{ message_id, tenant_id, location_id, actor_user_id }`
- `WhatsAppOtpUndeliverable` — `{ message_id, tenant_id, location_id, user_hint: "login_otp" }` (no OTP digits)

### 7.8 UI routes / components

- Pharmacy Partner Console:
  - Route: `/whatsapp` (English title “WhatsApp”, i18n `whatsapp.inbox.title`). Inbox table: to, template, status (Delivered / Read / Failed / Sent / Queued), time, retry. Filters by status.
  - Shell: `MandatoryWhatsAppBanner` — lists unacked IRN/GSTN/licence failures; Acknowledge button (Owner). Copy: “WhatsApp to the owner failed for {{reason}}. Fix the issue or acknowledge.” i18n `whatsapp.banner.mandatoryFailed`.
  - Component: `ShareWhatsAppButton` — calls share-deeplink, opens URL (user taps send).
- Platform Admin HQ:
  - No chemist WABA connect screen.
  - Read-only template catalogue may be shown under Settings via `admin-platform-settings`; this module’s `TemplateCatalogueTable` is reusable.
  - Marketing campaign launch UI is `admin-marketing`; it calls POST `/whatsapp/messages`.

## 8. User Stories & Acceptance Criteria

### US-1: OTP goes out on the Namma WABA

As staff with WhatsApp OTP enabled I receive a 4-digit code on WhatsApp.

- AC-1: Given `auth` POSTs `/whatsapp/messages` with `template_key=login_otp`, valid `location_id`, and `idempotency_key`, when Meta accepts, then a **WhatsAppMessage** exists with `status` `sent` or `delivered` and inbox preview contains no OTP digits.
- AC-2: Given Location `display_name` is “Sri Krishna Medicals”, when the template is sent, then the Meta payload body parameter for shop name equals that display name.
- AC-3: Given Meta fails three times, when retries are exhausted, then status is `failed`, no SMS is sent, and `auth` can observe `WHATSAPP_OTP_UNDELIVERABLE`.

### US-2: Failed IRN WhatsApp stays on the console until Owner acks

As an **Owner** I must not miss a failed IRN alert.

- AC-1: Given an `irn_fail` message is `failed` after 3 retries, when any staff opens the console, then `MandatoryWhatsAppBanner` shows the bill number.
- AC-2: Given I am Owner, when I acknowledge that `message_id`, then GET mandatory-failures no longer includes it and the banner hides if the list is empty.
- AC-3: Given I am Cashier, when I POST acknowledge, then the response is 403 and the banner remains.

### US-3: Share bill does not auto-send

As a Pharmacist I share an invoice via WhatsApp without Namma sending it.

- AC-1: Given I click Share bill, when `ShareWhatsAppButton` runs, then POST `/whatsapp/share-deeplink` returns a `wa.me` URL and no **WhatsAppMessage** is created.
- AC-2: Given the URL is opened, when the user does not tap send, then no Meta send occurs from this module.
- AC-3: Given printing succeeds or fails, when share is used, then print and toast behaviour is unchanged (not owned here).

### US-4: Inbox shows delivery state and is tenant-scoped

As a Manager I inspect whether a khata reminder reached the customer.

- AC-1: Given a `khata_remind` send for my `location_id`, when Meta reports read, then the inbox row status is Read.
- AC-2: Given I query inbox without `location_id`, then the response is 400 `LOCATION_ID_REQUIRED`.
- AC-3: Given another Pharmacy’s `location_id`, when I query, then I get 403 `LOCATION_TENANT_MISMATCH` and no rows.

### US-5: Duplicate bill ping does not double-text

As the platform we are at-least-once with dedupe.

- AC-1: Given two POSTs with the same `template_key`, `to`, and `bill_id`, when both are processed, then Meta is called at most once and the second response has `deduped: true`.
- AC-2: Given OTP resend with a new `idempotency_key` after `auth`’s 30-second cooldown, when posted, then a new **WhatsAppMessage** is created (OTP has no `bill_id`).
- AC-3: Given OTP resend with the same `idempotency_key`, when posted, then the original message is returned.

## 9. Edge Cases & Error Handling

- Meta 4xx template mismatch: mark `failed`, do not retry infinitely; still count toward 3 attempts if classified as retryable 5xx/timeout only. Non-retryable 4xx: `retry_count` may stay 0 and status `failed` immediately. Assumption: 5xx and timeouts retry; 4xx does not.
- Webhook for unknown `meta_message_id`: ignore (200).
- Status regression (`read` then `sent`): ignore older status.
- Mandatory message that later delivers via a delayed webhook: if status becomes `delivered`/`read`, drop from mandatory-failures even without ack.
- Empty campaign audience: not this module’s problem; empty send list means CRM does not call.
- `to` on a walk-in without phone: callers must not call send; this module returns `400 INVALID_WHATSAPP_TO`.
- Patient sends an image to the WABA: ignored; staff still upload Rx in `prescriptions`.
- Chemist asks to connect their business number: no UI; no API.
- Share deeplink `text` over URL length limits: truncate with ellipsis at 1000 characters; `400 TEXT_TOO_LONG` if still over after encode > 2000.
- Concurrent retries: single-worker per `message_id` (lease/lock) so Meta is not blasted in parallel.
- HQ marketing send: `tenant_id`/`location_id` of the chemist account being messaged; still the Namma WABA.

| Code | HTTP | When |
|---|---|---|
| `LOCATION_ID_REQUIRED` | 400 | Missing location |
| `INVALID_WHATSAPP_TO` | 400 | Bad `to` |
| `UNKNOWN_TEMPLATE` | 400 | Unknown `template_key` |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | No `bill_id` and no key |
| `TEXT_TOO_LONG` | 400 | Share text too long |
| `LOCATION_TENANT_MISMATCH` | 403 | Pairing |
| `FORBIDDEN_ROLE` | 403 | Ack by non-Owner |
| `NOT_MANDATORY_FAILURE` | 409 | Ack not applicable |
| `WHATSAPP_OTP_UNDELIVERABLE` | async/result | OTP failed after retries |

## 10. Open Questions / Assumptions

- Assumption: retry backoff is 2s, 10s, 60s; 3 attempts means initial send + 2 retries **or** 3 retries after first fail — implement as **initial attempt + 2 retries** (3 tries total) to match “retry 3 times” as three tries including the first. If QA prefers 1 + 3, adjust in one place. Logged: **3 total Meta attempts**.
- Assumption: Meta template names in WABA are provisioned out of band; this module maps `template_key` → `meta_template_name`.
- Assumption: inbox lives at console route `/whatsapp` under Account until IA is redesigned; source §3.24 does not name the sidebar slot.
- Assumption: OTP resend cooldown (30s) and 10-minute expiry are entirely `auth`; this module will send whenever `auth` calls.
- Assumption: campaign consent and opt-out are enforced by `crm` before POST send.
- Assumption: `bill_share` WABA template is available but POS share-bill uses deeplink only, per product (“user taps send”).
- Assumption: licence alerts at 60/30/7 days are scheduled by `statutory-registers`, which calls this send API with `template_key=licence_expiry` and `mandatory=true`.
- Assumption: webhook signature verification uses the platform App secret from SSM.
- Vague: exact Meta error mapping. Treat timeout and 5xx as retryable.
- Out of v1: chemist-owned WhatsApp, SMS fallback, inbound Rx media, language packs beyond English copy keys.
---
