# Requirement Doc: Login, OTP, PIN, sessions (`auth`)

## 1. Summary

The `auth` module authenticates **User (login)** staff on the Pharmacy Partner Console with password and/or WhatsApp OTP as configured per user, plus a hashed counter PIN for kiosk exit, FEFO override, below-cost / credit-limit override, and saved-device unlock. At least one of password or WhatsApp OTP must be enabled; when both are on, staff pick at the login screen. After a successful password or OTP login, staff may tick “Remember this device” (30 days) and return with PIN only. New browser or cleared storage requires full password or OTP. OTP is 4-digit, 10-minute expiry, 5 attempts then lock 15 minutes, resend cooldown 30 seconds; password and PIN use the same 5-fail / 15-minute lock except kiosk exit PIN which locks after 5 tries / 10 minutes. v1 allows multiple sessions, each audited. This requirement **supersedes** the current `modules/auth` OIDC session validator as the chemist login. HQ staff may keep a separate IdP. Credentials copy/share via WhatsApp is `manage-users`. Owner role cannot be downgraded in session claims.

## 2. Scope

- In scope:
  - Pharmacy staff login: password and/or WhatsApp OTP (staff chooses when both enabled).
  - OTP send via `whatsapp` (`template_key=login_otp`); this module generates the 4-digit code, stores a hash, expiry, attempts, resend cooldown, and lock state.
  - Counter PIN verify API (4–6 digits, hashed) for: `kiosk_exit`, `fefo_override`, `below_cost`, `credit_limit`, `saved_device_unlock`.
  - Saved devices: 30-day remember; PIN-only return; Owner revoke all devices for a user (API here; UI list may be `manage-users`).
  - Session token issue, GET session, logout (revoke this session).
  - Lockouts: 5 failures / 15 minutes for password, OTP verify, and non-kiosk PIN; kiosk exit 5 failures / 10 minutes (separate counter).
  - Multiple concurrent sessions, each ingested to `audit`.
  - Enforce Owner role cannot be reduced on issued claims.
  - If WhatsApp OTP cannot be delivered, return an error so the UI offers password (if enabled) or “ask Owner to reset”.
  - Require `tenant_id` + `location_id` on authenticated pharmacy APIs after login (session bound to the User’s Pharmacy and sole Location).
- Out of scope:
  - Creating Users, permission grid, seat cap, copy/share credentials WhatsApp deeplink (`manage-users`).
  - HQ Super admin / Ops / Finance / Support / Compliance login (separate IdP; do not require the current OIDC mock as chemist login).
  - Kiosk shopper phone OTP to attach a **Customer** (`kiosk` + `whatsapp`); this module only verifies staff PIN for kiosk *exit*.
  - SMS backup codes.
  - Changing login methods UI (`manage-users` writes allowed methods; this module enforces them).
  - Plan paywalls (`plan-gating`).

## 3. Dependencies

- Other modules/slugs and what is needed:
  - `tenancy`: User is bound to one Pharmacy + Location; session includes both; `location_id` on subsequent queries.
  - `whatsapp`: POST `/whatsapp/messages` for `login_otp`; handle `WHATSAPP_OTP_UNDELIVERABLE`.
  - `audit`: ingest `login_succeeded`, `login_failed`, `session_revoked`, `pin_verified`, `pin_failed`, `account_locked`, and saved-device remember/revoke. Login-method *change* is emitted by `manage-users` but this module still audits login events.
  - `manage-users` (later): owns User create, role, allowed methods, PIN set/reset, password set/reset, active flag. This module reads User credential fields via db-services User record.
  - `plan-gating`: not required to log in (login is always reachable).
- External services/APIs/libraries:
  - Password and PIN hashing (see §10).
  - No SMS. No chemist WABA. No Cashfree on login.
  - Persistence via `libs/db-services`.
  - UI via `@namma-medmate/api-client`.
  - Existing OIDC middleware in `modules/auth` is **not** the chemist login path.

## 4. Functional Requirements

- FR-1: The system shall authenticate a pharmacy User only with methods enabled on that User: `password_enabled` and/or `otp_enabled`; at least one must be true or login returns `400 NO_LOGIN_METHOD`.
- FR-2: The system shall, when both methods are enabled, present both on the login screen and accept either path.
- FR-3: The system shall reject password login when `password_enabled=false` with `403 METHOD_DISABLED`.
- FR-4: The system shall reject OTP request/verify when `otp_enabled=false` with `403 METHOD_DISABLED`.
- FR-5: The system shall hash and verify passwords; plaintext is never stored or logged.
- FR-6: The system shall send WhatsApp OTP only through `whatsapp` using a 4-digit numeric code, store only a hash, expiry 10 minutes from issue, and not log the digits.
- FR-7: The system shall expire an OTP 10 minutes after issue (`401 OTP_EXPIRED`).
- FR-8: The system shall increment OTP verify failures and lock the User for 15 minutes after 5 failed verifies (`423 ACCOUNT_LOCKED`).
- FR-9: The system shall refuse OTP resend until 30 seconds after the last send (`429 RESEND_COOLDOWN`).
- FR-10: The system shall lock the User for 15 minutes after 5 failed password attempts (same lock window as OTP/PIN non-kiosk).
- FR-11: The system shall verify counter PIN length 4–6 digits against the stored PIN hash.
- FR-12: The system shall use the shared 5-fail / 15-minute lock for PIN purposes `fefo_override`, `below_cost`, `credit_limit`, and `saved_device_unlock`.
- FR-13: The system shall lock kiosk exit PIN after 5 failed tries for 10 minutes on that kiosk session/device (`423 KIOSK_PIN_LOCKED`) without applying the 15-minute login lock to the User.
- FR-14: The system shall, after successful password or OTP login, accept `remember_device=true` and create a **SavedDevice** valid 30 days.
- FR-15: The system shall allow PIN-only login (`saved_device_unlock`) when a valid unexpired SavedDevice token is presented; otherwise require password or OTP.
- FR-16: The system shall treat missing local device token (new browser / cleared storage) as no SavedDevice and require password or OTP.
- FR-17: The system shall allow Owner to revoke all SavedDevices for a User; subsequent PIN-only login fails until a new remember.
- FR-18: The system shall issue a session token on successful login and allow multiple sessions for the same User.
- FR-19: The system shall revoke only the current session on logout.
- FR-20: The system shall ingest an AuditEvent for login success, login fail, logout, PIN verify success/fail, lock, device remember, and devices revoke, with `tenant_id`, `location_id`, actor, role, timestamp.
- FR-21: The system shall put `role=Owner` on every session for an Owner User and shall not issue reduced permissions for Owner even if a ticks document says otherwise.
- FR-22: The system shall bind the session to the User’s `tenant_id` and `location_id` from **Pharmacy / Location** (one shop).
- FR-23: The system shall not authenticate a Namma HQ principal as a pharmacy User.
- FR-24: The system shall, when OTP send fails after WhatsApp retries, return `503 WHATSAPP_OTP_UNDELIVERABLE` on the OTP request (or on a status poll) and must not invent an SMS code.
- FR-25: The system shall not complete OTP login without a matching unexpired challenge for that User.
- FR-26: The system shall require an active User (`active=true`); inactive Users get `403 USER_INACTIVE`.
- FR-27: The system shall return GET `/auth/session` with user_id, role, tenant_id, location_id, enabled methods, and session_id for a valid token.
- FR-28: The system shall not require OIDC for pharmacy console login.

## 5. Non-Functional Requirements

- NFR-1: Session token is opaque, stored hashed server-side, sent as `Authorization: Bearer` (and optionally httpOnly cookie on the console origin). Assumption §10.
- NFR-2: Password hash: Argon2id (or bcrypt if Argon2 unavailable in the Lambda runtime — pick one and use it for PIN too with a PIN-specific salt/pepper). PIN is hashed, never stored reversible.
- NFR-3: English login UI; i18n `auth.login.*`, `auth.otp.*`, `auth.pin.*`, `auth.lock.*`.
- NFR-4: OTP digits never in logs, AuditEvent, or WhatsApp inbox (whatsapp redacts; auth never sends digits to audit).
- NFR-5: Module layout `modules/auth/{ui,api,docs}`; UI → API via `@namma-medmate/api-client`.
- NFR-6: Every post-login pharmacy API the console calls includes `location_id` matching the session.
- NFR-7: Login endpoints are rate-limited per `login_id` + IP in addition to the 5-fail lock.
- NFR-8: Existing OIDC `GET /auth/session` behaviour for HQ must not be required for chemists; pharmacy session payload is this module’s contract.

## 6. Data Model / Entities

- Entities/fields this module owns (on **User (login)** credential slice; `manage-users` owns profile/role/seat/active writes):
  - `user_id`
  - `tenant_id`, `location_id` (from tenancy; required)
  - `login_id` (globally unique — assumption §10)
  - `password_hash` (nullable)
  - `password_enabled` (boolean)
  - `otp_enabled` (boolean)
  - `otp_mobile` (E.164, required if otp_enabled)
  - `pin_hash` (nullable until set)
  - `failed_attempts` (int)
  - `locked_until` (timestamptz, nullable) — 15-minute login/PIN lock
  - `otp_resend_available_at` (timestamptz, nullable)
  - `role` (read for claims; Owner freeze)
  - `active` (read)
  - **OtpChallenge**
    - `challenge_id` (UUID)
    - `user_id`
    - `otp_hash`
    - `expires_at` (issue + 10 minutes)
    - `attempts` (int, max 5)
    - `consumed_at` (nullable)
  - **SavedDevice**
    - `device_id` (UUID)
    - `user_id`
    - `tenant_id`, `location_id`
    - `token_hash`
    - `expires_at` (created + 30 days)
    - `created_at`, `last_used_at`
    - `user_agent` (string, optional)
  - **Session**
    - `session_id` (UUID)
    - `user_id`
    - `tenant_id`, `location_id`
    - `token_hash`
    - `created_at`, `last_seen_at`
    - `revoked_at` (nullable)
  - **KioskPinAttempt** (per kiosk session)
    - `kiosk_session_id`
    - `user_id` (Owner/staff who configured PIN — the verifying User)
    - `failed_attempts`
    - `locked_until` (10-minute window)
- Relationships to entities owned elsewhere (reference by name, don't redefine):
  - **Pharmacy / Location** — `tenancy`.
  - **Employee (HR)** — `employees` may link to User; not used for login.
  - **WhatsAppMessage** — `whatsapp`.
  - **AuditEvent** — `audit`.
  - Permission ticks — `manage-users`.
  - Kiosk mode UI — `kiosk` calls PIN verify with `purpose=kiosk_exit`.

## 7. API / Interface Contracts

Public (no session): login + OTP request. PIN saved-device login uses device token, not full session. Envelope `{ data }` / `{ error: { code, message, i18n_key } }`.

### 7.1 Password login

**POST `/auth/login/password`**

Request:

```json
{
  "login_id": "priya.cashier",
  "password": "••••••••",
  "remember_device": false
}
```

Response `200`:

```json
{
  "data": {
    "session_token": "nm_sess_...",
    "session_id": "sess-1",
    "user_id": "user-111",
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "role": "Cashier",
    "password_enabled": true,
    "otp_enabled": true,
    "device_token": null
  }
}
```

If `remember_device=true` and PIN is set: also `device_token` (store in browser). If PIN not set: still session; `device_token` null; UI tells Owner to set PIN in Manage Users before remember works. Assumption: remember without PIN still issues session but next visit cannot PIN-unlock (`412 PIN_NOT_SET`).

Wrong password: `401 INVALID_CREDENTIALS` (same message as unknown login_id). After 5 fails: `423 ACCOUNT_LOCKED` with `locked_until`.

### 7.2 OTP request

**POST `/auth/login/otp/request`**

Request: `{ "login_id": "priya.cashier" }`

Response `200`:

```json
{
  "data": {
    "challenge_id": "ch-1",
    "expires_at": "2026-08-31T16:10:00.000Z",
    "resend_available_at": "2026-08-31T16:00:30.000Z",
    "otp_length": 4
  }
}
```

Side effect: generate 4-digit code, hash, POST whatsapp send with `idempotency_key=otp-challenge-{challenge_id}`.

WhatsApp failed: `503 WHATSAPP_OTP_UNDELIVERABLE`, i18n `auth.otp.undeliverable` (“Use your password if enabled, or ask the Owner to reset.”). Cooldown: `429 RESEND_COOLDOWN`.

### 7.3 OTP verify

**POST `/auth/login/otp/verify`**

Request:

```json
{
  "login_id": "priya.cashier",
  "challenge_id": "ch-1",
  "otp": "4821",
  "remember_device": true
}
```

Success: same session payload as password login. Fail: `401 INVALID_OTP`; 5 fails lock 15 minutes. Expired: `401 OTP_EXPIRED`. Consumed challenge: `401 OTP_CONSUMED`.

### 7.4 PIN verify

**POST `/auth/pin/verify`**

Headers: `Authorization: Bearer` required except `purpose=saved_device_unlock`.

Request:

```json
{
  "purpose": "kiosk_exit",
  "pin": "1234",
  "device_token": null,
  "kiosk_session_id": "kiosk-abc"
}
```

`purpose`: `kiosk_exit` | `fefo_override` | `below_cost` | `credit_limit` | `saved_device_unlock`.

Saved device unlock request:

```json
{
  "purpose": "saved_device_unlock",
  "pin": "1234",
  "device_token": "nm_dev_...",
  "login_id": "priya.cashier"
}
```

Response `200`:

```json
{
  "data": {
    "verified": true,
    "verification_id": "pinver-1",
    "purpose": "fefo_override",
    "session_token": null
  }
}
```

For `saved_device_unlock` success: include `session_token` and session fields as login. For override purposes: `verification_id` for POS to attach (single-use, TTL 5 minutes — assumption).

Kiosk 5 fails / 10 min: `423 KIOSK_PIN_LOCKED`. Other PIN 5 fails: increment User `failed_attempts` toward 15-minute `ACCOUNT_LOCKED`.

### 7.5 Session

**GET `/auth/session`**

Pharmacy Bearer token.

Response `200`:

```json
{
  "data": {
    "session_id": "sess-1",
    "user_id": "user-111",
    "login_id": "priya.cashier",
    "role": "Cashier",
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "password_enabled": true,
    "otp_enabled": true,
    "has_pin": true,
    "permissions_owner_frozen": false
  }
}
```

Owner: `"role": "Owner", "permissions_owner_frozen": true`.

Invalid/revoked token: `401 UNAUTHENTICATED`. This payload replaces OIDC chemist session.

**POST `/auth/logout`**

Revokes current session. Response `204` empty or `{ "data": { "revoked": true } }`. Ingest `session_revoked`. Other sessions remain.

### 7.6 Saved devices

**GET `/auth/devices?location_id={uuid}`**

Current user lists own devices, or Owner listing `?user_id=` for a User in the same tenant.

Response: `{ "data": { "items": [ { "device_id", "created_at", "expires_at", "last_used_at", "user_agent" } ] } }` — never returns raw tokens.

**DELETE `/auth/devices?location_id={uuid}&user_id={id}`**

Owner revokes all SavedDevices for that User (or self). Response `{ "data": { "revoked_count": 2 } }`. Ingest audit. `location_id` required.

### 7.7 Events emitted (via audit ingest)

- `login_succeeded` — target User, after/session_id, money_or_stock false
- `login_failed` — no secret in after
- `session_revoked`
- `pin_verified` / `pin_failed` — purpose in after
- `account_locked`
- `admin_action` or dedicated `saved_devices_revoked`

Also notify whatsapp only for OTP send (not an auth event bus).

### 7.8 UI routes / components

- Pharmacy Partner Console:
  - Route `/login` — `LoginPage`: method picker if both enabled (“Password” / “WhatsApp OTP”), fields, Remember this device checkbox (shown after success or on the form as specified: after successful password or OTP — implement as checkbox on the login form applied on success). i18n `auth.login.title`, `auth.login.password`, `auth.login.otp`, `auth.login.rememberDevice`, `auth.login.submit`.
  - `OtpChallengeForm` — 4 boxes, resend disabled until cooldown, expiry copy “Code expires in 10 minutes.”
  - Route `/login/pin` — `PinUnlockPage` when `device_token` present in storage.
  - `LockoutBanner` — “Too many attempts. Try again after {{locked_until}}.” i18n `auth.lock.message`.
  - Undeliverable OTP: `auth.otp.undeliverable`.
  - Shell: session provider; logout button on Account (Account page owned by `account-settings` but calls POST logout here).
- Kiosk: no login page here; `kiosk` calls PIN verify.
- Platform Admin HQ: no chemist password form. HQ IdP out of scope.

## 8. User Stories & Acceptance Criteria

### US-1: Staff picks password or OTP

As a Pharmacist with both methods on I can use either.

- AC-1: Given both flags true, when `/login` renders, then Password and WhatsApp OTP actions are both visible (English).
- AC-2: Given I POST password with correct credentials, then I receive `session_token` with `tenant_id` and `location_id`.
- AC-3: Given `otp_enabled=false`, when I POST `/auth/login/otp/request`, then the response is 403 `METHOD_DISABLED`.

### US-2: OTP rules

As QA I enforce 4-digit / 10 min / 5 tries / 30 s resend.

- AC-1: Given a challenge issued at T, when I verify at T+10min+1s, then `OTP_EXPIRED`.
- AC-2: Given 5 wrong OTP verifies, when I try a 6th, then `ACCOUNT_LOCKED` and password login is also locked until 15 minutes pass.
- AC-3: Given I resend at T+10s, then `429 RESEND_COOLDOWN`; at T+30s a new challenge is issued.

### US-3: Remember this device

As a Cashier I unlock with PIN the next morning on the same browser.

- AC-1: Given I login with `remember_device=true` and PIN is set, when response includes `device_token` and I store it, then POST pin verify `saved_device_unlock` within 30 days issues a new session.
- AC-2: Given Owner DELETE `/auth/devices` for my user, when I PIN-unlock with the old token, then `401 INVALID_DEVICE`.
- AC-3: Given I clear site storage, when I open the console, then `/login/pin` is not available and `/login` password or OTP is required.

### US-4: Kiosk exit PIN is stricter

As staff I exit kiosk with PIN; shopper brute force does not use the 15-minute login lock.

- AC-1: Given 5 wrong `kiosk_exit` PINs, when the 6th is sent, then `423 KIOSK_PIN_LOCKED` and the lock duration is 10 minutes.
- AC-2: Given that kiosk lock, when the same User POSTs password login from the back office, then password login is not blocked solely by the kiosk counter.
- AC-3: Given 5 wrong `credit_limit` PINs, when the User then tries password, then `ACCOUNT_LOCKED` for 15 minutes.

### US-5: OTP undeliverable

As staff I am not stuck without SMS.

- AC-1: Given WhatsApp OTP send fails after retries, when OTP request returns, then `503 WHATSAPP_OTP_UNDELIVERABLE` and the UI copy tells me to use password or ask the Owner.
- AC-2: Given `password_enabled=false` and OTP undeliverable, when I only have OTP, then I cannot enter; Owner must reset via `manage-users` (no SMS).
- AC-3: Given no SMS gateway is configured, when OTP fails, then no text message is sent.

### US-6: Multiple sessions audited

As Owner I can be logged in on two counters.

- AC-1: Given two successful logins, when both tokens GET `/auth/session`, then both are valid with distinct `session_id`.
- AC-2: Given logout on session A, when GET session with token B, then 200; token A is 401.
- AC-3: Given each login, when audit is queried, then a `login_succeeded` AuditEvent exists per session.

### US-7: Owner cannot be downgraded

As Owner my session role stays Owner.

- AC-1: Given User role Owner, when GET `/auth/session`, then `role=Owner` and `permissions_owner_frozen=true`.
- AC-2: Given a tampered ticks document denying POS, when Owner session is used, then claims still say Owner (this module does not omit Owner).
- AC-3: Given a non-Owner User, when session is issued, then `permissions_owner_frozen=false`.

## 9. Edge Cases & Error Handling

- Unknown `login_id` vs bad password: same `401 INVALID_CREDENTIALS` (no user enumeration). OTP request for unknown login: same `401` or generic `200` with fake cooldown — pick **generic 401 INVALID_CREDENTIALS** for unknown ids on password; for OTP request use **200 with no send** vs 401 — **use 401 INVALID_CREDENTIALS** for unknown to avoid sending OTP to random numbers. Known user with OTP off: `403 METHOD_DISABLED`.
- User has neither method: `400 NO_LOGIN_METHOD` (data error; Owner must fix).
- PIN not 4–6 digits: `400 INVALID_PIN_FORMAT`.
- Saved device expired (>30 days): `401 DEVICE_EXPIRED`.
- Inactive User: `403 USER_INACTIVE` even with correct password.
- Concurrent last OTP verify: consume challenge once (unique consumed).
- WhatsApp success but user never receives: they wait or resend after 30s or use password.
- HQ OIDC user hitting pharmacy login: no tenant User row → `401 INVALID_CREDENTIALS`.
- Session used with wrong `location_id` on downstream APIs: those APIs 403; auth GET session still returns the bound location.
- Brute force on kiosk: lock 10 minutes; attempts reset after lock expires.
- `manage-users` sets password_enabled off while a session exists: existing session remains until logout; new password logins fail. Assumption.

| Code | HTTP | When |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Bad login/password / unknown user |
| `INVALID_OTP` | 401 | Wrong OTP |
| `OTP_EXPIRED` | 401 | >10 min |
| `OTP_CONSUMED` | 401 | Replay |
| `UNAUTHENTICATED` | 401 | Bad session |
| `INVALID_DEVICE` | 401 | Revoked/unknown device token |
| `DEVICE_EXPIRED` | 401 | >30 days |
| `METHOD_DISABLED` | 403 | Method off |
| `USER_INACTIVE` | 403 | Inactive |
| `NO_LOGIN_METHOD` | 400 | Both methods off |
| `INVALID_PIN_FORMAT` | 400 | PIN not 4–6 digits |
| `PIN_NOT_SET` | 412 | Remember/unlock without PIN |
| `ACCOUNT_LOCKED` | 423 | 5 fails / 15 min |
| `KIOSK_PIN_LOCKED` | 423 | 5 fails / 10 min |
| `RESEND_COOLDOWN` | 429 | <30 s |
| `WHATSAPP_OTP_UNDELIVERABLE` | 503 | OTP not delivered |
| `LOCATION_ID_REQUIRED` | 400 | Device list/revoke missing location |

## 10. Open Questions / Assumptions

- Assumption: pharmacy staff auth is password and/or WhatsApp OTP as specified; the current OIDC mock is **not** the chemist login. HQ staff may keep a separate IdP; Platform Admin HQ does not use this login page.
- Assumption: `login_id` is globally unique so the login form does not ask for a shop code; User still has `tenant_id` + `location_id`.
- Assumption: password and PIN hashing is Argon2id; if the runtime cannot, bcrypt with work factor ≥ 12. Same algorithm family for both.
- Assumption: session is an opaque Bearer token hashed at rest; TTL 12 hours idle refresh on GET session — source only says “session token; logout”. **Idle TTL 12 hours** is an implementation assumption; sliding last_seen.
- Assumption: kiosk exit lock is scoped to `kiosk_session_id`, not the User’s 15-minute login lock, so a shopper cannot lock staff out of POS password login.
- Assumption: shared 15-minute lock is one `locked_until` on the User for password + OTP verify + non-kiosk PIN.
- Assumption: Remember checkbox may be on the login form and applied if success; equivalent to “after successful password or OTP”.
- Assumption: PIN must already be set (`manage-users`) for device remember to issue `device_token`.
- Assumption: override `verification_id` TTL 5 minutes, single use, consumed by POS/inventory.
- Assumption: multiple sessions allowed with no v1 cap.
- Assumption: Kiosk shopper OTP is not this module.
- Vague: exact session TTL. Logged above rather than silent infinite sessions.
- Out of v1: SMS backup, WebAuthn, chemist SSO, forcing single session, OIDC as chemist login.
---
