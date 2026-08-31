# Requirement Doc: Admin Analytics — SaaS Reports & Scheduled CSV (`admin-analytics`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`.  
**Source:** feature catalogue §4.8; §4.3 revenue analytics overlap; decomposition #39.  
**Sidebar:** **Analytics**. All HQ roles can view; Super admin / Operations / Finance can schedule exports.

This module reports **Namma’s SaaS** (MRR, subscribers, churn, onboarding, adoption), not chemist shop P&L (`reports`). A Namma admin is not a pharmacy user. Actions save immediately.

---

## 1. Summary

HQ **Analytics** is the SaaS report library: **MRR, subscribers, churn, onboarding, adoption**, with a **period selector** and **export** (CSV/Excel). HQ can **schedule CSV** of those reports (daily/weekly/monthly). Figures must match `admin-saas-crm` definitions (same read models). Shop-floor GMV analytics are out of v1.

---

## 2. Scope (in / out)

**In scope**

- Report library screens: MRR (and ARR), subscribers (active / trial / past due / Free counts), churn (logos + MRR), onboarding funnel (KYC → wizard → live), adoption (bands + per-module %).
- Period selector: Day / Month / Year / FY / Custom / All (same vocabulary as chemist reports, applied to SaaS dates).
- Export current report CSV (and Excel).
- Scheduled CSV jobs of a named report: cadence daily/weekly/monthly, timezone IST, output stored for HQ download; optional WhatsApp ping to the HQ user that the file is ready (`whatsapp` to HQ user’s OTP phone).
- Deep-link to CRM tabs for drill-through.

**Out of scope**

- Chemist report catalogue (GSTR, P&L, stock) — `reports`.
- Interactive MRR bridge / cohorts UI (owned by `admin-saas-crm` Revenue analytics tab); this module may **embed or deep-link** those charts but must not fork formulas.
- Patient CRM analytics — `crm`.
- GMV / UPI analytics — not in v1.
- Email delivery of CSV (no email product). WhatsApp ping is optional notify only.

---

## 3. Dependencies

| Module                          | Need                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-saas-crm`                | Canonical MRR/ARR, subscriber chips, churn events, adoption bands, module adoption %, NRR/GRR if shown as a library row. **Do not recompute incompatible definitions.** |
| `admin-tenants` / `go-live-kyc` | Onboarding funnel counts.                                                                                                                                               |
| `saas-billing`                  | Invoice/subscription facts if CRM aggregates are not yet materialised.                                                                                                  |
| `whatsapp`                      | Optional “export ready” to HQ user phone.                                                                                                                               |
| `admin-platform-settings`       | HQ user phone; roles.                                                                                                                                                   |
| `audit`                         | Schedule create/delete; export download is not money-critical but schedule changes are audited.                                                                         |
| `auth`                          | HQ JWT.                                                                                                                                                                 |

---

## 4. Functional Requirements (FR-n: The system shall ...)

- FR-1: The system shall list a **report library**: `saas_mrr`, `saas_subscribers`, `saas_churn`, `saas_onboarding`, `saas_adoption`.
- FR-2: The system shall open each report with a **period selector** (Day / Month / Year / FY / Custom / All) defaulting to current month IST.
- FR-3: The system shall show **saas_mrr**: opening MRR, closing MRR, ARR at period end, MRR by plan — numbers equal to `GET /admin/crm/overview` for the same month when period is a calendar month.
- FR-4: The system shall show **saas_subscribers**: counts Free, on trial, active paid, past due, suspended, expired-in-period.
- FR-5: The system shall show **saas_churn**: logos churned, MRR churned, reasons breakdown from `SaasChurnEvent`.
- FR-6: The system shall show **saas_onboarding**: counts at KYC pending / rejected / approved, wizard incomplete / complete, go-live ready, marked live in period.
- FR-7: The system shall show **saas_adoption**: Power / healthy / low / dormant counts and per-module adoption % from CRM Modules API.
- FR-8: The system shall **export** the open report as CSV and Excel including period bounds and generated-at.
- FR-9: The system shall create a **schedule**: report key, cadence `daily` | `weekly` | `monthly`, `dayOfWeek` for weekly (1=Mon), `dayOfMonth` for monthly, `hourIst` 0–23.
- FR-10: The system shall run due schedules, write a CSV to object storage, and list jobs with status `success` / `failed` and a time-bounded download URL.
- FR-11: The system shall optionally notify the creating HQ user via WhatsApp template `hq_export_ready` when status is success (toggle on the schedule, default off).
- FR-12: The system shall allow Pause/Delete of a schedule (immediate).
- FR-13: The system shall not include pharmacy POS GMV in any library report in v1.
- FR-14: The system shall gate schedule mutate to Super admin, Operations, Finance.
- FR-15: The system shall paginate large subscriber/churn tables (max 10,000 export rows per job; if more, split files `part-000.csv`).

---

## 5. Non-Functional Requirements

- NFR-1: Interactive report p95 ≤ 800 ms (read CRM/tenant aggregates).
- NFR-2: Scheduled job isolation: one report failure does not skip others.
- NFR-3: Download URLs expire in 24 hours.
- NFR-4: CSV UTF-8 with BOM optional; Excel xlsx.
- NFR-5: English / i18n-ready headers.
- NFR-6: Idempotent schedule run per (`scheduleId`, `periodKey`) so retries do not duplicate files.

---

## 6. Data Model / Entities

### `HqAnalyticsSchedule` (owned)

| Field               | Type         | Notes                      |
| ------------------- | ------------ | -------------------------- |
| `scheduleId`        | UUID         |                            |
| `reportKey`         | enum         | five keys in FR-1          |
| `cadence`           | enum         | `daily` `weekly` `monthly` |
| `dayOfWeek`         | int nullable |                            |
| `dayOfMonth`        | int nullable |                            |
| `hourIst`           | int          |                            |
| `notifyWhatsApp`    | bool         |                            |
| `createdByHqUserId` | UUID         |                            |
| `status`            | enum         | `running` `paused`         |

### `HqAnalyticsJob` (owned)

| Field                   | Type                 | Notes                       |
| ----------------------- | -------------------- | --------------------------- |
| `jobId`                 | UUID                 |                             |
| `scheduleId`            | UUID nullable        | null = on-demand export     |
| `reportKey`             | enum                 |                             |
| `periodFrom` `periodTo` | date                 |                             |
| `status`                | enum                 | `queued` `success` `failed` |
| `objectKey`             | text nullable        |                             |
| `error`                 | text nullable        |                             |
| `finishedAt`            | timestamptz nullable |                             |
| `periodKey`             | text                 | idempotency                 |

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/analytics`. HQ JWT.

`GET /admin/analytics/library` → `[{ "reportKey", "title" }]`

`GET /admin/analytics/reports/{reportKey}?period=2026-08`  
or `?from=2026-08-01&to=2026-08-31`

Response example `saas_mrr`:

```json
{
  "success": true,
  "data": {
    "reportKey": "saas_mrr",
    "periodFrom": "2026-08-01",
    "periodTo": "2026-08-31",
    "openingMrrPaise": 200000,
    "closingMrrPaise": 249900,
    "arrPaise": 2998800,
    "byPlan": [{ "plan": "growth", "mrrPaise": 149900 }]
  }
}
```

`GET /admin/analytics/reports/{reportKey}.csv?period=2026-08`

`GET /admin/analytics/reports/{reportKey}.xlsx?period=2026-08`

`GET /admin/analytics/schedules`

`POST /admin/analytics/schedules`

```json
{
  "reportKey": "saas_churn",
  "cadence": "weekly",
  "dayOfWeek": 1,
  "hourIst": 6,
  "notifyWhatsApp": false
}
```

`POST /admin/analytics/schedules/{scheduleId}/pause`

`DELETE /admin/analytics/schedules/{scheduleId}`

`GET /admin/analytics/jobs?scheduleId=&cursor=`

`GET /admin/analytics/jobs/{jobId}/download` → `302` signed URL or JSON `{ "url", "expiresAt" }`

### Events

`hq.analytics.schedule_run` `{ scheduleId, jobId, status }`

### UI

`/admin/analytics` library · report viewer (period + Export) · Schedules.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Period + export

As Finance, I want August MRR CSV that matches CRM, so that I do not have two truths.

- Given CRM overview MRR 249900 paise for 2026-08, When I open `saas_mrr` for August, Then closing MRR is 249900.
- Given I click Export CSV, When the file downloads, Then it contains period bounds and the same numbers.

### US-2 Scheduled CSV

As Operations, I want a weekly onboarding CSV, so that I can review the funnel without opening HQ that day.

- Given a weekly schedule Monday 06:00 IST, When that time passes, Then a job `success` exists with a download URL.
- Given notify on, When success, Then `whatsapp` is requested to my HQ phone with template `hq_export_ready`.
- Given I Pause, When next Monday passes, Then no new job.

### US-3 No shop GMV

- Given POS sales exist, When I open any library report, Then no shop GMV column appears.

---

## 9. Edge Cases & Error Handling

| Case                     | Behaviour                                                           |
| ------------------------ | ------------------------------------------------------------------- |
| Custom from &gt; to      | `400`.                                                              |
| Unknown reportKey        | `404`.                                                              |
| Job failed               | status failed + error; next cadence still runs.                     |
| Download expired         | `410 EXPIRED`; re-run or new export.                                |
| Support creates schedule | `403`.                                                              |
| CRM API down             | `502 UPSTREAM`; do not show invented zeros silently — error banner. |
| Duplicate periodKey      | Return existing job.                                                |

---

## 10. Open Questions / Assumptions

1. **Formulas are owned by `admin-saas-crm`**; this module is the library + scheduler.
2. **FY** for Namma SaaS reports is 1 Apr–31 Mar IST unless platform settings override (assume Apr–Mar).
3. **Notify** is WhatsApp to HQ user, default off; no email.
4. **Object storage** via existing AWS pattern (`libs`); not chemist CA pack.
5. **NRR/GRR/Rule of 40** stay on CRM Revenue analytics; library v1 is the five reports named in §4.8.
6. GMV analytics wait for a future flag/product.
