# Requirement Doc: Admin Platform Settings & RBAC (`admin-platform-settings`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`. Secrets: AWS SSM / platform secret store — **never** chemist console, **never** logs, **never** CA pack.  
**Source:** feature catalogue §4.11, §9 Secrets, §2.4 future GMV Cashfree, §2.5 WABA; glossary; ADR 0006 secrets separation; decomposition #42.  
**Sidebar:** **Settings & RBAC**. Write: **Super admin only** for roles, flags, WABA, Cashfree keys. Audit log readable by Super admin; Operations may read audit. Finance may read platform GSTIN (needed for GSTR) but not payment/WABA secrets.

A Namma admin is **not** a pharmacy user. Actions save immediately. WABA token and Cashfree keys are **platform secrets**. Shop-floor GMV Cashfree is **off** until the flag is on; even then the GMV **product is not built in v1** — the flag exists as a locked door.

---

## 1. Summary

HQ **Settings & RBAC** is how Namma runs the control plane: **team & roles** (Super admin / Operations / Finance / Support / Compliance), **feature flags**, **platform WhatsApp WABA** (Namma MedMate — chemists do not bring a number), **Cashfree keys for SaaS checkout**, the **GMV Cashfree flag** (off; future Namma merchant, tenant-tagged charges, T+1/weekly settlement, **no GMV take-rate**), **platform legal/GSTIN** for Namma SaaS tax, and an **audit log** (actor, action, target, time) for every critical admin action — written through `audit` with HQ/platform scope. This module is the permission source of truth for all other HQ modules.

---

## 2. Scope (in / out)

**In scope**

- HQ user directory: invite, deactivate, set role. Login methods reuse `auth` (password and/or WhatsApp OTP) for **platform-scoped** users, not `manage-users` pharmacy seats.
- Roles: **Super admin**, **Operations**, **Finance**, **Support**, **Compliance** — permission matrix below.
- Feature flags registry. v1 required flag: `gmv_cashfree` default **false**. Optional: `whatsappConversationRatePaise` as a numeric setting (used by `admin-marketing` estimator).
- Platform WABA configuration: phone display, Meta business id **references**; **token stored as secret** (write-only / last-4). Chemists never paste a token.
- Cashfree **SaaS** keys (app id / secret) write-only for Admin HQ checkout (`saas-billing`). Separate from any future GMV keys.
- GMV Cashfree: flag off; placeholder key fields **disabled** while flag off; copy that when on, charges use **Namma’s account**, **tenant-tagged**, settle T+1 or weekly, **minus nothing**. Do not implement settlement jobs in v1.
- Platform taxpayer profile: legal name, GSTIN, address, state code (for `admin-finance` GSTR).
- Audit log viewer: actor, action, target, time (and tenantId if any). Every critical HQ action from all admin-* modules must appear (they emit to `audit`; this UI reads).
- SLA/L2 flags on Support users (`isL2`) for `admin-support`.

**Out of scope**

- Pharmacy Manage Users, seats, Owner — `manage-users`.
- Chemist GSTN/IRP credentials — `account-settings` / `books-gst` (encrypted, Owner-only).
- Master catalogue — `master-catalogue`.
- Implementing shop-floor UPI/Card POS — not in v1 even if flag flipped.
- Chemist-owned WABA.
- Attachable add-on SKUs.
- Terraform/GitHub secret sync (ADR 0006) — ops, not this UI; this UI writes to SSM via API using the same paths.

---

## 3. Dependencies

| Module          | Need                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`          | Create HQ sessions; password/OTP/PIN lock policy same 5-fail / 15 min; HQ users have `principalType=hq`. Pharmacy JWTs cannot pass HQ authorizer. |
| `whatsapp`      | Reads WABA secret at send time; this module writes secret + public metadata.                                                                      |
| `saas-billing`  | Reads Cashfree SaaS keys at checkout; never from chemist console.                                                                                 |
| `audit`         | Append-only `AuditEvent`; this module’s viewer queries platform scope.                                                                            |
| `admin-tenants` | Shell hides sidebar items using this module’s permission API.                                                                                     |
| All HQ modules  | Must call `GET /admin/me` or authorizer that embeds `HqRole` + permission codes.                                                                  |

**External:** AWS SSM (or equivalent) for secret material. Cashfree dashboard is not in-app. Meta WABA admin is not in-app.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### Team & roles

- FR-1: The system shall store HQ users with exactly one role: `super_admin` | `operations` | `finance` | `support` | `compliance`.
- FR-2: The system shall allow Super admin to **invite** an HQ user (name, email, phone for OTP, role). Invite creates the user inactive until first login/password set as `auth` specifies for HQ.
- FR-3: The system shall allow Super admin to **deactivate** an HQ user (cannot authenticate; audit remains). Super admin cannot deactivate the last remaining Super admin (`409 LAST_SUPER_ADMIN`).
- FR-4: The system shall allow Super admin to **change role** immediately; the user’s next API call uses the new role (JWT may need refresh — if JWT embeds role, force re-login or short-lived claims; §10: permissions checked server-side each request, JWT only identifies `hqUserId`).
- FR-5: The system shall not allow an HQ user to be attached to a pharmacy tenant as staff through this screen.
- FR-6: The system shall enforce the permission matrix:

| Permission code        | Super admin | Operations | Finance | Support          | Compliance |
| ---------------------- | ----------- | ---------- | ------- | ---------------- | ---------- |
| `hq.shell`             | yes         | yes        | yes     | yes              | yes        |
| `tenants.read`         | yes         | yes        | yes     | yes              | yes        |
| `kyc.decide`           | yes         | yes        | no      | no               | yes        |
| `subscription.suspend` | yes         | yes        | yes     | no               | no         |
| `crm.read`             | yes         | yes        | yes     | yes              | yes        |
| `crm.plan_change`      | yes         | yes        | yes     | no               | no         |
| `crm.mark_paid`        | yes         | yes        | yes     | no               | no         |
| `crm.pipeline`         | yes         | yes        | no      | no               | no         |
| `crm.module_override`  | yes         | no         | no      | yes              | no         |
| `crm.coupon`           | yes         | yes        | yes     | no               | no         |
| `crm.csm`              | yes         | no         | no      | yes              | no         |
| `rx.annotate`          | yes         | no         | no      | no               | yes        |
| `rx.read`              | yes         | yes        | no      | yes (masked PII) | yes        |
| `finance.refund`       | yes         | no         | yes     | no               | no         |
| `finance.gstr`         | yes         | no         | yes     | no               | no         |
| `finance.ledger.read`  | yes         | yes        | yes     | no               | no         |
| `marketing.launch`     | yes         | yes        | no      | no               | no         |
| `analytics.schedule`   | yes         | yes        | yes     | no               | no         |
| `support.agent`        | yes         | no         | no      | yes              | no         |
| `support.read`         | yes         | yes        | no      | yes              | yes        |
| `automation.write`     | yes         | yes        | no      | no               | no         |
| `settings.write`       | yes         | no         | no      | no               | no         |
| `secrets.write`        | yes         | no         | no      | no               | no         |
| `audit.read`           | yes         | yes        | yes     | no               | yes        |
| `platform_gstin.read`  | yes         | no         | yes     | no               | no         |

- FR-7: The system shall return `403 FORBIDDEN` with the missing permission code when a role attempts a denied mutation.
- FR-8: The system shall allow Super admin to set `isL2=true` on a Support user (for ticket escalation).

### Feature flags

- FR-9: The system shall persist flag `gmv_cashfree` default `false`. Super admin may set true; **v1 application behaviour:** POS/kiosk still must not offer UPI/Card (`pos-billing` / `kiosk` ignore true until those modules implement GMV). HQ Finance GMV tab stays non-operational. The flag is the **future door**.
- FR-10: The system shall document on the flag row: when enabled in a future release, GMV uses **Namma’s Cashfree account**, charges **tagged by tenant**, settlement **T+1 or weekly**, **no GMV take-rate** (SaaS remains a separate invoice).
- FR-11: The system shall persist optional numeric `whatsapp_conversation_rate_paise` (default 8000) for Marketing estimator.
- FR-12: The system shall not add flags that sell add-on SKUs or extra branches.

### WhatsApp WABA (platform)

- FR-13: The system shall show WABA public fields: display name “Namma MedMate”, WABA phone, Meta business id (optional), connected status as reported by `whatsapp`.
- FR-14: The system shall accept a new WABA **token** via write-only input (never echoed; show last-4 after save). Store in platform secret store. Chemist console has **no** field for this.
- FR-15: The system shall state in UI that **chemists do not bring their own WhatsApp number**; shop name is interpolated in templates by `whatsapp`.
- FR-16: The system shall not log the token.

### Cashfree keys

- FR-17: The system shall store **SaaS** Cashfree `appId` + `secret` write-only (last-4 of appId visible). Used only by `saas-billing` HQ/chemist **subscription** checkout.
- FR-18: The system shall show **GMV Cashfree** key fields **disabled** while `gmv_cashfree` is false. If true, Super admin may paste GMV keys into a **separate** secret slot (Namma merchant). v1 must still not call GMV charge from POS.
- FR-19: The system shall never paste Cashfree keys into the pharmacy Partner Console.

### Platform taxpayer

- FR-20: The system shall store Namma legal name, GSTIN, address, state code, and declare SAC 9983 as the SaaS service code (display-only constant).
- FR-21: The system shall save taxpayer edits immediately and audit them. Finance role may **read** GSTIN; only Super admin writes.

### Audit log

- FR-22: The system shall list `AuditEvent` rows for platform/HQ scope: `actorHqUserId` (or `automation`), `action`, `targetType`, `targetId`, `tenantId` nullable, `at`, `before`/`after` when money, KYC, plan, secrets (secrets: after is `{ "rotated": true }` only).
- FR-23: The system shall require every critical admin action in HQ modules to write this log (KYC decide, plan change, mark paid, refund, suspend, module override, coupon, WABA/Cashfree rotate, flag change, role change, kill-switch, automation approve, ticket escalate, Rx flag, campaign launch).
- FR-24: The system shall filter audit by actor, action prefix, tenantId, date range; paginate; export CSV for Super admin.
- FR-25: The system shall not allow audit rows to be edited or deleted.

### Session

- FR-26: The system shall expose `GET /admin/me` `{ hqUserId, name, role, permissions[], isL2 }`.
- FR-27: The system shall save all settings mutations immediately.

---

## 5. Non-Functional Requirements

- NFR-1: Secret values encrypted at rest (KMS); API responses never include full tokens/keys.
- NFR-2: Authorizer checks FR-6 on every HQ Lambda (not only UI hide).
- NFR-3: Audit log append-only; query p95 ≤ 500 ms with indexes (`at`, `actorHqUserId`, `action`).
- NFR-4: Same OTP/password lock as glossary (5 fails / 15 min) via `auth`.
- NFR-5: English / i18n-ready.
- NFR-6: ADR 0006: Terraform does not write secret values; this app writes SSM at `/namma-medmate/{env}/platform/{name}`.
- NFR-7: Feature flag reads p95 ≤ 50 ms (cache). `gmv_cashfree` cached for POS to remain off.

---

## 6. Data Model / Entities

### `HqUser` (owned)

| Field                  | Type        | Notes                   |
| ---------------------- | ----------- | ----------------------- |
| `hqUserId`             | UUID        | `auth` subject for HQ   |
| `name` `email` `phone` |             | phone for WhatsApp OTP  |
| `role`                 | enum        | five roles              |
| `isL2`                 | bool        | Support only meaningful |
| `active`               | bool        |                         |
| `createdAt`            | timestamptz |                         |

### `HqPermission`

Not a table required if role→permission is code. Optional overlay table out of v1 — matrix is FR-6 constants.

### `PlatformFlag` (owned)

| Field                           | Type    | Notes          |
| ------------------------------- | ------- | -------------- |
| `key`                           | text PK | `gmv_cashfree` |
| `valueJson`                     | jsonb   | bool or number |
| `updatedByHqUserId` `updatedAt` |         |                |

### `PlatformTaxpayer` (owned, singleton)

| Field       | Type  | Notes       |
| ----------- | ----- | ----------- |
| `legalName` | text  |             |
| `gstin`     | text  |             |
| `address`   | text  |             |
| `stateCode` | text  | GSTIN state |
| `sacSaas`   | const | `9983`      |

### Secrets (not in Postgres plaintext)

| SSM name                                        | Purpose              |
| ----------------------------------------------- | -------------------- |
| `waba_token`                                    | Namma WABA           |
| `cashfree_saas_app_id` / `cashfree_saas_secret` | SaaS checkout        |
| `cashfree_gmv_app_id` / `cashfree_gmv_secret`   | unused in v1 product |

### Referenced

`AuditEvent` — `audit` (platform scope: `tenantId` null or `scope=hq`). `WhatsAppMessage` — `whatsapp`.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/settings`. HQ JWT except where noted.

### 7.1 Me & permissions

`GET /admin/me`

```json
{
  "success": true,
  "data": {
    "hqUserId": "uuid",
    "name": "Asha",
    "role": "operations",
    "isL2": false,
    "permissions": [
      "hq.shell",
      "tenants.read",
      "kyc.decide",
      "crm.pipeline",
      "marketing.launch",
      "automation.write",
      "audit.read"
    ]
  }
}
```

### 7.2 Team

`GET /admin/settings/users`

`POST /admin/settings/users`

```json
{ "name": "Dev", "email": "dev@namma.example", "phone": "98XXXXXXXX", "role": "support" }
```

`PATCH /admin/settings/users/{hqUserId}` `{ "role": "finance", "active": true, "isL2": false }`

`POST /admin/settings/users/{hqUserId}/deactivate`

Errors: `409 LAST_SUPER_ADMIN`, `403`.

### 7.3 Flags

`GET /admin/settings/flags`

```json
{
  "success": true,
  "data": {
    "gmv_cashfree": false,
    "whatsapp_conversation_rate_paise": 8000,
    "gmvCopy": {
      "merchant": "namma",
      "tenantTagged": true,
      "settlement": "T+1_or_weekly",
      "takeRate": 0,
      "productShipped": false
    }
  }
}
```

`PUT /admin/settings/flags/{key}` `{ "value": true }` Super admin. `gmv_cashfree` true does **not** enable POS UPI in v1.

Public (internal) read for other services: `GET /internal/flags/gmv_cashfree` → `{ "enabled": false }`.

### 7.4 WABA

`GET /admin/settings/waba` → `{ "displayName": "Namma MedMate", "phoneLast4": "1234", "tokenLast4": "abcd", "connected": true }`  
Never `token`.

`PUT /admin/settings/waba/token` `{ "token": "EAAB..." }` write-only. `200` `{ "tokenLast4": "...." }`

### 7.5 Cashfree

`GET /admin/settings/cashfree` → `{ "saasAppIdLast4": "9012", "gmvEnabled": false, "gmvFieldsDisabled": true }`

`PUT /admin/settings/cashfree/saas` `{ "appId": "...", "secret": "..." }`

`PUT /admin/settings/cashfree/gmv` — `409 FLAG_OFF` while `gmv_cashfree` is false.

### 7.6 Taxpayer

`GET /admin/settings/taxpayer`

`PUT /admin/settings/taxpayer` `{ "legalName", "gstin", "address", "stateCode" }` Super admin.

### 7.7 Audit viewer

`GET /admin/settings/audit?actor=&action=&tenantId=&from=&to=&cursor=`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "auditId": "uuid",
        "at": "2026-08-31T16:00:00Z",
        "actorHqUserId": "uuid",
        "actorLabel": "Asha",
        "action": "kyc.approved",
        "targetType": "tenant",
        "targetId": "uuid",
        "tenantId": "uuid"
      }
    ],
    "nextCursor": null
  }
}
```

`GET /admin/settings/audit.csv` Super admin.

### 7.8 Events

| Event                  | Payload                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `hq.user.invited`      | `{ hqUserId, role }`                                           |
| `hq.user.role_changed` | `{ hqUserId, from, to }`                                       |
| `hq.flag.changed`      | `{ key, value }`                                               |
| `hq.secret.rotated`    | `{ name: "waba_token" \| "cashfree_saas" }` no secret material |
| `hq.taxpayer.updated`  | `{ gstinLast4 }`                                               |

### 7.9 UI

`/admin/settings?tab=team|flags|whatsapp|cashfree|taxpayer|audit`

Cashfree tab: two cards “SaaS checkout (live)” and “Shop-floor GMV (off, not in v1)”.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Role gates KYC

As Super admin, I want Support unable to Approve KYC, so that RBAC matches the HQ split.

- Given a Support JWT, When they POST `/admin/kyc/{id}/approve`, Then `403` missing `kyc.decide`.
- Given Compliance, When they Approve, Then 200 (API in `admin-tenants`).

### US-2 Secrets stay on HQ

As Super admin, I want to rotate WABA and SaaS Cashfree keys, so that chemists never see them.

- Given I paste a WABA token, When I GET waba, Then only last-4 is returned and logs do not contain the token.
- Given a pharmacy Owner opens Settings, When they load pharmacy profile, Then no Cashfree merchant key fields exist.

### US-3 GMV flag off

As Super admin, I want `gmv_cashfree` false, so that v1 POS stays cash/khata.

- Given flag false, When POS loads tenders, Then UPI/Card are absent (`pos-billing`).
- Given I set flag true in v1, When POS still has no GMV implementation, Then tenders remain cash/khata (ignore flag until GMV ships). Finance GMV settlement remains non-operational.
- Given flag false, When I PUT GMV keys, Then `409 FLAG_OFF`.

### US-4 Last Super admin

- Given one active Super admin, When I deactivate them, Then `409 LAST_SUPER_ADMIN`.

### US-5 Audit trail

As Operations, I want to see who suspended a subscription, so that critical admin actions are reconstructable.

- Given Finance suspends tenant T, When I filter audit `action=subscription.suspended` `tenantId=T`, Then a row exists with actor, time, target.
- Given I try to DELETE an audit row, Then no such API exists (404).

### US-6 Invite Support L2

- Given I invite Support with isL2 true, When a ticket escalates to L2, Then that user is an eligible assignee (`admin-support`).

---

## 9. Edge Cases & Error Handling

| Case                                    | Behaviour                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pharmacy JWT `/admin/me`                | `403 HQ_SURFACE_ONLY`.                                                                                                     |
| Duplicate email invite                  | `409`.                                                                                                                     |
| Invalid GSTIN checksum                  | `400 VALIDATION`.                                                                                                          |
| Flag key unknown                        | `404`.                                                                                                                     |
| Concurrent last Super admin role change | Transaction: at least one active Super admin remains.                                                                      |
| Secret put empty string                 | `400`.                                                                                                                     |
| Audit export huge                       | same 10,000 row cap as other HQ CSVs; require filters.                                                                     |
| Support opens Cashfree tab              | read last-4 SaaS only or `403 secrets.write`; no rotate. **Assumption:** Support cannot GET full cashfree settings; `403`. |
| Automation actor in audit               | `actorHqUserId` null, `actorLabel` `automation`.                                                                           |

---

## 10. Open Questions / Assumptions

1. **Permission matrix FR-6** is not itemised in the catalogue; it is the locked v1 mapping so other HQ docs can gate consistently. Super admin = all; Operations = run the SaaS factory (KYC, pipeline, dunning remind, marketing, automation); Finance = money; Support = tickets + module override + CSM; Compliance = KYC + Rx annotate.
2. **JWT does not need to embed permissions**; server loads role each request.
3. **`gmv_cashfree` true in v1 does not ship GMV.** Catalogue: flag off until turned on; “then” Namma account, tenant-tagged, T+1/weekly, no take-rate. POS UPI is still “later (not v1)”. Both are honoured: flag exists, product not built, POS ignores flag.
4. **WABA token and Cashfree SaaS keys** are the two platform secrets named in §9.
5. **Taxpayer profile** is required for `admin-finance` GSTR; catalogue put GST in Finance but GSTIN must live somewhere — this module.
6. **HqUser is not a pharmacy User**; `manage-users` seat caps do not apply.
7. **Invite/auth details** (temp password vs OTP-first) follow `auth` HQ principal; if `auth` only specified pharmacy login, HQ uses the same password and/or WhatsApp OTP methods.
8. **Audit writes** may be performed by each module calling `audit`; this module is the viewer + requires the fields actor, action, target, time.
9. **Conversation rate** flag supports Marketing estimator (catalogue did not give Meta tariff).
10. **No add-on SKUs**, no chemist WABA, no shop-floor keys in chemist UI.
11. Support **masked PII** on Rx queue is enforced in `admin-rx-compliance` using `rx.read` without `rx.annotate`.
12. i18n-ready English ships.
