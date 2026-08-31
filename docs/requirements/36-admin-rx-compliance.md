# Requirement Doc: Rx & Compliance Audit Copy (`admin-rx-compliance`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`.  
**Source:** feature catalogue §4.5, §2.3, §3.22, operating principle 16; glossary; decomposition #36.  
**Sidebar:** **Rx & compliance**. HQ roles: Super admin and Compliance mutate; Operations/Support/Finance read-only unless noted.

A Namma admin is not a pharmacy user. Actions save immediately. **Pharmacy H1/X printout is the legal register** (`statutory-registers`). This module is a **read-only audit copy** with Verify / Flag only — **not** the inspector’s legal record.

---

## 1. Summary

HQ **Rx & compliance** lets Namma Compliance review scheduled sales and staff-uploaded prescriptions across pharmacies: an **Audit queue** (Verify / Flag inline), **Schedule registers** split H1 vs X (audit copy of each shop’s legal register), a **Prescribing doctors** directory with registration verify, and **Reports**. Schedule-X sales can be auto-flagged (`admin-automation` may press the same Flag button). HQ never prints a document that claims to be the drug inspector’s copy; the chemist’s console export remains the legal record.

---

## 2. Scope (in / out)

**In scope**

- Tabs: **Audit queue · Schedule registers (H1 vs X) · Prescribing doctors · Reports**.
- Inline **Verify** and **Flag** on audit-queue rows (and equivalent on register lines).
- Read-only projection of H1 and X register lines from `statutory-registers` (all tenants Compliance may see).
- Doctor directory aggregated from shop doctor lists, with HQ **registration verify** flag.
- Reports: counts of flagged / unverified / Schedule-X sales in a period; export CSV.
- Consume auto-flag events for Schedule-X / Rx sales (same Flag API a human uses).
- Audit of Verify / Flag / doctor verify via `audit`.

**Out of scope**

- Pharmacy legal H1/X print/export for the inspector — `statutory-registers`.
- Posting or reversing register lines — those happen only when POS / returns post (`pos-billing`, `returns`).
- Duty clock-in, licence desk WhatsApp 60/30/7 — `statutory-registers`.
- POS doctor picker / add-inline — `statutory-registers` + `pos-billing`.
- Prescription photo storage UI — `prescriptions` (HQ may deep-link metadata, not replace the queue).
- Master catalogue schedule tags / ban — `master-catalogue`.
- Patient CRM — `crm`.
- Inventing a national doctor registry integration in v1 (verify is a HQ boolean + optional note).

---

## 3. Dependencies

| Module                             | Need                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statutory-registers`              | Legal register lines (H1/X): date, patient, doctor name + registration number, drug, batch, qty, running balance, bill no, pharmacist on duty, tenantId, locationId. Shop doctor list (name, reg. no., active). **Source of truth for line content.** This module stores only HQ annotation (verified/flagged). |
| `prescriptions`                    | Staff-uploaded Rx queue metadata (status, patient, doctor, SLA, tenant). Images remain tenant-scoped; HQ Compliance may fetch via a signed URL issued by `prescriptions` if role allows (see §10).                                                                                                              |
| `pos-billing`                      | Bill identity for deep-link facts (invoice no + FY). Not rewritten here.                                                                                                                                                                                                                                        |
| `admin-automation`                 | Seed rule “Flag Schedule-X / Rx sales for audit” calls this module’s Flag API.                                                                                                                                                                                                                                  |
| `admin-tenants`                    | Tenant shop name for display.                                                                                                                                                                                                                                                                                   |
| `audit`                            | Verify/Flag/doctor-verify events.                                                                                                                                                                                                                                                                               |
| `auth` / `admin-platform-settings` | HQ JWT + Compliance / Super admin write.                                                                                                                                                                                                                                                                        |

**External:** none. No NMC/state council API in v1.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### Chrome

- FR-1: The system shall show HQ sidebar item **Rx & compliance** routing to `/admin/rx-compliance` with four tabs: Audit queue, Schedule registers, Prescribing doctors, Reports.
- FR-2: The system shall refuse pharmacy JWTs (`403 HQ_SURFACE_ONLY`).
- FR-3: The system shall save Verify, Flag, Unflag, and doctor-verify immediately (no extra Save).

### Audit queue

- FR-4: The system shall list audit items of types `register_line` (H1 or X sale/return line) and `prescription` (staff-uploaded Rx), newest first, filterable by tenant, type, schedule (`H1`/`X`/`other`), status (`unverified` / `verified` / `flagged`), date range.
- FR-5: The system shall show on each row: shop name, date, patient identity (name + phone if named), doctor name + registration number, SKU + schedule tag, qty, bill or Rx id, pharmacist on duty (register lines), current HQ status.
- FR-6: The system shall provide inline **Verify** which sets HQ annotation `verified`, records actor + time, and clears `flagged` only if the user confirms (default: Verify does not clear a flag — see §10: Verify and Flag are independent; a line may be verified and still flagged). **Assumption locked in FR-7.**
- FR-7: The system shall treat **Verify** and **Flag** as independent booleans: `hqVerified` and `hqFlagged`. Verify does not unflag. Unflag is a separate control.
- FR-8: The system shall provide inline **Flag** which sets `hqFlagged=true` and requires a reason (preset: missing doctor reg, duty mismatch, qty anomaly, Schedule-X review, other).
- FR-9: The system shall provide **Unflag** with a note, Super admin / Compliance only.
- FR-10: The system shall auto-insert audit-queue items when a Schedule-X register line is posted (and when a scheduled Rx is dispensed), status unverified and, for Schedule-X, `hqFlagged=true` with reason `Schedule-X review` if not already flagged. This insert is the same outcome as a human Flag (idempotent on `sourceLineId`).
- FR-11: The system shall not edit patient, doctor, qty, or bill fields; HQ is annotation-only.

### Schedule registers (H1 vs X)

- FR-12: The system shall show two subviews **H1** and **X** that render the audit copy of pharmacy register lines for the selected tenant (or all tenants for Compliance), with the same columns as the legal register: date, patient, doctor name + registration number, drug, batch, qty, running balance, bill no, pharmacist on duty.
- FR-13: The system shall watermark or subtitle the view: **“Audit copy — not the inspector’s legal record. Print from the pharmacy console.”**
- FR-14: The system shall **not** offer Print/PDF labelled as a statutory register from HQ. CSV of the audit copy is allowed and must include the watermark column `audit_copy_only=true`.
- FR-15: The system shall show Verify/Flag status per line and allow the same inline actions as the audit queue.
- FR-16: The system shall require a tenant filter before showing running balances (balances are per shop; an all-tenant mash-up shall omit running balance or show “—”).

### Prescribing doctors

- FR-17: The system shall list unique doctors by **registration number** aggregated across shop lists: name (latest), reg. no., number of shops listing them, last sale date, `hqRegVerified` boolean.
- FR-18: The system shall provide **Verify registration** (sets `hqRegVerified=true` + optional note) and **Clear verify**. This does not change the shop list and is not a substitute for the shop doctor record.
- FR-19: The system shall search by name or registration number.
- FR-20: The system shall deep-link from a doctor to register lines that cite that registration number.

### Reports

- FR-21: The system shall show period KPIs: Schedule-X sale lines, H1 sale lines, flagged open, unverified open, prescriptions flagged, doctors unverified used on a flagged line.
- FR-22: The system shall export those KPIs + the filtered audit queue as CSV.
- FR-23: The system shall default period to the current calendar month IST.

### Permissions

- FR-24: The system shall allow Verify/Flag/Unflag/doctor-verify only for **Compliance** and **Super admin**. Other HQ roles may view Reports and queues read-only.

---

## 5. Non-Functional Requirements

- NFR-1: Audit queue page p95 ≤ 500 ms (indexes on tenantId, postedAt, hqFlagged).
- NFR-2: Register audit copy is eventually consistent with `statutory-registers` within 5 seconds of a POS post (read source tables or events; do not maintain a divergent legal ledger).
- NFR-3: Patient PII and Rx image access is Compliance/Super admin only; Support sees shop name + bill no without patient phone on this screen (§10).
- NFR-4: Every Verify/Flag/Unflag/doctor-verify appends `AuditEvent`.
- NFR-5: Flag from automation and from UI share one idempotency key `sourceLineId + reasonCode`.
- NFR-6: English / i18n-ready. Watermark string is not omitted in any locale key.
- NFR-7: HQ cannot call pharmacy register print APIs.

---

## 6. Data Model / Entities

### `HqRxAuditAnnotation` (owned)

| Field                             | Type          | Notes                                                            |
| --------------------------------- | ------------- | ---------------------------------------------------------------- |
| `annotationId`                    | UUID          |                                                                  |
| `sourceType`                      | enum          | `h1_line` `x_line` `prescription`                                |
| `sourceLineId`                    | string        | id from `statutory-registers` or `prescriptions`                 |
| `tenantId`                        | UUID          |                                                                  |
| `hqVerified`                      | bool          | default false                                                    |
| `verifiedAt` `verifiedByHqUserId` | nullable      |                                                                  |
| `hqFlagged`                       | bool          |                                                                  |
| `flagReason`                      | enum nullable | `missing_reg` `duty_mismatch` `qty_anomaly` `schedule_x` `other` |
| `flagNote`                        | text nullable |                                                                  |
| `flaggedAt` `flaggedByHqUserId`   | nullable      | actor may be `automation`                                        |
| `unflaggedAt`                     | nullable      |                                                                  |

Unique (`sourceType`, `sourceLineId`).

### `HqDoctorVerify` (owned)

| Field                             | Type          | Notes                |
| --------------------------------- | ------------- | -------------------- |
| `registrationNo`                  | text PK       | normalised uppercase |
| `hqRegVerified`                   | bool          |                      |
| `note`                            | text nullable |                      |
| `verifiedByHqUserId` `verifiedAt` |               |                      |

### Referenced (not redefined)

- H1/X register line, Doctor (shop list), DutyShift — `statutory-registers` (legal record).
- Prescription — `prescriptions`.
- Bill — `pos-billing`.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/rx-compliance`. HQ JWT.

### 7.1 Audit queue

`GET /admin/rx-compliance/queue?tenantId=&type=&schedule=&status=&from=&to=&cursor=&limit=50`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "annotationId": "uuid",
        "sourceType": "x_line",
        "sourceLineId": "uuid",
        "tenantId": "uuid",
        "shopName": "Sri Krishna Medicals",
        "postedAt": "2026-08-31T10:00:00Z",
        "patientName": "A. Rao",
        "patientPhone": "98xxxxxxxx",
        "doctorName": "Dr Mehta",
        "doctorRegNo": "KA-12345",
        "skuName": "Example X drug",
        "schedule": "X",
        "qty": 2,
        "billNo": "INV-24-1901",
        "pharmacistOnDuty": "R. Sharma",
        "hqVerified": false,
        "hqFlagged": true,
        "flagReason": "schedule_x"
      }
    ],
    "nextCursor": null,
    "total": 12
  }
}
```

`POST /admin/rx-compliance/annotations/{sourceType}/{sourceLineId}/verify`

Body: `{}` → `{ "hqVerified": true, "verifiedAt": "..." }`

`POST /admin/rx-compliance/annotations/{sourceType}/{sourceLineId}/flag`

```json
{ "reason": "schedule_x", "note": "" }
```

Idempotent if already flagged with same reason.

`POST /admin/rx-compliance/annotations/{sourceType}/{sourceLineId}/unflag`

```json
{ "note": "Reviewed with pharmacist" }
```

### 7.2 Registers (audit copy)

`GET /admin/rx-compliance/registers?schedule=H1|X&tenantId=&from=&to=&cursor=`

Response lines mirror statutory-registers fields plus annotations plus `"legalRecord": false, "auditCopy": true`.

`GET /admin/rx-compliance/registers.csv` — includes column `audit_copy_only=true`. No PDF statutory print endpoint.

### 7.3 Doctors

`GET /admin/rx-compliance/doctors?q=&verified=`

`POST /admin/rx-compliance/doctors/{registrationNo}/verify` `{ "note": "Checked state council PDF" }`

`POST /admin/rx-compliance/doctors/{registrationNo}/unverify`

`GET /admin/rx-compliance/doctors/{registrationNo}/lines`

### 7.4 Reports

`GET /admin/rx-compliance/reports?period=2026-08`

```json
{
  "success": true,
  "data": {
    "h1Lines": 80,
    "xLines": 6,
    "flaggedOpen": 6,
    "unverifiedOpen": 14,
    "prescriptionsFlagged": 1,
    "unverifiedDoctorsOnFlaggedLines": 2
  }
}
```

`GET /admin/rx-compliance/reports.csv`

### 7.5 Internal command (automation / POS consumer)

`POST /admin/rx-compliance/internal/auto-flag`

```json
{
  "sourceType": "x_line",
  "sourceLineId": "uuid",
  "tenantId": "uuid",
  "reason": "schedule_x"
}
```

Same Flag semantics; `flaggedByHqUserId` null; `flaggedBy = automation`. Auth: internal IAM or HQ JWT. `409` not used if already flagged — return existing.

### 7.6 Events

| Event                    | Payload                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `hq.rx.verified`         | `{ sourceType, sourceLineId, tenantId, actorHqUserId }`                     |
| `hq.rx.flagged`          | `{ sourceType, sourceLineId, tenantId, reason, actor: "hq"\|"automation" }` |
| `hq.rx.unflagged`        | `{ sourceType, sourceLineId, actorHqUserId }`                               |
| `hq.doctor.reg_verified` | `{ registrationNo, actorHqUserId }`                                         |

Subscribe: `statutory-registers` / `pos-billing` `register.line.appended` with schedule X (and optionally H1) → auto-flag command.

### 7.7 UI

`/admin/rx-compliance?tab=queue|registers|doctors|reports`

Registers tab requires `schedule=H1|X`. Banner: audit copy, not inspector’s record.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Flag and verify a Schedule-X line

As Compliance, I want to see X sales flagged and verify them, so that we audit without becoming the legal register.

- Given a POS X sale posted, When I open Audit queue, Then a row exists with `hqFlagged=true`, reason `schedule_x`, and legal fields match `statutory-registers`.
- Given that row, When I Verify, Then `hqVerified=true` and `hqFlagged` remains true until I Unflag.
- Given I export CSV, Then `audit_copy_only=true` is present and there is no “statutory print” button.

### US-2 Doctor verify

As Compliance, I want to mark a registration number verified, so that shops listing that doctor are easier to review.

- Given shop lists Dr Mehta KA-12345, When I Verify registration, Then `hqRegVerified=true` and the shop list record is unchanged.
- Given I search KA-12345, When I open lines, Then X/H1 lines with that reg. no. list.

### US-3 Automation presses Flag

As the platform, I want automation to flag X sales using the same button, so that humans and rules do not diverge.

- Given auto-flag for `sourceLineId` already flagged, When the rule runs again, Then no duplicate annotation row.
- Given kill-switch in `admin-automation` is on, When a new X sale posts, Then this module still **accepts** a later human Flag; it does not itself require the kill-switch (the rule does).

### US-4 Not the inspector’s copy

As Super admin, I want HQ labelled as audit-only, so that we never hand HQ PDF to an inspector as the legal register.

- Given Schedule registers tab, When it renders, Then the watermark/subtitle is visible.
- Given I am Operations, When I POST Flag, Then `403`.

---

## 9. Edge Cases & Error Handling

| Case                                          | Behaviour                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Register line deleted/reversed by credit note | Line still listed; qty may be reversed on a new line in `statutory-registers`; HQ annotations stay on original `sourceLineId`. |
| Missing doctor reg on a line                  | Allowed to Flag `missing_reg`; HQ still cannot edit the line.                                                                  |
| All-tenants register view                     | Running balance column is "—".                                                                                                 |
| Unknown `sourceLineId`                        | `404`.                                                                                                                         |
| Rx image fetch denied                         | Queue still shows metadata; image 403.                                                                                         |
| Duplicate auto-flag                           | Return existing annotation.                                                                                                    |
| Support views queue                           | Patient phone masked; no Verify/Flag.                                                                                          |
| Empty queue                                   | Empty state “No items to audit”.                                                                                               |

---

## 10. Open Questions / Assumptions

1. **HQ is never the inspector’s legal record.** Pharmacy print/export in `statutory-registers` is.
2. **Verify and Flag are independent** so a Schedule-X auto-flag can remain while Compliance verifies the line.
3. **Auto-flag** applies to Schedule-X sales (and Rx items that include X) as the catalogue says “Schedule-X sales can be auto-flagged”. H1 is in the queue unverified but not auto-flagged unless a human or a future rule flags it.
4. **No government doctor API** in v1; verify is a HQ attestation.
5. **Rx images:** Compliance/Super admin may request a short-lived URL from `prescriptions`; other HQ roles cannot.
6. **Support masking** of patient phone is a DPDP assumption.
7. **Running balance** only when `tenantId` is selected.
8. Automation may only Flag (a button humans have), under automation caps — not implemented here.
