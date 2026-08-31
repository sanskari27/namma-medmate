# Requirement Doc: Manage Users (`manage-users`)

## 1. Summary (one paragraph)

Manage Users is the Pharmacy Partner Console module that owns staff **User** (login) records for one **Pharmacy** / **Location**: login ID, role, per-module permissions, active flag, and the Owner-facing controls to set or reset password, WhatsApp OTP, and counter PIN, and to list or revoke saved devices. It is **Free** and **seat-capped** (2 on Free and Starter, 5 on Growth, unlimited on Pro). **Employees** (HR directory) are a different entity and a different module; toggling a User inactive or removing a login must never delete the linked **Employee**. The Owner role and its access cannot be reduced. At least one of password or WhatsApp OTP must be enabled on every User. Sharing credentials uses a pre-filled WhatsApp deep-link only — nothing is sent automatically. UI lives in `modules/manage-users/ui`, talks only through `@namma-medmate/api-client`, and the API lives in `modules/manage-users/api` (TypeScript AWS Lambdas). Every pharmacy query is tenant-scoped and includes `location_id`.

## 2. Scope (in / out)

### In scope

- Pharmacy Partner Console screen **Manage Users** (Account group), always reachable on Free.
- CRUD for **User** (login) records scoped to the current **Pharmacy** tenant + `location_id`.
- Roles: **Owner**, **Manager**, **Pharmacist**, **Cashier**, with published default module-permission maps.
- Owner permission grid: tick / untick per-module keys, **Reset to role defaults**, **Select all**.
- Seat-cap enforcement on **Add user** using `plan-gating` seat limit (2 / 5 / unlimited).
- Per User: login ID; password set / reset / copy (temporary plaintext once); WhatsApp OTP on / off; counter PIN set / reset; saved-devices list + revoke one or all; permission grid; active toggle; share-credentials WhatsApp deep-link; remove login.
- Rule: at least one of password or OTP enabled.
- Optional link from User to an existing **Employee** (`employee_id`); unlink on remove; never delete **Employee**.
- Emit **AuditEvent** for create, permission change, login-method change, PIN reset, device revoke, activate / deactivate, remove.
- English UI, i18n-ready message keys.

### Out of scope

- **Employee** HR forms, photos, PAN / Aadhaar, salary-bank master data, ID cards (`employees`).
- Login, session, OTP delivery, PIN verify, password verify, device-cookie issue (`auth`).
- Sending WhatsApp OTP or any WABA template (`whatsapp` send path). This module only builds a `wa.me` share URL.
- Plan catalogue, paywall chrome, seat-limit numbers as a product (`plan-gating` is the source of the cap).
- HQ Namma admin users (`admin-platform-settings`).
- SMS fallback, shop-floor Cashfree GMV, extra branches as a product, attachable seat add-on SKUs.
- Payroll, PF / ESI, payslips.
- Kiosk shopper accounts.

## 3. Dependencies (modules + external)

| Dependency | Why |
|---|---|
| `tenancy` | Resolve **Pharmacy** tenant and **Location**. Every query carries tenant (from session) + `location_id`. |
| `auth` | PIN hash, login methods, saved devices, temporary password issue / hash, session subject `user_id`. This module does not store password hashes, PIN hashes, or device secrets. |
| `plan-gating` | Seat limit for the current plan; module key `manage-users` (always unlocked on Free); module-permission key catalogue. |
| `whatsapp` | Share-credentials is a deep-link only. Must not call send. Optional: i18n share-copy template id for consistent wording. |
| `audit` | Append-only **AuditEvent** on money-adjacent and admin actions listed in §4. |
| `employees` (read) | Optional picker to link `employee_id`. Must not write HR fields. |
| `@namma-medmate/api-client` | Sole UI HTTP path. |
| `libs/db-services` | Sole persistence. |
| `libs/event-bus` | UI events in `modules/manage-users/ui/src/events/events.contract.ts`. |

External systems: none. No Cashfree, no GSTN, no Meta send from this module.

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall persist each staff login as a **User** with `user_id`, tenant id, `location_id`, `login_id`, `role`, `permissions` (map of module keys to boolean), `active`, optional `employee_id`, optional `otp_mobile`, `password_enabled`, `otp_enabled`, `pin_set` (boolean only), `created_at`, `updated_at`.

**FR-2:** The system shall require `location_id` on every pharmacy Manage Users query and mutation and shall reject the request with `LOCATION_REQUIRED` when it is missing.

**FR-3:** The system shall isolate Users by **Pharmacy** tenant: a caller from tenant A shall not read or write Users of tenant B (`TENANT_MISMATCH`).

**FR-4:** The system shall expose exactly four roles: `owner`, `manager`, `pharmacist`, `cashier`.

**FR-5:** The system shall treat the **Owner** User as immutable in role and access: the Owner role cannot be changed; Owner permission booleans cannot be set false; **Reset to role defaults** and **Select all** on Owner shall leave every module key true; attempts to reduce Owner access shall fail with `OWNER_ACCESS_IMMUTABLE`.

**FR-6:** The system shall allow at most one Owner User per **Pharmacy**. Add User shall not offer `owner` as a selectable role. Attempts to create a second Owner shall fail with `OWNER_ALREADY_EXISTS`.

**FR-7:** The system shall not allow deactivating or removing the sole Owner User (`OWNER_REQUIRED`).

**FR-8:** The system shall apply these default module permissions when a User is created or when the Owner chooses **Reset to role defaults**:

| Module key | Owner | Manager | Pharmacist | Cashier |
|---|---|---|---|---|
| `dashboard` | true | true | false | false |
| `pos-billing` | true | true | true | true |
| `orders` | true | true | true | true |
| `prescriptions` | true | true | true | false |
| `khata` | true | true | false | true |
| `inventory` | true | true | true | false |
| `purchases` | true | true | false | false |
| `racks` | true | true | true | false |
| `distributors-reorder` | true | true | false | false |
| `reports` | true | true | false | false |
| `crm` | true | true | true | false |
| `manage-users` | true | false | false | false |
| `account-settings` | true | false | false | false |
| `saas-billing` | true | false | false | false |
| `go-live-kyc` | true | false | false | false |
| `employees` | true | false | false | false |
| `customers` | true | true | true | true |
| `returns` | true | true | true | true |
| `purchase-returns` | true | true | false | false |
| `statutory-registers` | true | true | true | false |
| `sales-ledger` | true | false | false | false |
| `offers` | true | false | false | false |
| `expenses` | true | false | false | false |
| `books-gst` | true | false | false | false |
| `stock-take` | true | false | false | false |
| `ca-sharing` | true | false | false | false |
| `kiosk` | true | false | false | false |
| `whatsapp` | true | false | false | false |

**FR-9:** The system shall let the Owner tick or untick any non-Owner User’s module keys independently of the role defaults, persist the map, and leave the role value unchanged.

**FR-10:** The system shall, on **Select all** for a non-Owner User, set every module key in FR-8 to true.

**FR-11:** The system shall, on **Reset to role defaults** for a non-Owner User, replace `permissions` with the FR-8 row for that User’s current role.

**FR-12:** The system shall count **active** Users (including Owner) toward the plan seat cap returned by `plan-gating`. Inactive Users shall not count.

**FR-13:** The system shall refuse **Add user** when `active_count >= seat_limit` (a numeric limit). The error shall be `SEAT_CAP_REACHED` and shall include `seat_limit`, `active_count`, and `required_plan` (`growth` when limit is 2, `pro` when limit is 5). When `seat_limit` is null (Pro unlimited), Add user shall not be blocked by seats.

**FR-14:** The system shall disable the Add user control in the UI when FR-13 would fail, and shall show an i18n message naming the plan that raises the cap.

**FR-15:** The system shall create a User only when `login_id` is unique within the tenant (case-insensitive trim). Collision shall return `LOGIN_ID_TAKEN`.

**FR-16:** The system shall require `login_id` to be 3–64 characters, `[a-zA-Z0-9._@+-]+`, after trim.

**FR-17:** The system shall require `password_enabled || otp_enabled` on every create and update of login methods. If both would be false, the system shall reject with `AUTH_METHOD_REQUIRED`.

**FR-18:** The system shall, when password is enabled on create or reset, call `auth` to issue a temporary password, store only the hash via `auth`, and return the plaintext **once** in that response as `temp_password` so the Owner can copy it. Subsequent GET User shall not include `temp_password`.

**FR-19:** The system shall expose **Copy password** only while `temp_password_pending` is true (issued and not yet consumed by a successful password login). After `auth` reports the temp password consumed, Copy shall return `TEMP_PASSWORD_UNAVAILABLE` and the UI shall prompt Reset instead.

**FR-20:** The system shall, when WhatsApp OTP is enabled, require `otp_mobile` in E.164 (`+91` plus 10 digits for India v1). Missing or invalid mobile shall return `OTP_MOBILE_REQUIRED`.

**FR-21:** The system shall not send a WhatsApp OTP when the Owner toggles OTP on. Delivery remains an `auth` login-time concern.

**FR-22:** The system shall, on counter PIN set or reset, accept a 4–6 digit numeric PIN once, pass it to `auth` for hashing, persist only `pin_set: true`, and never return the PIN or hash to the client.

**FR-23:** The system shall, on counter PIN reset-clear (Owner clears PIN), call `auth` to delete the PIN hash and set `pin_set: false`. Users with `pin_set: false` cannot use saved-device unlock until a PIN is set again (`auth` enforces verify).

**FR-24:** The system shall list saved devices for a User by calling `auth` (device id, label, last_seen_at, created_at) and shall never store device secrets in this module.

**FR-25:** The system shall revoke one saved device or all saved devices for a User by calling `auth`, then emit **AuditEvent** `user.devices.revoked`.

**FR-26:** The system shall toggle `active` without deleting the User or any linked **Employee**. Deactivating shall free a seat (FR-12). Reactivating shall re-apply FR-13; if the cap would be exceeded, return `SEAT_CAP_REACHED` and leave the User inactive.

**FR-27:** The system shall **Remove** a User by deleting the login record, unlinking `employee_id` if set, revoking sessions and devices via `auth`, and leaving the **Employee** row untouched. Remove of Owner shall fail per FR-7.

**FR-28:** The system shall build a share-credentials URL of the form `https://wa.me/?text=<urlencoded>` using an i18n template that includes shop name, `login_id`, and `temp_password` when pending (or a sentence that the Owner must reset password if not pending). The system shall not call WhatsApp send, shall not create a **WhatsAppMessage**, and shall not mark anything delivered.

**FR-29:** The system shall allow an optional `employee_id` on create / update only when that **Employee** belongs to the same tenant and `location_id`. An **Employee** shall be linkable to at most one User (`EMPLOYEE_ALREADY_LINKED`).

**FR-30:** The system shall restrict mutations (add, edit methods, permissions, PIN, devices, active, remove, share) to a caller whose User has `permissions["manage-users"] === true`. Owner always has that permission. Callers without it shall receive `403 FORBIDDEN`.

**FR-31:** The system shall allow any authenticated staff User of the tenant to GET the seat summary (used / limit / plan) so the Account KPI tile can render; the full User list and secrets remain FR-30.

**FR-32:** The system shall write an **AuditEvent** (actor `user_id`, role, tenant, `location_id`, timestamp, action, target `user_id`, before / after) for: user created, permissions changed, login methods changed, password reset, PIN set / cleared, devices revoked, active toggled, user removed.

**FR-33:** The system shall not log `temp_password`, PIN digits, password hashes, or OTP codes.

**FR-34:** The system shall be idempotent on Create User when `Idempotency-Key` is supplied: the same key + same body returns the original User; a different body with the same key returns `IDEMPOTENCY_CONFLICT`.

**FR-35:** The system shall, when `plan-gating` reports the `manage-users` module unlocked (always on Free), still enforce FR-13. Seat cap is not a paywall of this screen; it is a create-time rule.

**FR-36:** The system shall publish the active User count to `plan-gating` via event `manage-users.seats.changed` after every create, activate, deactivate, and remove so HQ near-cap nudges can read it.

## 5. Non-Functional Requirements

- **Tenancy:** Every pharmacy query includes tenant (session) + `location_id`. No cross-tenant User list.
- **i18n:** UI English in v1. All labels, errors, and the WhatsApp share body use message keys (`manageUsers.*`). No concatenated sentences in code.
- **Security:** Password and PIN never stored in this module. Temp password returned once over TLS. Owner access immutable. Manage Users mutations are Owner-default and permission-gated.
- **Privacy:** `otp_mobile` is PII. List endpoints may return it to callers with `manage-users` permission only. Export of Users is not a patient dump; it is staff login metadata without hashes.
- **Audit:** Append-only **AuditEvent** for FR-32 actions. No updates or deletes of audit rows.
- **Performance:** List Users for a location (≤ 200 rows expected; Pro unlimited seats still paginated) P95 < 300 ms excluding `auth` device fan-out. Device list may be fetched per-row lazily.
- **Reliability:** Create User is transactional: User row + `auth` credential provision succeed together or neither is visible. Retry with `Idempotency-Key` is safe.
- **Availability:** Failure of WhatsApp (Meta) must not block Add user or share-URL generation (share is a local URL).
- **No SMS.** No shop-floor Cashfree. No branch switcher.
- **Accessibility:** Permission grid is keyboard-operable; Add user disabled state is announced.

## 6. Data Model / Entities

This module is a system of record for **User** (login), jointly with `auth` for credential secrets. It is not the system of record for **Employee**.

### User (login)

| Field | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK. Session `sub`. |
| `tenant_id` | uuid | **Pharmacy** tenant. |
| `location_id` | uuid | **Location**. Required on every query. |
| `login_id` | string | Unique per tenant, case-insensitive. |
| `role` | enum | `owner` \| `manager` \| `pharmacist` \| `cashier` |
| `permissions` | jsonb | Map of module key → boolean. Keys = FR-8. |
| `active` | boolean | Inactive does not count toward seats. |
| `employee_id` | uuid null | FK to **Employee**; optional. |
| `otp_mobile` | string null | E.164; required if `otp_enabled`. |
| `password_enabled` | boolean | |
| `otp_enabled` | boolean | WhatsApp OTP. |
| `pin_set` | boolean | True when `auth` holds a PIN hash. |
| `temp_password_pending` | boolean | True until first successful password login. |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `removed_at` | timestamptz null | Set on Remove; login_id may be reused after remove. |

Credential columns (password hash, PIN hash, saved-device tokens) live in `auth`, keyed by `user_id`.

### Seat snapshot (read model, not a separate product entity)

Derived: `active_count = COUNT(User WHERE active AND tenant_id AND location_id AND removed_at IS NULL)`. `seat_limit` from `plan-gating`. `seat_limit === null` means unlimited.

### Permission keys

Closed set equal to the FR-8 module keys. Unknown keys in a PUT body are rejected (`UNKNOWN_MODULE_KEY`).

## 7. API / Interface Contracts (REST JSON + events + UI)

Base path: `/manage-users`. Auth: `Authorization: Bearer <access_token>`. Every pharmacy route requires query `location_id`. Success envelope: `{ "success": true, "data": ... }`. Error envelope: `{ "success": false, "error": { "code": string, "message": string, "details": object } }`.

### 7.1 REST JSON

#### `GET /manage-users/seats?location_id=`

Any authenticated tenant User.

**200 data:**

```json
{
  "plan": "free",
  "seat_limit": 2,
  "active_count": 1,
  "unlimited": false
}
```

`seat_limit` is `null` and `unlimited` is `true` on Pro.

#### `GET /manage-users/users?location_id=&active=&role=&page=1&page_size=20`

Requires `permissions["manage-users"]`.

**200 data:**

```json
{
  "items": [
    {
      "user_id": "u_01",
      "login_id": "ravi.cashier",
      "role": "cashier",
      "permissions": { "pos-billing": true, "orders": true, "khata": true },
      "active": true,
      "employee_id": "e_01",
      "otp_mobile": "+919876543210",
      "password_enabled": true,
      "otp_enabled": true,
      "pin_set": true,
      "temp_password_pending": false,
      "saved_device_count": 1,
      "created_at": "2026-08-01T10:00:00Z",
      "updated_at": "2026-08-15T10:00:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```

`permissions` in list may be omitted; detail endpoint always returns the full map. No `temp_password` on GET list.

#### `GET /manage-users/users/{user_id}?location_id=`

Same permission. **200 data:** one User object plus `"permissions"` full FR-8 map and `"saved_devices": [ { "device_id", "label", "last_seen_at", "created_at" } ]` from `auth`. Never includes hashes or PIN.

#### `POST /manage-users/users?location_id=`

Header `Idempotency-Key` recommended. Requires `manage-users` permission.

**Request:**

```json
{
  "login_id": "ravi.cashier",
  "role": "cashier",
  "employee_id": "e_01",
  "otp_mobile": "+919876543210",
  "password_enabled": true,
  "otp_enabled": true,
  "pin": "1234",
  "permissions": null
}
```

`permissions` null → apply FR-8 defaults for `role`. `pin` optional (4–6 digits); omitted → `pin_set: false`. `role` must not be `owner`.

**201 data:** User object plus `"temp_password": "K7mP2xQ9"` when `password_enabled` is true.

**Errors:** `SEAT_CAP_REACHED` 409, `LOGIN_ID_TAKEN` 409, `AUTH_METHOD_REQUIRED` 422, `OTP_MOBILE_REQUIRED` 422, `OWNER_ALREADY_EXISTS` 409, `EMPLOYEE_ALREADY_LINKED` 409, `VALIDATION_ERROR` 400.

#### `PATCH /manage-users/users/{user_id}?location_id=`

Partial update: `login_id`, `role` (not to/from `owner`), `employee_id` (null unlinks), `otp_mobile`, `active`.

**Errors:** `OWNER_ACCESS_IMMUTABLE` if target is Owner and `role` or `active=false` would violate FR-5/FR-7. `SEAT_CAP_REACHED` on reactivate.

#### `PUT /manage-users/users/{user_id}/permissions?location_id=`

**Request:**

```json
{
  "permissions": { "pos-billing": true, "khata": false },
  "mode": "merge"
}
```

`mode`: `merge` (only listed keys change), `replace` (full FR-8 map required), `select_all`, `reset_defaults`.

Owner target: `OWNER_ACCESS_IMMUTABLE` unless the resulting map is all true.

#### `PUT /manage-users/users/{user_id}/methods?location_id=`

**Request:** `{ "password_enabled": true, "otp_enabled": false, "otp_mobile": null }`

Enforces FR-17 / FR-20. Calls `auth` to persist methods.

#### `POST /manage-users/users/{user_id}/password/reset?location_id=`

Calls `auth` to rotate temp password. **200 data:** `{ "temp_password": "...", "temp_password_pending": true }`.

#### `POST /manage-users/users/{user_id}/password/copy?location_id=`

**200 data:** `{ "temp_password": "..." }` only if `temp_password_pending`. Else `TEMP_PASSWORD_UNAVAILABLE` 409.

#### `PUT /manage-users/users/{user_id}/pin?location_id=`

**Request:** `{ "pin": "445566" }`. **200 data:** `{ "pin_set": true }`. Never echoes `pin`.

#### `DELETE /manage-users/users/{user_id}/pin?location_id=`

**200 data:** `{ "pin_set": false }`.

#### `GET /manage-users/users/{user_id}/devices?location_id=`

Proxy to `auth`. **200 data:** `{ "items": [ { "device_id", "label", "last_seen_at", "created_at" } ] }`.

#### `DELETE /manage-users/users/{user_id}/devices/{device_id}?location_id=`

Revoke one.

#### `DELETE /manage-users/users/{user_id}/devices?location_id=`

Revoke all.

#### `POST /manage-users/users/{user_id}/share-link?location_id=`

**200 data:**

```json
{
  "url": "https://wa.me/?text=...",
  "body": "Namma MedMate login for ...",
  "sent": false
}
```

`sent` is always `false`. No **WhatsAppMessage** row.

#### `DELETE /manage-users/users/{user_id}?location_id=`

Remove login. **204** empty data `{ }`. Owner → `OWNER_REQUIRED` 409.

### 7.2 Consumed contracts (`auth`, `plan-gating`)

This module calls (does not re-own):

- `auth`: provision / rotate temp password; set methods; set / clear PIN hash; list / revoke saved devices; revoke sessions on remove.
- `plan-gating`: `GET` entitlements → `{ plan, seat_limit, modules[] }` for `location_id`.
- `employees`: `GET` employee by id for link validation.
- `audit`: append **AuditEvent**.

### 7.3 Events

**API / domain (for `plan-gating`, HQ, audit subscribers):**

| Event | Payload |
|---|---|
| `manage-users.user.created` | `{ tenant_id, location_id, user_id, role, actor_user_id }` |
| `manage-users.user.updated` | `{ tenant_id, location_id, user_id, fields[] }` |
| `manage-users.user.permissions.changed` | `{ tenant_id, location_id, user_id, permissions }` |
| `manage-users.user.methods.changed` | `{ tenant_id, location_id, user_id, password_enabled, otp_enabled }` |
| `manage-users.user.devices.revoked` | `{ tenant_id, location_id, user_id, device_id \| "all" }` |
| `manage-users.user.deactivated` | `{ tenant_id, location_id, user_id }` |
| `manage-users.user.removed` | `{ tenant_id, location_id, user_id, employee_id }` |
| `manage-users.seats.changed` | `{ tenant_id, location_id, active_count, seat_limit }` |

Payloads are serializable. No passwords, PINs, or tokens.

**UI `events.contract.ts`:**

```ts
'manage-users.list.changed': { location_id: string };
'manage-users.user.saved': { user_id: string };
```

### 7.4 UI (`modules/manage-users/ui`)

- Route: `/account/users` (Account group). Always in the sidebar on Free; no paywall.
- Screen: seat chip (`active_count` / `seat_limit` or “Unlimited”), **Add user** (disabled at cap), table of Users (login ID, role, methods, active, devices).
- Drawer / page per User: role dropdown (disabled for Owner), login ID, password set / reset / copy, OTP toggle + mobile, PIN set / reset, saved devices + revoke, permission grid with Reset defaults / Select all, active toggle, Share via WhatsApp (opens `url` in a new tab; does not send), Remove (confirm).
- Copy uses the clipboard API on `temp_password` from reset or copy endpoint; toast on success.
- All strings via i18n keys. English default.
- Data loading via `@namma-medmate/api-client` generated operations only.

## 8. User Stories & Acceptance Criteria (Given/When/Then, 2-3 each)

### US-1: Owner adds a Cashier within the Free seat cap

**Given** a **Pharmacy** on Free with seat_limit 2, one active Owner, and the caller is Owner  
**When** the Owner submits Add user with `role=cashier`, `login_id=ravi.cashier`, `password_enabled=true`, `otp_enabled=false`  
**Then** the system creates a User with Cashier default permissions from FR-8, returns `temp_password` once, `active_count` becomes 2, and an **AuditEvent** `user created` is appended.

**Given** the same shop now has `active_count=2`  
**When** the Owner opens Manage Users  
**Then** Add user is disabled and the UI names Growth (5 seats) and Pro (unlimited) as the plans that raise the cap.

**Given** `active_count=2` on Free  
**When** a client calls `POST /manage-users/users` anyway  
**Then** the API returns 409 `SEAT_CAP_REACHED` with `seat_limit: 2` and no User is created.

### US-2: Owner customises Manager permissions and cannot reduce Owner

**Given** a Manager User with default permissions  
**When** the Owner unticks `crm` and ticks `account-settings`, then saves  
**Then** the Manager’s stored map has `crm=false` and `account-settings=true`, role remains `manager`, and **AuditEvent** `permissions changed` is written.

**Given** the Owner User  
**When** a client PUTs any Owner permission to false, or PATCHes Owner `role` to `manager`  
**Then** the API returns 409 `OWNER_ACCESS_IMMUTABLE` and the Owner map remains all true.

**Given** a Pharmacist User  
**When** the Owner chooses Reset to role defaults  
**Then** the map matches the Pharmacist column in FR-8.

### US-3: Inactive login frees a seat and does not delete HR

**Given** an active Cashier User linked to **Employee** `e_01` and `active_count` equal to `seat_limit`  
**When** the Owner sets that User `active=false`  
**Then** the User remains in the database, **Employee** `e_01` is unchanged, `active_count` decreases by 1, Add user is enabled, and the Cashier cannot authenticate (`auth` reads `active`).

**Given** that inactive User  
**When** the Owner clicks Remove  
**Then** the User login is deleted, sessions and devices are revoked, `employee_id` is unlinked, and **Employee** `e_01` still exists.

**Given** a User with only OTP enabled  
**When** the Owner turns OTP off while password is already off  
**Then** the API returns 422 `AUTH_METHOD_REQUIRED` and methods are unchanged.

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Missing `location_id` | 400 `LOCATION_REQUIRED` |
| User of another tenant / location | 404 (no leak) |
| Caller without `manage-users` permission | 403 `FORBIDDEN` on mutations and User list |
| Seat cap on Add or reactivate | 409 `SEAT_CAP_REACHED`; UI button disabled |
| Duplicate `login_id` | 409 `LOGIN_ID_TAKEN` |
| Both auth methods off | 422 `AUTH_METHOD_REQUIRED` |
| OTP on, bad / missing mobile | 422 `OTP_MOBILE_REQUIRED` |
| PIN not 4–6 digits | 400 `VALIDATION_ERROR` |
| Copy password after first login | 409 `TEMP_PASSWORD_UNAVAILABLE` |
| Reduce Owner access / change Owner role / remove Owner | 409 `OWNER_ACCESS_IMMUTABLE` or `OWNER_REQUIRED` |
| Second Owner | 409 `OWNER_ALREADY_EXISTS` |
| `employee_id` already linked | 409 `EMPLOYEE_ALREADY_LINKED` |
| `auth` credential provision fails mid-create | Transaction rolls back; no User row; client may retry with same `Idempotency-Key` |
| Plan expired (shop behaves as Free) | Seat limit becomes 2; Add blocked if `active_count >= 2`; existing extra Users are not auto-deleted (see §10) |
| Share credentials | Always `sent: false`; Meta outage irrelevant |
| Unknown module key in PUT | 400 `UNKNOWN_MODULE_KEY` |
| Idempotency-Key reused with different body | 409 `IDEMPOTENCY_CONFLICT` |

## 10. Open Questions / Assumptions

1. **Assumption:** Exactly one Owner per **Pharmacy**, created at tenant signup (`tenancy` / `auth`), not via Add user. No Owner-transfer flow in v1.
2. **Assumption:** Seat count = active Users only. Inactive does not occupy a seat.
3. **Assumption:** On paid-plan expiry or downgrade, Users above the new cap are **not** auto-deactivated. Add / reactivate stay blocked until `active_count < seat_limit`. Login of extra Users continues until the Owner deactivates them. (If product later wants hard lock, `plan-gating` + `auth` would enforce it.)
4. **Assumption:** Module keys not named in the catalogue’s short default table are **false** for that role except the implied operational keys listed in FR-8 (`customers`, `returns`, `purchase-returns`, `statutory-registers` for the roles that already bill / take credit / handle Rx). Owner may still grant the rest.
5. **Assumption:** Temporary password copy is allowed only until first successful password login (`temp_password_pending`).
6. **Assumption:** Removed `login_id` values may be reused.
7. **Assumption:** `otp_mobile` may differ from **Employee** phone; this module does not sync HR.
8. **Assumption:** Share deep-link uses `https://wa.me/?text=` without a pre-filled recipient; the Owner picks the chat in WhatsApp.
9. **Assumption:** Pro `seat_limit` is JSON `null` with `unlimited: true`, not a magic number.
10. **Assumption:** Multiple concurrent sessions remain allowed (`auth` / catalogue); this module does not add a single-session lock.
11. Vague catalogue “Owner locked” is interpreted as FR-5 and FR-6, not as hiding the Owner row from the list.
