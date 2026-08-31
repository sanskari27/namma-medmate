# Requirement Doc: CA / Accountant sharing (`ca-sharing`)

**Slug:** `ca-sharing`  
**Module path:** `modules/ca-sharing/{ui,api,docs}`  
**Plan gate:** **Growth** (`₹1,499 + 18% GST`).  
**Surface:** Pharmacy Partner Console (Owner share management) + **CA share link** (no-login, report-scoped). Not a console login.  
**Stack:** React + TypeScript AWS Lambdas. Persistence only through `libs/db-services`. Console UI talks via `@namma-medmate/api-client`. CA public UI talks only to public CA APIs.  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.18, §1.1 (CA persona), §1.2 (capability URL), §9 (no secrets / no Rx in pack), §10 (CA link leaked). Glossary: `docs/requirements/00-glossary.md`.  
**Canonical entity owned here:** `CaShareLink` (`token`). Advisors are owned here.

---

## 1. Summary

`ca-sharing` lets the Owner share a **time-bounded, report-scoped capability URL** with a CA. The CA does not get a Pharmacy Partner Console login. The Owner picks a period, an advisor, and which reports to include (GST, Sales, P&L, stock, trial balance, and any other Growth report slug). The CA sees **selected reports only**. The downloadable **CA pack** is GSTR-1 JSON + GSTR-3B JSON + **Excel** of selected reports. **Not Tally XML** in v1. Chemist prepares; **CA files on GSTN** outside Namma. The pack contains **no GSTN/IRP secrets** and **no Rx images**. Default link expiry is **30 days**. Owner can **revoke** immediately (including if the link is leaked). A snapshot (GSTIN, net revenue, output GST, input credit, net GST) is stored on each share for history.

---

## 2. Scope (in / out)

### In scope (v1)

- Advisor directory: firm, email, phone (add / edit / deactivate).
- Create share: period, advisor, selected report slugs, include GSTR-1 JSON, include GSTR-3B JSON.
- Capability URL (unguessable token) — no password, no OTP, no console session.
- CA public page: snapshot + selected reports (tables) + pack download.
- CA pack files: `gstr1.json`, `gstr3b.json` (when selected), `reports.xlsx` (selected reports as sheets). Optional zip wrapping those files.
- Sharing history (who, when, period, reports, expiry, revoked, snapshot figures).
- Revoke; default TTL 30 days; expired token fails closed.
- Leak response: Owner revokes; expiry still applies.
- Audit of create / revoke / CA pack download (no secrets in log).

### Out of scope (v1)

- Tally XML.
- CA login, CA user accounts, CA MFA.
- CA filing on GSTN from Namma (no submit).
- Whole-console access, POS, Rx queue, customers 360, GSTN credential screens.
- Rx images in pack or CA UI.
- GSTN/IRP credentials in pack, URL, snapshot, or Excel hidden sheets.
- Shop-floor UPI settlement files.
- Changing report numbers on the CA side (read-only).
- Extending expiry beyond a new share (v1: revoke + create a new link). Owner may set `expires_in_days` 1–90 at create; default 30.
- Emailing the link automatically (Owner copies/shares; optional `mailto:` / WhatsApp **pre-filled** to advisor phone — not auto-send unless Owner taps; transactional WhatsApp to CA is **not** required in v1 because CA may not be on the WABA opt-in; v1: **copy link** primary).

---

## 3. Dependencies

| Module                  | Why                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenancy`               | Tenant + `location_id`.                                                                                                                                                                                                                                                                      |
| `plan-gating`           | Growth for create/manage. Public CA GET does not check plan at read time if the link was created while Growth was active; if plan later expires, **existing unexpired links remain readable until expiry/revoke** (data retention; CA filing mid-month). New shares blocked on expired plan. |
| `auth` / `manage-users` | **Owner** creates/revokes/manages advisors. Manager: only if granted “CA sharing”; default off (reports ≠ share).                                                                                                                                                                            |
| `books-gst`             | `prepareGstr1`, `prepareGstr3b` for pack JSON; snapshot GST figures from journals; never secrets accessor.                                                                                                                                                                                   |
| `reports`               | `POST /internal/v1/reports/run` and Excel builder for selected slugs.                                                                                                                                                                                                                        |
| `account-settings`      | GSTIN **display** for snapshot (public tax id, not credentials). Logo optional on CA PDF/Excel header.                                                                                                                                                                                       |
| `audit`                 | Share create, revoke, CA download.                                                                                                                                                                                                                                                           |
| `whatsapp`              | Not required for CA. Owner may use copy. Do not put token in WhatsApp templates by default (leak surface); if Owner uses pre-fill, that is an explicit tap.                                                                                                                                  |

**Must not depend on:** GSTN secrets accessor, `prescriptions` (Rx), `pos-billing` charge, IRP.

**Events emitted:** `CaShareCreated`, `CaShareRevoked`, `CaPackDownloaded`.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### 4.1 Plan and roles

**FR-1:** The system shall require Growth or Pro to **create** advisors, **create** shares, and **revoke**. `403 PLAN_REQUIRED` otherwise.

**FR-2:** The system shall allow **Owner** all CA-sharing actions. Manager only with explicit permission. Pharmacist/Cashier shall not.

**FR-3:** The system shall keep an already-issued, unexpired, unrevoked link **resolvable** after plan expiry so the CA can still file what was prepared; the public page shall not offer console chrome. Creating a new share while expired is blocked.

### 4.2 Advisors

**FR-4:** The system shall let Owner CRUD advisors: `firm` (required), `email` (required, valid email), `phone` (required, E.164 or 10-digit IN), optional `contact_name`. Unique email per location.

**FR-5:** The system shall support deactivate (`active: false`) without deleting history of shares that used that advisor.

**FR-6:** The system shall refuse delete of an advisor with existing shares (`409 ADVISOR_HAS_SHARES`); deactivate instead.

### 4.3 Create share

**FR-7:** The system shall require: `advisor_id`, period (`period_kind` + companions, same as reports), `report_slugs` (min 1, each a valid `reports` slug, stubs allowed), `include_gstr1_json` boolean, `include_gstr3b_json` boolean. At least one of: a report slug, or GSTR-1 JSON, or GSTR-3B JSON.

**FR-8:** The system shall default `expires_in_days` to **30**. Owner may set 1–90. `expires_at = created_at + days` (UTC stored, display IST).

**FR-9:** The system shall generate a cryptographically random token (≥ 128 bits entropy, URL-safe). Store only `token_hash` (SHA-256). Return the **raw token once** in the create response and as a full capability URL. The token shall never be logged, audited in plaintext, or placed in GSTR JSON.

**FR-10:** The system shall snapshot at create time: `gstin` (from profile), `net_revenue` (books sales net for the period), `output_gst` (sum GST output journals), `input_credit` (sum GST input journals, or claimed ITC if 3B prepare used — v1 snapshot: **posted GST input**), `net_gst` = output − input. Snapshot is immutable on the share even if later books change (history). CA **live** report tables re-run on open unless `freeze_reports: true`. **v1: freeze at create** — pack files and CA tables are generated **at create** (or first successful generate) and stored, so the CA sees a stable pack for filing. Re-generate only if Owner creates a new share.

**FR-11:** The system shall, at create (async acceptable with `pack_status: pending | ready | failed`):

1. Call `prepareGstr1` / `prepareGstr3b` when those flags are true; persist JSON **as returned** (already secret-free).
2. Call reports internal run for each slug; build one `.xlsx` with one sheet per slug (sheet name = truncated report name). Stub sheets are empty + stub message in A1.
3. Scan pack bytes: refuse to persist if credential-like keys (`password`, `irp`, `gstn_username`, `app_key`, `sek`) appear as JSON keys in GSTR files (`500 PACK_SECRET_GUARD`).
4. Scan for Rx image bytes / `image/` content: none allowed (`500 PACK_RX_GUARD`).

**FR-12:** The system shall not include Tally XML in the pack or UI.

**FR-13:** The system shall not include GSTN/IRP secrets, WABA tokens, Cashfree keys, or Rx images in the pack, snapshot, or CA HTML.

**FR-14:** The system shall list created shares in **Sharing history**: created_at, advisor firm, period label, report names, expires_at, revoked_at, snapshot figures, pack_status, create actor.

### 4.4 Capability URL and CA view

**FR-15:** The system shall serve CA traffic on a public route, e.g. `https://{app-host}/ca/{token}` (or `share.nammamedmate.com/ca/{token}`). Hitting it shall **not** create a staff session, shall **not** show sidebar, Account, POS, or Settings.

**FR-16:** The system shall, when token hashes to an unrevoked, unexpired share: show shop display name, GSTIN, period, snapshot cards (GSTIN, net revenue, output GST, input credit, net GST), the **selected** report tables only, and **Download pack**.

**FR-17:** The system shall hide reports not in `report_slugs`. Analytics slugs may be included if selected; they still cannot open other console pages.

**FR-18:** The system shall return `404 SHARE_NOT_FOUND` for unknown tokens (same body as revoked/expired — do not distinguish, to avoid token oracle). HTTP 404.

**FR-19:** The system shall treat revoked and expired as not found (`404`). Owner console still shows them in history as revoked/expired.

**FR-20:** The system shall rate-limit public token lookups (e.g. 60/min per IP) to slow brute force.

**FR-21:** The system shall not require the CA to log in, register, or complete OTP.

### 4.5 Pack download

**FR-22:** The system shall download a zip `namma-ca-pack-{period}-{date}.zip` containing:

- `gstr1.json` if included
- `gstr3b.json` if included
- `reports.xlsx` if any report slugs
- `README.txt` stating: chemist prepared; CA files on GSTN; not a Tally file; no credentials included

**FR-23:** The system shall log `CaPackDownloaded` with share id, timestamp, IP hash (not raw token). AuditEvent without token plaintext.

**FR-24:** The system shall allow Owner to download the same pack from console history without the public token (authenticated).

### 4.6 Revoke and leak

**FR-25:** The system shall let Owner **revoke** a share immediately. Subsequent public GET/download 404. Irreversible for that token; Owner creates a new share if needed.

**FR-26:** The system shall document and implement §10: if a CA link is leaked, Owner revokes; links expire default 30 days. UI copy on history: “Anyone with this link can see the selected reports. Revoke if leaked.”

**FR-27:** The system shall not provide a token reminder API that returns plaintext token after create (Owner must copy at create; if lost, revoke and create new).

### 4.7 Chemist prepares; CA files

**FR-28:** The system shall not offer “File on GSTN” or GSTN login on the CA page. Copy: “Download the JSON and file on the GST portal.”

**FR-29:** The system shall use books prepare JSON as-is. This module shall not call GSTN.

### 4.8 Security of the URL

**FR-30:** The system shall treat the URL as a **capability**: possession is authorisation for the selected reports and pack only.

**FR-31:** The system shall bind the share to `tenant_id` + `location_id`. The CA cannot switch shops.

**FR-32:** The system shall not put `location_id` or staff user ids in the public URL (token only).

---

## 5. Non-Functional Requirements

**NFR-1:** Token: 32+ bytes random, base64url, hashed at rest (SHA-256). Timing-safe compare.

**NFR-2:** Public CA p99 < 2s for frozen pack metadata + tables from stored JSON/xlsx preview rows (store `preview_json` for tables at freeze).

**NFR-3:** Pack generate p99 < 30s for a typical month; `pack_status` polling.

**NFR-4:** HTTPS only. `Cache-Control: no-store` on CA responses.

**NFR-5:** English CA page; i18n-ready.

**NFR-6:** No secrets in logs. Token plaintext only in create response body.

**NFR-7:** Module `modules/ca-sharing/{ui,api,docs}`. Public lambda separate from authenticated console APIs recommended.

**NFR-8:** DPDP: pack is shop tax/business data. No patient Rx. Customer names may appear on party/sales reports if those slugs were selected — Owner’s choice. Do not include Customers export dump unless that slug exists (it does not). Party statement may include customer names.

---

## 6. Data Model / Entities

### 6.1 `CaAdvisor`

| Field                      | Type        | Notes               |
| -------------------------- | ----------- | ------------------- |
| `advisor_id`               | uuid        | PK                  |
| `tenant_id`, `location_id` | uuid        |                     |
| `firm`                     | string      |                     |
| `contact_name`             | string?     |                     |
| `email`                    | string      | unique per location |
| `phone`                    | string      |                     |
| `active`                   | boolean     | default true        |
| `created_at`, `updated_at` | timestamptz |                     |

### 6.2 `CaShareLink`

| Field                      | Type         | Notes                            |
| -------------------------- | ------------ | -------------------------------- |
| `share_id`                 | uuid         | PK                               |
| `tenant_id`, `location_id` | uuid         |                                  |
| `advisor_id`               | uuid         |                                  |
| `token_hash`               | bytes        | unique                           |
| `period_kind`              | enum         | same as reports                  |
| `period_params`            | jsonb        | month/fy/from/to…                |
| `period_label`             | string       | display                          |
| `report_slugs`             | text[]       |                                  |
| `include_gstr1_json`       | boolean      |                                  |
| `include_gstr3b_json`      | boolean      |                                  |
| `expires_at`               | timestamptz  | default now+30d                  |
| `revoked_at`               | timestamptz? |                                  |
| `revoked_by`               | uuid?        |                                  |
| `created_by`               | uuid         | Owner                            |
| `pack_status`              | enum         | `pending` \| `ready` \| `failed` |
| `pack_error`               | string?      | no secrets                       |
| `pack_object_key`          | string?      | encrypted bucket object          |
| `preview_json`             | jsonb        | frozen tables                    |
| `snapshot_gstin`           | string       |                                  |
| `snapshot_net_revenue`     | money        |                                  |
| `snapshot_output_gst`      | money        |                                  |
| `snapshot_input_credit`    | money        |                                  |
| `snapshot_net_gst`         | money        |                                  |
| `created_at`               | timestamptz  |                                  |

**Never stored:** token plaintext, GSTN password, IRP keys, Rx.

### 6.3 `CaShareAccess`

`access_id`, `share_id`, `at`, `ip_hash`, `user_agent_hash`, `kind` (`view` | `download`). Append-only, for Owner history “last opened”.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

### 7.1 Authenticated console — `/api/v1/ca`

Bearer + `X-Location-Id`.

#### Advisors

`GET /api/v1/ca/advisors` → `{ "items": [{ "advisor_id", "firm", "contact_name", "email", "phone", "active" }] }`

`POST /api/v1/ca/advisors`

```json
{
  "firm": "Mehta & Co.",
  "contact_name": "R. Mehta",
  "email": "ca@mehta.example",
  "phone": "9876543210"
}
```

`201`: advisor object. `409 ADVISOR_EMAIL_TAKEN`. `422 VALIDATION`.

`PATCH /api/v1/ca/advisors/{advisorId}` — any subset of fields + `active`.

`DELETE /api/v1/ca/advisors/{advisorId}` — `409 ADVISOR_HAS_SHARES` if shares exist; else 204.

#### Shares

`GET /api/v1/ca/shares` — history, newest first.

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "share_id": "uuid",
        "advisor": { "advisor_id": "uuid", "firm": "Mehta & Co." },
        "period_label": "August 2026",
        "report_slugs": ["trial-balance", "profit-and-loss", "gstr-1"],
        "include_gstr1_json": true,
        "include_gstr3b_json": true,
        "expires_at": "2026-09-30T18:30:00.000Z",
        "revoked_at": null,
        "pack_status": "ready",
        "snapshot": {
          "gstin": "29ABCDE1234F1Z5",
          "net_revenue": 450000.0,
          "output_gst": 54000.0,
          "input_credit": 25200.0,
          "net_gst": 28800.0
        },
        "created_at": "2026-08-31T10:00:00.000Z",
        "url_available": false
      }
    ]
  }
}
```

`url_available` is always false after create response (token not re-fetched).

`POST /api/v1/ca/shares`

```json
{
  "advisor_id": "uuid",
  "period_kind": "month",
  "month": "2026-08",
  "report_slugs": [
    "trial-balance",
    "profit-and-loss",
    "gstr-1",
    "gstr-3b",
    "stock-summary",
    "sales-summary"
  ],
  "include_gstr1_json": true,
  "include_gstr3b_json": true,
  "expires_in_days": 30
}
```

`201`:

```json
{
  "success": true,
  "data": {
    "share_id": "uuid",
    "url": "https://app.nammamedmate.com/ca/nmm_ca_x7K…",
    "token": "nmm_ca_x7K…",
    "expires_at": "2026-09-30T18:30:00.000Z",
    "pack_status": "pending",
    "snapshot": {
      "gstin": "29ABCDE1234F1Z5",
      "net_revenue": 450000.0,
      "output_gst": 54000.0,
      "input_credit": 25200.0,
      "net_gst": 28800.0
    },
    "copy_warning": "Anyone with this link can see the selected reports. Revoke if leaked."
  }
}
```

`token` appears **only here**. `422 SHARE_EMPTY` if no reports and both JSON flags false. `422 UNKNOWN_REPORT_SLUG`. `423` not applicable (reads locked months OK). `409 IRP` never. If prepare fails because GSTN stale, still pack from local books (`two_b_stale` inside JSON is allowed).

`GET /api/v1/ca/shares/{shareId}` — metadata + snapshot + slugs, **no token**.

`POST /api/v1/ca/shares/{shareId}/revoke` → `200` `{ "share_id", "revoked_at" }`. Idempotent if already revoked.

`GET /api/v1/ca/shares/{shareId}/pack` — authenticated download of zip when `pack_status=ready`. `409 PACK_NOT_READY`. `410` if revoked (Owner may still download for their records — **v1: Owner can download after revoke**; public cannot). Preferred: Owner download allowed after revoke.

`GET /api/v1/ca/shares/{shareId}/status` → `{ pack_status, pack_error }`.

#### Report picker helper

`GET /api/v1/ca/report-options` — subset of reports catalogue (same groups) for the share form, including GST JSON toggles as extra checkboxes not slugs: “GSTR-1 JSON”, “GSTR-3B JSON”.

### 7.2 Public CA — `/api/public/v1/ca/{token}`

No bearer. Rate limited.

`GET /api/public/v1/ca/{token}`

`200`:

```json
{
  "success": true,
  "data": {
    "shop_name": "Namma Medicals",
    "period_label": "August 2026",
    "expires_at": "2026-09-30T18:30:00.000Z",
    "snapshot": {
      "gstin": "29ABCDE1234F1Z5",
      "net_revenue": 450000.0,
      "output_gst": 54000.0,
      "input_credit": 25200.0,
      "net_gst": 28800.0
    },
    "reports": [
      {
        "slug": "trial-balance",
        "title": "Trial Balance",
        "columns": [{ "key": "name", "label": "Account", "type": "string" }],
        "rows": [],
        "totals": {}
      }
    ],
    "has_gstr1_json": true,
    "has_gstr3b_json": true,
    "has_excel": true,
    "filing_note": "Prepared in Namma MedMate. File these returns on the GST portal. This is not a Tally file."
  }
}
```

Must not include: `tenant_id`, staff names unless on audit report (Audit Trail slug if selected — still no secrets), credentials, Rx URLs.

`GET /api/public/v1/ca/{token}/pack` → `application/zip`. `404` if invalid/expired/revoked. `409 PACK_NOT_READY` if pending (CA sees “Pack is being prepared; retry shortly”).

`GET /api/public/v1/ca/{token}/files/gstr1.json` — optional single-file; still 404 if not included.

Unknown/expired/revoked:

```json
{
  "success": false,
  "error": { "code": "SHARE_NOT_FOUND", "message": "This share link is not available." }
}
```

HTTP 404 for all of unknown, expired, revoked.

### 7.3 Events

`CaShareCreated`: `{ share_id, advisor_id, period_label, report_slugs, expires_at }` — no token.  
`CaShareRevoked`: `{ share_id }`.  
`CaPackDownloaded`: `{ share_id, actor: "ca_public" | "owner", ip_hash }`.

### 7.4 UI — console

Sidebar **Business → CA / Accountant** (Growth).

Tabs: **Share** · **Advisors** · **History**.

Share form: period picker, advisor select, checklist of reports grouped like reports catalogue, checkboxes GSTR-1 JSON / GSTR-3B JSON, expiry days (default 30), submit. On success: show URL once + Copy + warning about leak/revoke. Pack spinner until ready.

Advisors: table firm, email, phone, active, add/edit.

History: snapshot columns GSTIN, net revenue, output GST, input credit, net GST; revoke button; Owner download pack; status expired/revoked/active.

Paywall Free/Starter.

### 7.5 UI — CA public page

No login chrome. Header: shop name, “Shared with {firm}”, period, expiry date. Snapshot cards. Report sections. Download pack. Footer filing note. If 404, generic “Link not available” (do not say expired vs revoked vs invalid).

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

**US-1 Create share**  
Given Growth, an advisor, August period, reports Trial Balance + P&L, both JSON on  
When Owner creates a share  
Then a URL is shown once, snapshot GST figures are stored, pack becomes ready with `gstr1.json`, `gstr3b.json`, and Excel sheets for those reports, and history lists the share.

**US-2 CA sees selected only**  
Given slugs trial-balance and profit-and-loss only  
When CA opens the URL  
Then those two tables appear and Daybook / customers / POS do not.

**US-3 No console login**  
Given a valid token  
When CA opens the URL  
Then no password/OTP; no sidebar; no Settings.

**US-4 Default 30 days**  
Given create without override  
When inspecting `expires_at`  
Then it is 30 days after create.

**US-5 Expire**  
Given `expires_at` in the past  
When CA GETs the token  
Then 404 `SHARE_NOT_FOUND` same as a random token.

**US-6 Revoke leak**  
Given an active link  
When Owner revokes (leaked)  
Then CA GET is 404; history shows revoked; Owner can still download pack.

**US-7 No secrets in pack**  
Given pack ready  
When zip is inspected  
Then no GSTN/IRP password fields, no `app_key`, no Rx image files, no Tally XML.

**US-8 Chemist does not file**  
Given CA page  
When rendered  
Then there is no File on GSTN button; filing note tells CA to use the GST portal.

**US-9 Stub report selected**  
Given TDS Payable included  
When CA views  
Then empty table + stub message in Excel sheet.

**US-10 Empty selection**  
Given no slugs and both JSON flags false  
When create  
Then `422 SHARE_EMPTY`.

**US-11 Token not in history API**  
Given a share created earlier  
When GET shares list  
Then `url` and `token` are absent.

**US-12 Plan expired existing link**  
Given share still unexpired when shop drops to Free  
When CA opens URL  
Then reports still show; Owner cannot create a new share (`403`).

**US-13 Advisor validation**  
Given invalid email  
When add advisor  
Then `422`.

**US-14 Pack pending**  
Given create just fired  
When CA downloads pack before ready  
Then `409 PACK_NOT_READY` with retry copy.

**US-15 Snapshot immutable**  
Given snapshot net revenue 450,000  
When a later bill posts  
Then history snapshot remains 450,000; CA frozen tables remain the packed snapshot (v1 freeze).

---

## 9. Edge Cases & Error Handling

| Case                         | Behaviour                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Leaked link                  | Owner revokes; 404 public; default 30-day expiry still would have ended it.                                           |
| Token brute force            | Rate limit; 404 indistinguishable.                                                                                    |
| Create while 2B stale        | Pack still builds from local books; GSTR JSON may contain `two_b_stale` metadata if books includes it — not a secret. |
| Prepare fails                | `pack_status=failed`, `pack_error` human message; Owner retries by new share; banner in console.                      |
| Secret guard trip            | Fail pack; do not store zip; alert engineering; Owner sees failed.                                                    |
| Advisor deactivated          | Existing shares still valid; cannot select for new share.                                                             |
| Report slug unknown          | `422 UNKNOWN_REPORT_SLUG`                                                                                             |
| Expires 0 or 91 days         | `422`                                                                                                                 |
| Concurrent revoke + download | Download may complete or 404; never 500 leak.                                                                         |
| HTTPS stripped               | Redirect to HTTPS; do not serve token over HTTP.                                                                      |
| CA copies URL to others      | Same capability; Owner revokes if unintended.                                                                         |
| Rx report slug               | No prescriptions report exists; do not add Rx.                                                                        |
| Audit trail selected         | Redacted events only (reports already redacts secrets).                                                               |
| Zip bomb / huge Excel        | Cap rows as reports module; fail pack if oversize with message.                                                       |

Error codes: `PLAN_REQUIRED`, `SHARE_EMPTY`, `UNKNOWN_REPORT_SLUG`, `SHARE_NOT_FOUND`, `PACK_NOT_READY`, `PACK_SECRET_GUARD`, `PACK_RX_GUARD`, `ADVISOR_EMAIL_TAKEN`, `ADVISOR_HAS_SHARES`, `VALIDATION`, `FORBIDDEN`.

---

## 10. Open Questions / Assumptions

**Assumptions:**

1. **Freeze at create** — CA sees a snapshot pack, not live mutating books (safer for filing). New numbers = new share.
2. Default expiry **30 days**; Owner can set 1–90.
3. Token shown **once**; lost token → new share.
4. Unknown/expired/revoked all **404** identical.
5. Existing links survive plan expiry until TTL/revoke; new shares do not.
6. Owner download allowed after revoke; public is not.
7. No auto WhatsApp of the URL (copy only) to reduce accidental leak via WABA logs.
8. No Tally XML.
9. Snapshot input credit = posted GST input (not only 2B claimed).
10. Zip file names `gstr1.json`, `gstr3b.json`, `reports.xlsx`, `README.txt`.

**Open questions:**

1. Dedicated share hostname vs path on the app host (infra).
2. Whether Manager should share by default (v1: no).
3. Whether CA can request a refresh (v1: no; Owner new share).
4. Legal hold if tax officer demands pack after expiry (Owner download of history while retained; retention = tenant data retention, not public URL).
