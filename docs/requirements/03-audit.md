# Requirement Doc: Append-only audit trail (`audit`)

## 1. Summary

The `audit` module is the platform’s append-only **AuditEvent** log. Every Bill, return (**CreditNote**), **GRN**, write-off, khata repayment, duty clock (**DutyShift**), plan change, GSTN credential edit, IRN request, login-method change, and admin action is stored with actor, role, tenant, timestamp, and before/after snapshots where money or stock moved. The Pharmacy Partner Console Audit Trail report (`reports`) reads this log; this module owns ingest and query APIs and never updates or deletes rows. Pharmacy queries are tenant-scoped with `location_id`. Platform Admin HQ critical actions are also ingested (actor + action + target + time), with `tenant_id` set when the action targets a Pharmacy and null only for pure platform-configuration actions.

## 2. Scope

- In scope:
  - Persist **AuditEvent** rows that are insert-only.
  - Ingest API for other modules (Lambdas) to record events.
  - Query API filtered by tenant, location, time range, actor, action, target type — consumed by `reports` (Audit Trail) and HQ Settings audit view.
  - Require before/after JSON when the event is money-moving or stock-moving.
  - Record actor, role, tenant, timestamp on every event.
  - Reject PATCH/PUT/DELETE of events at the API and database privilege level (no update/delete in the data service).
- Out of scope:
  - Rendering the full Reports catalogue UX (`reports` owns Audit Trail report chrome, Excel/PDF).
  - HQ Settings & RBAC page chrome (`admin-platform-settings` consumes the query API).
  - Computing financial totals, stock qty, GST, or IRN success (source modules own those facts and pass before/after).
  - Authentication of staff (`auth`); this module only records what callers send plus server timestamp.
  - Period lock enforcement (`books-gst`); locked periods still *append* reversing documents as new AuditEvents.
  - CA pack contents (`ca-sharing` must not dump a full patient AuditEvent stream by default).

## 3. Dependencies

- Other modules/slugs and what is needed:
  - `tenancy`: validate `tenant_id` + `location_id` when present; pharmacy events must include both.
  - Downstream emitters (must call ingest; this module does not scrape their tables): `pos-billing` (Bill charge), `returns` (CreditNote, write-off vs restock), `purchases` (GRN), `inventory` / `stock-take` / `purchase-returns` (write-off and stock adjustments), `khata` (repayment), `statutory-registers` (duty clock), `saas-billing` / `admin-saas-crm` (plan change), `account-settings` / `books-gst` (GSTN credential edit, IRN request), `manage-users` / `auth` (login-method change, login/logout/PIN as admin-relevant security actions — login-method is required; logins are in source §9 as session audited via `auth` emitting here), `admin-*` (admin actions).
- External services/APIs/libraries:
  - Persistence via `libs/db-services` (append-only table, no UPDATE/DELETE grants for the app role).
  - UI via `@namma-medmate/api-client` (thin query wrappers; report UI is `reports`).
  - No Meta, Cashfree, or GSTN calls.

## 4. Functional Requirements

- FR-1: The system shall insert an **AuditEvent** for each ingest request that passes validation and shall never update or delete an existing event.
- FR-2: The system shall store `actor_user_id`, `actor_role`, `tenant_id` (nullable only for non-pharmacy HQ platform actions), `occurred_at` (server clock), and `action` on every event.
- FR-3: The system shall require `location_id` on every event that has a Pharmacy `tenant_id`, and shall reject mismatch via `tenancy`.
- FR-4: The system shall require `before` and `after` JSON objects when `money_or_stock` is true.
- FR-5: The system shall accept `money_or_stock=false` with optional before/after for credential, login-method, duty, plan, IRN request, and admin actions.
- FR-6: The system shall accept `action` values at least: `bill_posted`, `credit_note_posted`, `grn_posted`, `write_off_posted`, `khata_repayment_posted`, `duty_clock_in`, `duty_clock_out`, `plan_changed`, `gstn_credential_edited`, `irn_requested`, `login_method_changed`, `admin_action`, plus `login_succeeded`, `login_failed`, `session_revoked`, `pin_verified`, `pin_failed`, `account_locked` so `auth` can audit each session as required by v1 multiple-sessions-audited.
- FR-7: The system shall reject ingest that claims `action=bill_posted` (or other money/stock actions listed in FR-8) if `money_or_stock` is false.
- FR-8: The system shall treat as money-or-stock: `bill_posted`, `credit_note_posted`, `grn_posted`, `write_off_posted`, `khata_repayment_posted` (and stock-take variance if an emitter sends it as `write_off_posted` or `stock_take_posted` — accept `stock_take_posted` as money_or_stock true).
- FR-9: The system shall not expose an HTTP method that mutates an event; GET is query-only; POST is ingest-only.
- FR-10: The system shall return query results newest-first, paginated, tenant-scoped for pharmacy callers.
- FR-11: The system shall allow pharmacy Users with report access to query only their `tenant_id` + `location_id` (this module does not implement plan gating; `reports` must not call query if Reports is locked; this API still requires pharmacy session match).
- FR-12: The system shall allow HQ principals to query by any `tenant_id` or with `tenant_id` empty for platform-only events.
- FR-13: The system shall not store GSTN/IRP secret values in `before`/`after`; emitters must send redacted refs (e.g. last4 / “updated”). This module shall reject payloads whose keys include `password`, `pin`, `otp`, `gstn_password`, `irp_secret`, `waba_token`, `cashfree_secret` (case-insensitive substring match on json keys).
- FR-14: The system shall stamp `occurred_at` on the server and ignore client-supplied timestamps for the stored value (client `occurred_at` may be stored as `client_occurred_at` optional, but the audit clock is server).
- FR-15: The system shall record `actor_surface` as `pharmacy` | `hq` | `kiosk` | `system`.
- FR-16: The system shall identify the target with `target_type` and `target_id` (e.g. Bill invoice no + FY, `grn_id`, `user_id`).
- FR-17: The system shall ingest idempotently when `idempotency_key` is provided: the same key returns the original event and does not insert a second row.
- FR-18: The system shall return 413/400 if before/after JSON exceeds 64 KiB each.

## 5. Non-Functional Requirements

- NFR-1: App database role has INSERT + SELECT on `audit_events` and no UPDATE/DELETE.
- NFR-2: Ingest p95 ≤ 100 ms; query p95 ≤ 300 ms for 7-day windows with indexes on `(tenant_id, location_id, occurred_at desc)` and `(actor_user_id, occurred_at desc)`.
- NFR-3: Events are retained for GST legal hold; v1 has no chemist delete-audit API (DPDP customer marketing delete does not remove Bill audit).
- NFR-4: English error messages with i18n keys `audit.errors.*`. This module’s own UI is minimal; report headings live in `reports`.
- NFR-5: Module layout `modules/audit/{ui,api,docs}`.
- NFR-6: Ingest is not callable from the browser for arbitrary actions; browser uses domain modules which call ingest server-side. Query is callable from `reports` UI via api-client.
- NFR-7: No PII beyond what emitters send (patient name on H1/X bill events is allowed as part of the Bill snapshot they already store). Rx images must not appear in before/after.

## 6. Data Model / Entities

- Entities/fields this module owns:
  - **AuditEvent**
    - `audit_event_id` (UUID, PK)
    - `idempotency_key` (string, unique, nullable)
    - `tenant_id` (UUID, nullable)
    - `location_id` (UUID, nullable; required if `tenant_id` set)
    - `actor_user_id` (string; HQ ids allowed; `system` for automation)
    - `actor_role` (string; pharmacy **Owner** | **Manager** | **Pharmacist** | **Cashier**, or HQ Super admin / Ops / Finance / Support / Compliance, or `system`)
    - `actor_surface` (`pharmacy` | `hq` | `kiosk` | `system`)
    - `action` (string; see FR-6)
    - `target_type` (string; e.g. `Bill`, `CreditNote`, `GRN`, `KhataLedger`, `DutyShift`, `SaasSubscription`, `User`, `PlatformMasterSku`, `Pharmacy`)
    - `target_id` (string)
    - `money_or_stock` (boolean)
    - `before` (jsonb, nullable)
    - `after` (jsonb, nullable)
    - `occurred_at` (timestamptz, server)
    - `client_occurred_at` (timestamptz, nullable)
    - `request_id` (nullable, correlation)
    - `created_at` (timestamptz)
- Relationships to entities owned elsewhere (reference by name, don't redefine):
  - **Pharmacy / Location** — `tenancy`.
  - **User (login)** — `auth` / `manage-users` (`actor_user_id`, login-method target).
  - **Bill**, **CreditNote**, **GRN**, **KhataLedger**, **DutyShift**, **SaasSubscription**, **Payment** — referenced by `target_type`/`target_id` only.
  - Reports Audit Trail — `reports` reads this API.

## 7. API / Interface Contracts

### 7.1 Ingest (service-to-service)

**POST `/audit/events`**

Authorisation: internal IAM / service token, not a chemist browser session.

Request:

```json
{
  "idempotency_key": "bill-posted:8f1c0a7e:INV-24-00018",
  "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
  "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
  "actor_user_id": "user-111",
  "actor_role": "Pharmacist",
  "actor_surface": "pharmacy",
  "action": "bill_posted",
  "target_type": "Bill",
  "target_id": "INV-24-00018",
  "money_or_stock": true,
  "before": {
    "batch_qty": { "SKU1:B1": 10 }
  },
  "after": {
    "batch_qty": { "SKU1:B1": 8 },
    "tender": "cash",
    "invoice_total": "186.00"
  },
  "client_occurred_at": "2026-08-31T12:00:00.000Z",
  "request_id": "req-abc"
}
```

Response `201`:

```json
{
  "data": {
    "audit_event_id": "9d9d9d9d-0000-4111-8222-333344445555",
    "occurred_at": "2026-08-31T12:00:00.120Z",
    "deduped": false
  }
}
```

Duplicate idempotency: `200` `{ "data": { "audit_event_id": "...", "deduped": true } }`.

HQ platform example (`tenant_id` null):

```json
{
  "idempotency_key": "admin:waba:rotate:2026-08-31",
  "tenant_id": null,
  "location_id": null,
  "actor_user_id": "hq-ops-1",
  "actor_role": "Ops",
  "actor_surface": "hq",
  "action": "admin_action",
  "target_type": "PlatformWaba",
  "target_id": "namma-medmate",
  "money_or_stock": false,
  "before": { "rotated": false },
  "after": { "rotated": true }
}
```

If `tenant_id` is set and `location_id` omitted: `400 LOCATION_ID_REQUIRED`.

### 7.2 Query (pharmacy + HQ)

**GET `/audit/events?location_id={uuid}&from=&to=&actor_user_id=&action=&target_type=&target_id=&cursor=&limit=50`**

Pharmacy session: `tenant_id` taken from session; `location_id` required and must match.

HQ: may pass `tenant_id` query param; omit both tenant and location only to list platform-only events (`tenant_id` is null). HQ querying a shop must pass `tenant_id` and `location_id`.

Response `200`:

```json
{
  "data": {
    "items": [
      {
        "audit_event_id": "9d9d9d9d-0000-4111-8222-333344445555",
        "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
        "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
        "actor_user_id": "user-111",
        "actor_role": "Pharmacist",
        "actor_surface": "pharmacy",
        "action": "bill_posted",
        "target_type": "Bill",
        "target_id": "INV-24-00018",
        "money_or_stock": true,
        "before": { "batch_qty": { "SKU1:B1": 10 } },
        "after": { "batch_qty": { "SKU1:B1": 8 }, "tender": "cash", "invoice_total": "186.00" },
        "occurred_at": "2026-08-31T12:00:00.120Z"
      }
    ],
    "next_cursor": null
  }
}
```

**GET `/audit/events/{audit_event_id}?location_id={uuid}`**

Pharmacy: 404 if other tenant (do not leak). HQ: allowed.

### 7.3 Forbidden routes

- `PATCH /audit/events/{id}` — not implemented; framework 404/405.
- `DELETE /audit/events/{id}` — not implemented.
- `PUT /audit/events/{id}` — not implemented.

### 7.4 Events emitted

- `AuditEventRecorded` — `{ audit_event_id, tenant_id, location_id, action, target_type, target_id, occurred_at }` (for streaming to HQ activity if needed; `reports` can also poll query).

This module is the log; it does not emit domain Bill/GRN events.

### 7.5 UI routes / components

- Pharmacy Partner Console: no full report page here. Export `AuditEventTable` presentational component (English columns: Time, Actor, Role, Action, Target, When money/stock: Before, After). i18n `audit.table.time`, `audit.table.actor`, `audit.table.role`, `audit.table.action`, `audit.table.target`, `audit.table.before`, `audit.table.after`. `reports` mounts it on Audit Trail.
- Platform Admin HQ: `HqAuditEventTable` same columns + Tenant. `admin-platform-settings` mounts it on Audit log. Route owned here: none required; optional `/hq/audit` redirect unused.

## 8. User Stories & Acceptance Criteria

### US-1: Posted bill is auditable with stock before/after

As QA I prove a Charge wrote an append-only row.

- AC-1: Given `pos-billing` POSTs ingest with `action=bill_posted`, `money_or_stock=true`, and before/after batch qty, when ingest succeeds, then GET query by `target_id` of that Bill returns exactly one new row with the same snapshots.
- AC-2: Given a second ingest with the same `idempotency_key`, when processed, then `deduped=true` and row count stays one.
- AC-3: Given I attempt PATCH on that `audit_event_id`, when the API responds, then the body is unchanged and the method is 404 or 405.

### US-2: Reports reads the same log

As a Growth pharmacist opening Audit Trail I see duty clocks and repayments.

- AC-1: Given events exist for my `location_id`, when `reports` GETs `/audit/events?location_id=...&from=&to=`, then rows include `duty_clock_in` and `khata_repayment_posted` if those were ingested.
- AC-2: Given I omit `location_id` on a pharmacy query, then the response is 400 `LOCATION_ID_REQUIRED`.
- AC-3: Given another tenant’s id in the path, when I GET by `audit_event_id`, then the response is 404.

### US-3: GSTN secret cannot be logged

As Compliance I need secrets out of the audit log.

- AC-1: Given ingest `after` contains key `gstn_password`, when posted, then the response is 400 `SECRET_KEY_FORBIDDEN` and no row is inserted.
- AC-2: Given `action=gstn_credential_edited` with `after: { "updated": true, "ref": "secret-ref-1" }`, when posted, then the row is stored.
- AC-3: Given `money_or_stock=true` and `before` is omitted, when `action=grn_posted`, then the response is 400 `BEFORE_AFTER_REQUIRED`.

### US-4: HQ admin action is stored

As Super admin I change a platform setting and see myself on the HQ audit log.

- AC-1: Given ingest with `actor_surface=hq`, `action=admin_action`, `tenant_id` null, when queried by HQ without tenant filter, then the row is returned.
- AC-2: Given that row, when a pharmacy User queries their inbox of events, then the platform-only row is not included.
- AC-3: Given HQ queries with a pharmacy `tenant_id` + `location_id`, when events exist, then only that shop’s rows return.

## 9. Edge Cases & Error Handling

- Client clock skew: stored `occurred_at` is server time; `client_occurred_at` is informational.
- Automation (`admin-automation`) as actor: `actor_user_id=system`, `actor_role=system`, `actor_surface=system`.
- Kiosk exit PIN verify: `auth` emits `pin_verified` with `actor_surface=kiosk`; still needs `tenant_id` + `location_id`.
- Missing tenancy pair for pharmacy action: 400.
- Unknown action string: allow free string but recommend enum; unknown is stored (forward compatible) unless empty.
- Empty actor: 400 `ACTOR_REQUIRED`.
- Query `from` > `to`: 400 `INVALID_RANGE`.
- Limit > 200: cap at 200.
- Concurrent ingest without idempotency: two rows (emitters for Charge/GRN/repayment/IRN must pass keys; Charge uses `client_charge_id` as part of the key).
- Plan expired: query API still returns history (data retained); `reports` paywall is `plan-gating`.

| Code | HTTP | When |
|---|---|---|
| `LOCATION_ID_REQUIRED` | 400 | Pharmacy event/query missing location |
| `LOCATION_TENANT_MISMATCH` | 403 | Pairing |
| `BEFORE_AFTER_REQUIRED` | 400 | Money/stock missing snapshots |
| `SECRET_KEY_FORBIDDEN` | 400 | Forbidden json keys |
| `ACTOR_REQUIRED` | 400 | No actor |
| `PAYLOAD_TOO_LARGE` | 400 | Snapshot > 64 KiB |
| `INVALID_RANGE` | 400 | from > to |
| `MONEY_OR_STOCK_REQUIRED` | 400 | FR-7 |
| `NOT_FOUND` | 404 | Unknown id or hidden by tenant |

## 10. Open Questions / Assumptions

- Assumption: server stamps `occurred_at`; client time is optional.
- Assumption: `reports` owns Excel/PDF of Audit Trail and only reads this query API.
- Assumption: login success/fail/session is in scope because §2.5 / §9 require each session audited and login-method change is explicitly listed; PIN/kiosk locks are security actions ingested by `auth`.
- Assumption: write-off includes return-to-write-off and wastage journals; emitters choose `write_off_posted`.
- Assumption: 64 KiB cap per snapshot; Bills with huge line arrays should send summarised before/after (qty maps, totals) not full Rx images.
- Assumption: HQ platform events may have null tenant; any action on a chemist account must include that Pharmacy’s `tenant_id` + `location_id`.
- Vague: exhaustive action enum. Implement the listed actions and allow additional strings so later modules are not blocked.
- Out of v1: chemist-facing “delete my audit”, mutable logs, Tally export of audit.
---
