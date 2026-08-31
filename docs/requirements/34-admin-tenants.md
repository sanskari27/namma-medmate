# Requirement Doc: Command Center & Pharmacies (`admin-tenants`)

**Surface:** Platform Admin HQ (not Pharmacy Partner Console).  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §4 intro, §4.1, §4.2; glossary; decomposition #34.  
**HQ roles (source of truth in `admin-platform-settings`):** Super admin, Operations, Finance, Support, Compliance.

A Namma admin is **not** a pharmacy user. Actions save immediately. English UI, i18n-ready.

---

## 1. Summary

This module is the first Platform Admin HQ surface. It owns the HQ app shell (sidebar, top bar, global search, notification bell, live badges) plus two screens: **Command center** (SaaS tiles, alerts strip, KYC queue with inline Approve/Reject) and **Pharmacies** (tenant list: plan, seats, KYC artefacts, subscription suspend/reactivate, licence expiry, notes, deep-link to CRM Software Account-360). KYC status is conceptually owned with `go-live-kyc`; this module is the HQ UI and the approve/reject API. No chemist console may go live until KYC is approved **and** the Owner wizard is complete or skipped where allowed.

---

## 2. Scope (in / out)

**In scope**

- HQ React app shell: sidebar, top bar, global search, notification bell, live badges (pending KYC count, at-risk SaaS account count).
- Sidebar items owned here: **Command center** · **Pharmacies**. Other HQ modules register their own sidebar routes; this shell renders them and applies RBAC from `admin-platform-settings`.
- Deep-link in the sidebar to Master catalogue (`master-catalogue` / `04`). This module does **not** implement catalogue UI.
- Command center tiles: MRR, active pharmacies, past-due subscriptions, KYC of chemist accounts, licence expiry, GSTN/IRN errors.
- Alerts strip (aggregates KYC pending, licence expiry, GSTN/IRN errors, past-due subscriptions, at-risk accounts).
- KYC queue with inline **Approve** / **Reject** (writes KYC status; reject requires a reason).
- Pharmacies tenant list and tenant drawer: plan, seats, KYC (GSTIN, drug licence, FSSAI, PAN, pharmacist), licence expiry, notes, subscription **Suspend** / **Reactivate**, deep-link to CRM Software Account-360.
- Go-live gate visibility: HQ shows whether the pharmacy may post bills (KYC approved AND wizard complete/skipped). Enforcement of the gate on POS remains `go-live-kyc` / `pos-billing`.
- HQ global search of pharmacies (name, GSTIN, phone, tenant id).
- HQ notification feed for command-center class alerts.
- Audit of KYC decisions, subscription suspend/reactivate, and tenant note edits via `audit`.

**Out of scope**

- Master catalogue HQ UI (ban, DPCO ceiling, add medicine) — `master-catalogue`.
- SaaS CRM tabs, Account-360 body, plans, discounts, dunning, referrals, revenue analytics — `admin-saas-crm`.
- Chemist-facing KYC upload and go-live wizard — `go-live-kyc`.
- Chemist-facing SaaS checkout and Cashfree — `saas-billing`.
- Pharmacy H1/X legal register — `statutory-registers`. HQ Rx audit — `admin-rx-compliance`.
- HQ RBAC definition, feature flags, WABA token, Cashfree keys — `admin-platform-settings`.
- Shop-floor GMV settlement — not in v1; flag lives in `admin-platform-settings` and stays off.
- Attachable add-on SKUs — never in v1.
- Branches product, hospital/IPD, wholesale — never in v1.
- Namma admin impersonating a pharmacy login.

---

## 3. Dependencies

| Module | What this module needs |
|---|---|
| `tenancy` | Pharmacy / Location identity (`tenantId`, `locationId`, display name, phone). Create/read tenant records. |
| `go-live-kyc` | KYC submission payload (GSTIN, drug licence, FSSAI, PAN, registered pharmacist, document refs, status `pending` / `approved` / `rejected`). Wizard stage completion / skip flags. This module **writes** status via its own approve/reject API against that record. |
| `saas-billing` | `SaasSubscription`: plan, seats used/limit, status (`active` / `past_due` / `suspended` / `expired` / `free`), MRR contribution, past-due invoice flag. Suspend/reactivate APIs (this module calls them; `saas-billing` owns the subscription row). |
| `plan-gating` | Plan enum (`free` / `starter` / `growth` / `pro`) and seat limits (2 / 2 / 5 / unlimited). Read-only. |
| `admin-saas-crm` | At-risk account count and Account-360 deep-link target. MRR/ARR figures if CRM is the metric owner; otherwise this module reads MRR from `saas-billing` invoices (see §10). |
| `statutory-registers` / `account-settings` | Licence expiry dates (drug licence, FSSAI, pharmacist registration). Read-only. |
| `books-gst` | GSTN/IRN error flags per tenant (IRP down, IRN reject, 2B stale). Read-only. |
| `auth` | HQ session JWT. HQ users are platform-scoped, not tenant-scoped. |
| `admin-platform-settings` | `HqRole` and permission checks. Sidebar visibility. |
| `audit` | Append-only `AuditEvent` for KYC decide, suspend/reactivate, notes. HQ/platform scope (no pharmacy tenant impersonation). |
| `whatsapp` | Not called directly for KYC; reject does not auto-WhatsApp unless `go-live-kyc` already does (this module does not send). |
| `master-catalogue` | Sidebar deep-link only. |

**External:** none beyond AWS Lambda + Postgres via `libs/db-services`. Cashfree is not used here.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### HQ shell

- FR-1: The system shall render Platform Admin HQ as a distinct React app surface from the Pharmacy Partner Console, with no pharmacy POS chrome.
- FR-2: The system shall show the HQ sidebar in this order, hiding items the caller’s `HqRole` cannot access (RBAC owned by `admin-platform-settings`): Command center · Pharmacies · CRM Software · Master catalogue · Rx & compliance · Finance · Marketing · Analytics · Support · Automation & rules · Settings & RBAC.
- FR-3: The system shall highlight **Command center** and **Pharmacies** as routes owned by this module (`/admin/command-center`, `/admin/pharmacies`).
- FR-4: The system shall deep-link **Master catalogue** to the `master-catalogue` HQ UI without re-implementing it.
- FR-5: The system shall show a live badge on **Pharmacies** (or the KYC queue affordance) equal to the count of chemist KYC submissions in status `pending`.
- FR-6: The system shall show a live badge on **CRM Software** equal to the count of at-risk SaaS accounts as defined by `admin-saas-crm` (health score < 40 or CRM at-risk flag). If CRM is unavailable, the badge is 0 and not an error.
- FR-7: The system shall provide global search in the HQ top bar that queries pharmacies by display name, GSTIN, owner phone, or `tenantId` and navigates to the tenant row / drawer.
- FR-8: The system shall provide a notification bell listing unread HQ alerts (KYC pending, licence expiry ≤ 7 days, GSTN/IRN errors, past-due subscriptions, at-risk accounts) and mark them read on open.
- FR-9: The system shall persist every HQ mutation in this module immediately on the controlling action (no separate Save on Approve, Reject, Suspend, Reactivate, or notes).
- FR-10: The system shall refuse all APIs in this module unless the caller presents a valid HQ JWT (not a pharmacy staff JWT).

### Command center

- FR-11: The system shall show a tile **MRR** equal to monthly-normalised recurring SaaS revenue of pharmacies on a paid plan that is not suspended (annual contracts counted as invoice remaining / 12; Free contributes ₹0).
- FR-12: The system shall show a tile **Active pharmacies** equal to the count of tenants whose subscription status is `active` (paid, not past-due, not suspended) **or** `free` with KYC approved (a live Free shop counts as an active pharmacy).
- FR-13: The system shall show a tile **Past-due subscriptions** equal to the count of tenants with at least one SaaS invoice past due and subscription not yet `suspended`.
- FR-14: The system shall show a tile **KYC** equal to pending + approved + rejected counts (pending emphasised) of chemist KYC submissions.
- FR-15: The system shall show a tile **Licence expiry** equal to the count of tenants with drug licence, FSSAI, or pharmacist registration expiring within 60 days or already expired.
- FR-16: The system shall show a tile **GSTN/IRN errors** equal to the count of tenants with an unacknowledged GSTN pull failure, IRN reject, or IRP-down banner.
- FR-17: The system shall show an alerts strip beneath the tiles listing the same five classes as FR-8, newest first, each row deep-linking to the tenant or KYC queue item.
- FR-18: The system shall show a KYC queue of submissions in status `pending`, newest first, with chemist shop name, GSTIN, submitted-at, and inline **Approve** and **Reject**.
- FR-19: The system shall, on **Approve**, set KYC status to `approved`, record actor and timestamp, emit `admin.kyc.approved`, and append an `AuditEvent`. The pharmacy still cannot post bills until the wizard is complete or skipped where allowed (`go-live-kyc`).
- FR-20: The system shall, on **Reject**, require a non-empty reason, set KYC status to `rejected`, record actor, timestamp, and reason, emit `admin.kyc.rejected`, and append an `AuditEvent`. Reject blocks go-live even if the wizard is filled.
- FR-21: The system shall not allow Approve or Reject on a submission that is not `pending` (idempotent no-op returning `KYC_ALREADY_DECIDED`).
- FR-22: The system shall allow Super admin, Operations, and Compliance to Approve/Reject; Finance and Support shall see the queue read-only.

### Pharmacies (tenants)

- FR-23: The system shall list every pharmacy tenant with columns: shop name, plan, seats used/limit, KYC status, KYC artefacts present (GSTIN, drug licence, FSSAI, PAN, pharmacist), licence next-expiry date, subscription status, go-live ready flag, last note snippet.
- FR-24: The system shall filter the list by plan, KYC status, subscription status, licence-expiring (60/30/7/expired), and free-text search (same fields as FR-7).
- FR-25: The system shall open a tenant drawer (or page) showing full KYC artefacts, licence dates, wizard stage checklist (read-only from `go-live-kyc`), subscription status, seats, and a notes field.
- FR-26: The system shall persist tenant notes immediately on blur/commit; notes are HQ-only and never shown in the pharmacy console.
- FR-27: The system shall provide **Suspend subscription** which calls `saas-billing` to set the subscription `suspended`, immediately revoking paid modules (expired-paid behaviour: Free modules remain; data retained). This does not delete the tenant.
- FR-28: The system shall provide **Reactivate subscription** which restores the last paid plan if it has not expired, or Free if the paid period has ended, via `saas-billing`.
- FR-29: The system shall restrict Suspend/Reactivate to Super admin, Operations, and Finance.
- FR-30: The system shall deep-link **Open in CRM Software** to the Account-360 drawer owned by `admin-saas-crm` for that `tenantId`.
- FR-31: The system shall show go-live ready = true only when KYC status is `approved` **and** wizard status is `complete` or `skipped_where_allowed`.
- FR-32: The system shall not provide a HQ control that posts a pharmacy bill, impersonates staff, or bypasses the go-live gate.
- FR-33: The system shall paginate the tenant list (default 50, max 100) with a stable sort (name ascending unless the user picks another column).

---

## 5. Non-Functional Requirements

- NFR-1: Command center tile query p95 ≤ 500 ms for up to 10,000 tenants (pre-aggregate in `libs/db-services`, not N+1 per tenant).
- NFR-2: Tenant list p95 ≤ 500 ms per page.
- NFR-3: Approve/Reject p95 ≤ 300 ms; the KYC row updates without a full page reload.
- NFR-4: All mutations emit an `AuditEvent` (actor HQ user id, action, target tenant id, timestamp, before/after status).
- NFR-5: Pharmacy staff JWTs receive `403 HQ_SURFACE_ONLY`. HQ JWTs cannot call pharmacy tenant-scoped POS APIs through this module.
- NFR-6: English ships; all labels and notification copy are i18n-ready keys.
- NFR-7: PII (GSTIN, PAN, pharmacist name, licence numbers) is visible only to HQ roles permitted to open the tenant drawer; list view may show masked PAN (`XXXXX1234A` style) for Support.
- NFR-8: Idempotent Approve/Reject: double-click does not create two audit rows with conflicting status.
- NFR-9: Live badges refresh at least every 30 s or on websocket/event, without blocking navigation.

---

## 6. Data Model / Entities

This module owns HQ-shell and tenant-note records. It does **not** own Pharmacy, KYC, or SaasSubscription rows.

### `HqTenantNote` (owned)

| Field | Type | Notes |
|---|---|---|
| `noteId` | UUID PK | |
| `tenantId` | UUID FK → `tenancy.Pharmacy` | |
| `body` | text | HQ-only |
| `updatedByHqUserId` | UUID | |
| `updatedAt` | timestamptz | |

One current note per tenant in v1 (overwrite). History is the `audit` log.

### `HqNotification` (owned)

| Field | Type | Notes |
|---|---|---|
| `notificationId` | UUID PK | |
| `hqUserId` | UUID nullable | null = broadcast to all HQ roles that can see the class |
| `class` | enum | `kyc_pending` · `licence_expiry` · `gstn_irn_error` · `past_due` · `at_risk` |
| `tenantId` | UUID | |
| `title` | text | |
| `body` | text | |
| `readAt` | timestamptz nullable | |
| `createdAt` | timestamptz | |

### Referenced (not redefined)

- `Pharmacy` / `Location` — `tenancy`
- KYC submission + wizard stages — `go-live-kyc`
- `SaasSubscription` — `saas-billing`
- `HqUser`, `HqRole` — `admin-platform-settings`
- `AuditEvent` — `audit`

### Command-center projection (read model)

Materialised or queried view `HqCommandCenterStats`:

```
{
  mrrPaise: number,
  activePharmacies: number,
  pastDueSubscriptions: number,
  kycPending: number,
  kycApproved: number,
  kycRejected: number,
  licenceExpiring60d: number,
  gstnIrnErrorTenants: number,
  atRiskAccounts: number
}
```

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base path: `/admin`. Auth: `Authorization: Bearer <hq_jwt>`.

Shared envelope:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "STRING", "message": "STRING", "details": {} } }
```

Money is integer **paise**. Timestamps are ISO-8601 UTC.

### 7.1 Command center

`GET /admin/command-center`

Response `200`:

```json
{
  "success": true,
  "data": {
    "tiles": {
      "mrrPaise": 149900,
      "activePharmacies": 42,
      "pastDueSubscriptions": 3,
      "kyc": { "pending": 4, "approved": 30, "rejected": 2 },
      "licenceExpiring60d": 5,
      "gstnIrnErrors": 1
    },
    "badges": {
      "kycPending": 4,
      "atRiskAccounts": 2
    },
    "alerts": [
      {
        "alertId": "uuid",
        "class": "kyc_pending",
        "tenantId": "uuid",
        "shopName": "Sri Krishna Medicals",
        "message": "KYC pending since 2026-08-28T10:00:00Z",
        "createdAt": "2026-08-28T10:00:00Z",
        "href": "/admin/pharmacies?kyc=pending"
      }
    ]
  }
}
```

### 7.2 KYC queue

`GET /admin/kyc?status=pending&cursor=&limit=50`

Response `200`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "kycId": "uuid",
        "tenantId": "uuid",
        "shopName": "Sri Krishna Medicals",
        "submittedAt": "2026-08-28T10:00:00Z",
        "status": "pending",
        "artefacts": {
          "gstin": "29ABCDE1234F1Z5",
          "drugLicence": "KA-20-123456",
          "fssai": "11223344556677",
          "pan": "ABCDE1234F",
          "pharmacistName": "R. Sharma",
          "pharmacistRegNo": "KA-P-9988"
        },
        "wizard": {
          "status": "incomplete",
          "stages": [
            { "key": "profile", "state": "complete" },
            { "key": "opening_stock", "state": "skipped" },
            { "key": "opening_books", "state": "incomplete" },
            { "key": "invoice_print", "state": "incomplete" },
            { "key": "first_user", "state": "incomplete" }
          ]
        }
      }
    ],
    "nextCursor": null,
    "total": 4
  }
}
```

`POST /admin/kyc/{tenantId}/approve`

Body: `{}`

Response `200`:

```json
{
  "success": true,
  "data": {
    "tenantId": "uuid",
    "status": "approved",
    "decidedByHqUserId": "uuid",
    "decidedAt": "2026-08-31T16:00:00Z",
    "goLiveReady": false
  }
}
```

Errors: `404 NOT_FOUND`, `403 FORBIDDEN`, `409 KYC_ALREADY_DECIDED`.

`POST /admin/kyc/{tenantId}/reject`

Body:

```json
{ "reason": "Drug licence image unreadable" }
```

`reason` minLength 3. Response same shape with `status: "rejected"`, `reason` echoed, `goLiveReady: false`.

Errors: `400 VALIDATION` (missing reason), `409 KYC_ALREADY_DECIDED`.

### 7.3 Pharmacies

`GET /admin/pharmacies?plan=&kycStatus=&subscriptionStatus=&licence=expiring60d&q=&cursor=&limit=50&sort=name:asc`

Response `200`:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "tenantId": "uuid",
        "locationId": "uuid",
        "shopName": "Sri Krishna Medicals",
        "plan": "growth",
        "seatsUsed": 3,
        "seatsLimit": 5,
        "kycStatus": "approved",
        "kycArtefacts": {
          "gstin": true,
          "drugLicence": true,
          "fssai": true,
          "pan": true,
          "pharmacist": true
        },
        "licenceNextExpiry": "2026-11-01",
        "subscriptionStatus": "active",
        "goLiveReady": true,
        "noteSnippet": "Called owner 12 Aug",
        "crmHref": "/admin/crm/subscribers/uuid"
      }
    ],
    "nextCursor": null,
    "total": 42
  }
}
```

`GET /admin/pharmacies/{tenantId}`

Response `200` includes full artefacts (unmasked for Super admin / Operations / Compliance / Finance; PAN masked for Support), wizard stages, licences with issue/expiry, notes body, subscription status, `crmHref`.

`PUT /admin/pharmacies/{tenantId}/notes`

Body: `{ "body": "Called owner 12 Aug — will upload FSSAI tomorrow" }`

Saves immediately. `200` returns `{ "body", "updatedAt", "updatedByHqUserId" }`.

`POST /admin/pharmacies/{tenantId}/subscription/suspend`

Body: `{ "reason": "Past due after dunning" }` (reason required).

`200`: `{ "subscriptionStatus": "suspended" }`. Errors: `409 ALREADY_SUSPENDED`.

`POST /admin/pharmacies/{tenantId}/subscription/reactivate`

Body: `{}`

`200`: `{ "subscriptionStatus": "active" | "free" }`. Errors: `409 NOT_SUSPENDED`.

### 7.4 Global search & notifications

`GET /admin/search?q=krishna&limit=10`

```json
{
  "success": true,
  "data": {
    "pharmacies": [
      { "tenantId": "uuid", "shopName": "Sri Krishna Medicals", "gstin": "29ABCDE1234F1Z5", "href": "/admin/pharmacies/uuid" }
    ]
  }
}
```

`GET /admin/notifications?unreadOnly=true`

`POST /admin/notifications/{notificationId}/read`

`POST /admin/notifications/read-all`

### 7.5 Events emitted

| Event | Payload |
|---|---|
| `admin.kyc.approved` | `{ tenantId, kycId, actorHqUserId, at }` |
| `admin.kyc.rejected` | `{ tenantId, kycId, actorHqUserId, reason, at }` |
| `admin.subscription.suspended` | `{ tenantId, actorHqUserId, reason, at }` |
| `admin.subscription.reactivated` | `{ tenantId, actorHqUserId, resultingStatus, at }` |
| `admin.tenant.note_updated` | `{ tenantId, actorHqUserId, at }` |

Consumers: `go-live-kyc` (status), `saas-billing` (suspend/reactivate already applied before emit), `admin-saas-crm` (timeline), `audit`.

### 7.6 UI routes (React Admin HQ)

| Route | Screen |
|---|---|
| `/admin/command-center` | Tiles, alerts strip, KYC queue |
| `/admin/pharmacies` | Tenant table |
| `/admin/pharmacies/:tenantId` | Tenant drawer/page |

Shell: top bar search + bell; sidebar as FR-2.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 KYC approve

As a Compliance admin, I want to approve chemist KYC from the command center, so that a shop can proceed to go-live once the wizard is done.

- Given a pending KYC for tenant T, When I click Approve, Then status is `approved`, the row leaves the pending queue, an audit event exists, and `goLiveReady` is false if the wizard is incomplete.
- Given KYC approved and wizard complete/skipped, When I open tenant T, Then `goLiveReady` is true.
- Given I am Support, When I view the KYC queue, Then Approve/Reject are disabled.

### US-2 KYC reject

As an Operations admin, I want to reject KYC with a reason, so that the owner cannot go live on incomplete documents.

- Given pending KYC, When I click Reject without a reason, Then the API returns `400 VALIDATION` and status stays `pending`.
- Given pending KYC, When I Reject with reason “PAN mismatch”, Then status is `rejected`, go-live remains blocked even if the wizard is filled, and the reason is stored.
- Given already rejected KYC, When I Approve, Then `409 KYC_ALREADY_DECIDED`.

### US-3 Suspend subscription

As a Finance admin, I want to suspend a past-due subscription, so that paid modules lock while Free billing remains.

- Given tenant on Growth `active`, When I Suspend with a reason, Then subscription status is `suspended`, Growth modules lock, POS/inventory remain (Free), data is retained, tenant row still lists.
- Given already suspended, When I Suspend again, Then `409 ALREADY_SUSPENDED`.
- Given I am Support, When I call suspend, Then `403 FORBIDDEN`.

### US-4 Find a pharmacy

As a Super admin, I want global search and the pharmacies list, so that I can open notes and CRM 360.

- Given shop “Sri Krishna Medicals”, When I type “krishna” in HQ search, Then the shop appears and navigates to the tenant.
- Given the tenant drawer, When I edit notes and blur, Then notes persist without a Save button.
- Given the drawer, When I click Open in CRM Software, Then HQ navigates to `admin-saas-crm` Account-360 for that tenant.

### US-5 Live badges

As any HQ role, I want pending KYC and at-risk badges, so that I see work without opening each module.

- Given 4 pending KYC, When I load HQ, Then the Pharmacies (or KYC) badge shows 4.
- Given `admin-saas-crm` reports 2 at-risk, When I load HQ, Then CRM Software badge shows 2.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Zero tenants | Tiles show 0; empty table with “No pharmacies yet”; KYC queue empty state. |
| KYC double-submit from two HQ users | First writer wins; second gets `409 KYC_ALREADY_DECIDED`. |
| Approve then wizard still incomplete | `goLiveReady` false; POS still blocked by `go-live-kyc`. |
| Suspend Free tenant with no paid history | Allowed; status `suspended` still revokes nothing extra; Reactivate returns `free`. |
| `saas-billing` suspend fails | Return `502 UPSTREAM`; do not mark local UI success; no audit success row. |
| Missing licence dates | Licence tile excludes that tenant; drawer shows “Not provided”. |
| GSTN/IRN errors feed down | Tile 0; not an HQ error. |
| Pharmacy JWT on `/admin/*` | `403 HQ_SURFACE_ONLY`. |
| Search query < 2 chars | Return empty list, not a scan of all tenants. |
| Note body > 8,000 chars | `400 VALIDATION`. |
| Concurrent note edits | Last write wins; both audited. |

---

## 10. Open Questions / Assumptions

1. **HQ app shell lives here.** There is no separate `admin-shell` module in the decomposition. Sibling HQ modules register routes; this module renders chrome.
2. **MRR on the command center** is the same definition as `admin-saas-crm` / `saas-billing`: sum of monthly-normalised paid subscriptions that are not suspended. Free = 0. Past-due still counts in MRR until suspended (SaaS convention); logged so CRM and this tile cannot diverge — both read `saas-billing` aggregates.
3. **Active pharmacies** includes live Free shops (KYC approved). “Active subscribers” in CRM is paid-only; the names differ on purpose.
4. **KYC re-submit after reject** is owned by `go-live-kyc` (owner uploads again → status back to `pending`). HQ then sees it in the queue. This module does not invent a “re-open KYC” button.
5. **PAN masking for Support** is a privacy assumption; Super admin / Operations / Finance / Compliance see full PAN.
6. **One note per tenant** in v1; audit holds history.
7. **Global search in v1** is pharmacies only (not tickets, invoices, or SKUs). Tickets stay in `admin-support`.
8. **Master catalogue** is a sidebar deep-link only; no catalogue fields are specified here.
9. **No HQ impersonation** of pharmacy users.
10. Shop-floor GMV settlement is not shown on these tiles in v1.
