# Requirement Doc: Employees (`employees`)

## 1. Summary (one paragraph)

Employees is the Pharmacy Partner Console **HR directory** for one **Pharmacy** / **Location**: people who work in the shop, whether or not they have a **User** login. It is a **Starter** module. It is not payroll: there is no PF / ESI, no payslip, no salary posting, and recording a shop expense in `expenses` is not a payroll run. The Owner (or a User granted `employees`) maintains photo, personal details, employment, PAN / Aadhaar, documents, salary-bank master data (IFSC / UPI), emergency contact, and can generate an ID card. Position and status filters, CSV export, Add Employee, and headcount / role-composition bars summarise the directory — not salary runs. Registered pharmacists on this list are the pool that `statutory-registers` clocks in as **DutyShift**; this module exposes pharmacist-eligible **Employee** rows and does not own duty. UI lives in `modules/employees/ui` via `@namma-medmate/api-client`; API in `modules/employees/api`. Every pharmacy query is tenant-scoped and includes `location_id`.

## 2. Scope (in / out)

### In scope

- Pharmacy Partner Console **Employees** screen (Account group), gated **Starter**.
- **Employee** records: photo, personal, employment, PAN / Aadhaar, documents, salary-bank (IFSC / account / UPI) as master data, emergency contact.
- Optional link to a **User** (`user_id`) in the same tenant; unlink without deleting either side.
- Filters: position, status. Search by name / phone / employee code.
- CSV export of the directory (staff HR fields, not a patient dump).
- Add / edit Employee. Status changes (active / inactive / separated). No hard-delete in v1.
- Headcount KPI and role-composition bars (counts by `position`, not rupees).
- ID card generator (printable / PDF) using shop name, logo if present, photo, name, position, employee code.
- Read API of pharmacist-eligible employees for **DutyShift** clock-in (`statutory-registers` owns **DutyShift**).
- English UI, i18n-ready.

### Out of scope

- **User** login, roles, permissions, seats, PIN, OTP (`manage-users`, `auth`).
- **DutyShift** clock-in / clock-out UI and persistence (`statutory-registers`).
- Payroll run, PF, ESI, professional tax, payslip PDF as a pay artefact, salary journal posting.
- Shop **Expense** “salary” category posting (`expenses`) — chemists may still type a salary expense there; that is not this module.
- Licence-expiry WhatsApp (licence desk in `statutory-registers` / `whatsapp`).
- Attendance timesheets beyond exposing pharmacist eligibility.
- SMS, shop-floor Cashfree GMV, branches as a product.

## 3. Dependencies (modules + external)

| Dependency                             | Why                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tenancy`                              | **Pharmacy** tenant + **Location**; shop name / logo for ID card.                                                       |
| `plan-gating`                          | Module key `employees` unlocked on Starter and above. Locked page + paywall naming Starter ₹699 + 18% GST when on Free. |
| `manage-users` / `auth`                | Optional `user_id` link validation; do not create logins here.                                                          |
| `statutory-registers` (later consumer) | Reads pharmacist-eligible employees; owns **DutyShift**.                                                                |
| `account-settings`                     | Logo for ID card if uploaded.                                                                                           |
| `audit`                                | **AuditEvent** on create, PII edit, document upload, status change, user link.                                          |
| `@namma-medmate/api-client`            | Sole UI HTTP path.                                                                                                      |
| `libs/db-services`                     | Persistence. Object storage for photo / documents via presigned URLs.                                                   |

External: none.

## 4. Functional Requirements (FR-n: The system shall ...)

**FR-1:** The system shall persist each HR person as an **Employee** with `employee_id`, `tenant_id`, `location_id`, and the fields in §6.

**FR-2:** The system shall require `location_id` on every pharmacy Employees query and mutation and shall reject missing values with `LOCATION_REQUIRED`.

**FR-3:** The system shall isolate Employees by **Pharmacy** tenant (`TENANT_MISMATCH` / 404).

**FR-4:** The system shall gate all Employees routes on `plan-gating` module key `employees`. Callers on Free shall receive 403 `PLAN_REQUIRED` with `required_plan: "starter"`. The UI shall show the lock + paywall, not an empty directory.

**FR-5:** The system shall further require `permissions["employees"]` for mutations and for PAN / Aadhaar / bank / documents. Owner has this permission by default. Users without it shall receive 403 `FORBIDDEN`.

**FR-6:** The system shall create an Employee with required fields: `full_name`, `position`, `status` (default `active`), `phone`. Missing required fields → 400 `VALIDATION_ERROR`.

**FR-7:** The system shall accept `position` as one of `owner`, `manager`, `pharmacist`, `cashier`, `helper`, `other` (HR labels, not login roles). `other` may include `position_label` (≤ 80 chars) for display.

**FR-8:** The system shall accept `status` as `active`, `inactive`, or `separated`. Separated employees remain in the directory and CSV; they are excluded from headcount “active” and from pharmacist-eligible lists.

**FR-9:** The system shall not provide a hard-delete endpoint in v1. Status `separated` is the terminal HR state.

**FR-10:** The system shall allow an optional `user_id` linking to a **User** in the same tenant and `location_id`. A User shall be linked to at most one Employee and an Employee to at most one User (`USER_ALREADY_LINKED` / `EMPLOYEE_ALREADY_LINKED`). Unlink (`user_id: null`) shall not delete the User.

**FR-11:** The system shall not create, disable, or remove a **User** when an Employee is created, edited, or set `separated`.

**FR-12:** The system shall store PAN and Aadhaar encrypted at rest, return them only to callers with `employees` permission, mask Aadhaar in list views (`XXXX-XXXX-1234`), and never write them to logs, ID cards, or CSV unless the Owner explicitly exports CSV (CSV may include PAN; Aadhaar shall be masked in CSV).

**FR-13:** The system shall store salary-bank master data (`account_holder`, `account_number` encrypted, `ifsc`, `upi_id`) for reference only. The system shall not initiate a payout, NACH, or payroll journal.

**FR-14:** The system shall accept emergency contact `name`, `phone`, `relation` (all optional individually; if any is set, `name` and `phone` are required).

**FR-15:** The system shall issue a presigned upload URL for `photo` (jpeg / png / webp, max 5 MB) and for documents (pdf / jpeg / png, max 10 MB each). After the client uploads, the client confirms `object_key`. The system shall reject keys not issued to this tenant (`UPLOAD_KEY_INVALID`).

**FR-16:** The system shall store documents as `{ document_id, type, object_key, file_name, uploaded_at }` with `type` ∈ `{ id_proof, pharmacist_registration, other }`. Max 20 documents per Employee.

**FR-17:** The system shall treat an Employee as **pharmacist-eligible** when `status=active`, `pharmacist_registration_no` is non-empty, and `location_id` matches. `GET /employees/pharmacist-eligible` shall return only those rows (id, name, registration no, registration expiry) for `statutory-registers`.

**FR-18:** The system shall not clock in a **DutyShift**. It shall not write statutory register rows.

**FR-19:** The system shall compute headcount as `{ total, active, inactive, separated }` for the location and role-composition as counts per `position` among `status=active` only.

**FR-20:** The system shall filter the list by `position`, `status`, and `q` (matches `full_name`, `phone`, `employee_code` case-insensitive).

**FR-21:** The system shall export CSV (`text/csv`, UTF-8 BOM) of the current filter with columns: employee_code, full_name, phone, email, position, status, join_date, pharmacist_registration_no, user_id (or empty), pan (if permitted), aadhaar_masked. No patient fields. No bank account number (IFSC and UPI may be included; account number omitted from CSV).

**FR-22:** The system shall generate an ID card PDF (A6 / CR80 layout) with: pharmacy name, logo if any, employee photo if any, full_name, position (or `position_label`), employee_code, `location_id` shop city if present on **Pharmacy**. The card shall not print Aadhaar, PAN, bank, or login password.

**FR-23:** The system shall auto-assign `employee_code` unique per tenant if the client omits it, pattern `EMP-` + 4-digit sequence. Client-supplied codes must be unique (`EMPLOYEE_CODE_TAKEN`).

**FR-24:** The system shall write **AuditEvent** for create, update of PII / bank / PAN / Aadhaar, document add / remove, status change, `user_id` link / unlink, photo change.

**FR-25:** The system shall require `pharmacist_registration_no` and `pharmacist_registration_expiry` together when either is present (`PHARMACIST_REG_INCOMPLETE`). Eligibility (FR-17) still requires `status=active` and a non-empty registration number.

**FR-26:** The system shall accept date fields as ISO `YYYY-MM-DD` (join_date, date_of_birth, pharmacist_registration_expiry, id document dates). `date_of_birth` must be in the past.

**FR-27:** The system shall paginate list results (`page`, `page_size` default 20 max 100).

**FR-28:** The system shall not include salary amount, CTC, PF number, or ESI number fields.

## 5. Non-Functional Requirements

- **Tenancy:** `location_id` on every query. No cross-shop HR.
- **Plan:** Starter+. Paywall copy names Starter and price; no feature data leaked on Free beyond the lock screen.
- **i18n:** English ships; keys `employees.*`.
- **PII / DPDP:** PAN, Aadhaar, phone, photo, documents, bank are staff PII. Encrypted at rest for Aadhaar, PAN, account number. Access only by tenant staff with `employees` permission. Not sent to CA pack.
- **Security:** Presigned URLs expire in 10 minutes, PUT-only to the issued key, content-type allow-list.
- **Audit:** Append-only for FR-24.
- **Performance:** List P95 < 300 ms excluding photo URLs. ID card PDF P95 < 2 s.
- **No SMS.** No shop-floor Cashfree. No payroll processor.
- **Accessibility:** Composition bars have text alternatives (counts, not colour-only).

## 6. Data Model / Entities

### Employee (HR) — system of record in this module

| Field                            | Type                  | Notes                                          |
| -------------------------------- | --------------------- | ---------------------------------------------- |
| `employee_id`                    | uuid                  | PK                                             |
| `tenant_id`                      | uuid                  | **Pharmacy**                                   |
| `location_id`                    | uuid                  | **Location**                                   |
| `employee_code`                  | string                | Unique per tenant                              |
| `full_name`                      | string                | Required                                       |
| `phone`                          | string                | Required; E.164 preferred                      |
| `email`                          | string null           |                                                |
| `date_of_birth`                  | date null             |                                                |
| `gender`                         | enum null             | `female` \| `male` \| `other` \| `undisclosed` |
| `address`                        | string null           |                                                |
| `photo_object_key`               | string null           |                                                |
| `position`                       | enum                  | See FR-7                                       |
| `position_label`                 | string null           | When position = `other`                        |
| `status`                         | enum                  | `active` \| `inactive` \| `separated`          |
| `join_date`                      | date null             |                                                |
| `user_id`                        | uuid null             | Optional **User**                              |
| `pan`                            | encrypted string null |                                                |
| `aadhaar`                        | encrypted string null |                                                |
| `pharmacist_registration_no`     | string null           |                                                |
| `pharmacist_registration_expiry` | date null             |                                                |
| `bank_account_holder`            | string null           | Master data only                               |
| `bank_account_number`            | encrypted string null | Master data only                               |
| `bank_ifsc`                      | string null           |                                                |
| `bank_upi_id`                    | string null           |                                                |
| `emergency_name`                 | string null           |                                                |
| `emergency_phone`                | string null           |                                                |
| `emergency_relation`             | string null           |                                                |
| `created_at`                     | timestamptz           |                                                |
| `updated_at`                     | timestamptz           |                                                |

### EmployeeDocument

| Field         | Type        | Notes                                              |
| ------------- | ----------- | -------------------------------------------------- |
| `document_id` | uuid        |                                                    |
| `employee_id` | uuid        |                                                    |
| `type`        | enum        | `id_proof` \| `pharmacist_registration` \| `other` |
| `object_key`  | string      |                                                    |
| `file_name`   | string      |                                                    |
| `uploaded_at` | timestamptz |                                                    |

**DutyShift** is not stored here. **User** is not stored here.

## 7. API / Interface Contracts (REST JSON + events + UI)

Base: `/employees`. Bearer auth. Query `location_id` required on pharmacy routes. Envelopes as in `manage-users` / auth (`success` / `error`).

### 7.1 REST JSON

#### `GET /employees/summary?location_id=`

Requires plan `employees` + permission `employees`.

**200 data:**

```json
{
  "headcount": { "total": 6, "active": 5, "inactive": 1, "separated": 0 },
  "composition": [
    { "position": "pharmacist", "count": 2 },
    { "position": "cashier", "count": 2 },
    { "position": "manager", "count": 1 }
  ]
}
```

Bars in UI bind to `composition`. No salary fields.

#### `GET /employees?location_id=&position=&status=&q=&page=1&page_size=20`

**200 data:** `{ "items": [ EmployeeListItem ], "page", "page_size", "total" }`

`EmployeeListItem` includes: `employee_id`, `employee_code`, `full_name`, `phone`, `position`, `position_label`, `status`, `join_date`, `user_id`, `pharmacist_eligible` (boolean), `photo_url` (signed GET, 10 min), `aadhaar_masked`. No PAN, Aadhaar full, or account number.

#### `GET /employees/{employee_id}?location_id=`

Full Employee (PAN / Aadhaar / account number decrypted for authorised caller), plus `documents[]` with signed download URLs.

#### `POST /employees?location_id=`

Header `Idempotency-Key` recommended.

**Request:**

```json
{
  "full_name": "Anita Sharma",
  "phone": "+919812345678",
  "email": "anita@example.com",
  "date_of_birth": "1990-04-12",
  "gender": "female",
  "address": "12 MG Road",
  "position": "pharmacist",
  "status": "active",
  "join_date": "2024-06-01",
  "employee_code": null,
  "user_id": null,
  "pan": "ABCDE1234F",
  "aadhaar": "123412341234",
  "pharmacist_registration_no": "KA-12345",
  "pharmacist_registration_expiry": "2027-03-31",
  "bank_account_holder": "Anita Sharma",
  "bank_account_number": "1234567890",
  "bank_ifsc": "HDFC0001234",
  "bank_upi_id": "anita@hdfc",
  "emergency_name": "Ravi Sharma",
  "emergency_phone": "+919811112222",
  "emergency_relation": "spouse"
}
```

**201 data:** Employee detail (Aadhaar masked in the same rules as GET list if the client is not Owner — v1: full to `employees` permission holders).

#### `PATCH /employees/{employee_id}?location_id=`

Partial update of FR-6–FR-14 fields. Setting `user_id` to another User already linked → 409.

#### `GET /employees/pharmacist-eligible?location_id=`

Intended for `statutory-registers`. Requires plan `employees` **or** `statutory-registers` (either module unlocked) and a caller who may clock duty (Owner / Manager / Pharmacist with `statutory-registers` permission). **200 data:**

```json
{
  "items": [
    {
      "employee_id": "e_01",
      "full_name": "Anita Sharma",
      "pharmacist_registration_no": "KA-12345",
      "pharmacist_registration_expiry": "2027-03-31"
    }
  ]
}
```

Does not include PAN, bank, or documents.

#### `POST /employees/{employee_id}/photo/upload-url?location_id=`

**Request:** `{ "content_type": "image/jpeg", "byte_size": 120000 }`  
**200 data:** `{ "upload_url": "https://...", "object_key": "tenants/.../employees/.../photo", "expires_in_seconds": 600 }`

#### `PUT /employees/{employee_id}/photo?location_id=`

**Request:** `{ "object_key": "tenants/..." }` after PUT to the presigned URL.

#### `POST /employees/{employee_id}/documents/upload-url?location_id=`

**Request:** `{ "content_type": "application/pdf", "byte_size": 800000, "type": "pharmacist_registration", "file_name": "reg.pdf" }`

#### `POST /employees/{employee_id}/documents?location_id=`

**Request:** `{ "object_key", "type", "file_name" }`  
**201 data:** EmployeeDocument.

#### `DELETE /employees/{employee_id}/documents/{document_id}?location_id=`

Removes metadata and object. **200** `{ "deleted": true }`.

#### `GET /employees/export.csv?location_id=&position=&status=&q=`

`Content-Type: text/csv; charset=utf-8`. Same filters as list. FR-21 columns.

#### `GET /employees/{employee_id}/id-card.pdf?location_id=`

`Content-Type: application/pdf`. FR-22. 404 if Employee missing.

### 7.2 Events

| Event                               | Payload                                             |
| ----------------------------------- | --------------------------------------------------- |
| `employees.employee.created`        | `{ tenant_id, location_id, employee_id }`           |
| `employees.employee.updated`        | `{ tenant_id, location_id, employee_id, fields[] }` |
| `employees.employee.status.changed` | `{ tenant_id, location_id, employee_id, status }`   |
| `employees.employee.user.linked`    | `{ tenant_id, location_id, employee_id, user_id }`  |
| `employees.employee.user.unlinked`  | `{ tenant_id, location_id, employee_id, user_id }`  |

UI: `'employees.list.changed': { location_id: string }`.

### 7.3 UI (`modules/employees/ui`)

- Route: `/account/employees`. Starter lock via `plan-gating` when Free.
- Header: headcount tiles + horizontal composition bars (active by position) with numeric labels.
- Toolbar: position filter, status filter, search, **Export CSV**, **Add Employee**.
- Table: photo, name, position, status, phone, pharmacist badge, linked login chip.
- Form sections: photo, personal, employment, PAN / Aadhaar, documents, salary bank, emergency contact, optional User picker (`manage-users` list of unlinked Users — display login_id only).
- Actions: Save, Generate ID card (blob download / print dialog), no “Run payroll”.
- i18n keys; English default.

## 8. User Stories & Acceptance Criteria (Given/When/Then, 2-3 each)

### US-1: Owner adds a registered pharmacist on Starter

**Given** a **Pharmacy** on Starter and a caller with `employees` permission  
**When** they submit Add Employee with `full_name`, `phone`, `position=pharmacist`, `pharmacist_registration_no`, `pharmacist_registration_expiry`  
**Then** the system creates an **Employee** with an auto `employee_code`, `status=active`, `pharmacist_eligible=true`, and the composition bar for pharmacist increases by 1.

**Given** that Employee  
**When** `statutory-registers` calls `GET /employees/pharmacist-eligible`  
**Then** the Employee appears with registration number and expiry, and no PAN or bank fields.

**Given** the same body without `pharmacist_registration_expiry` while `pharmacist_registration_no` is set  
**When** they submit  
**Then** the API returns 422 `PHARMACIST_REG_INCOMPLETE` and no row is created.

### US-2: HR is distinct from login; CSV and ID card

**Given** an Employee with no `user_id`  
**When** the Owner exports CSV  
**Then** the file contains that person and the `user_id` column is empty, Aadhaar is masked, and account number is absent.

**Given** an Employee with photo and a pharmacy logo on Account  
**When** the Owner opens Generate ID card  
**Then** a PDF downloads showing name, position, employee_code, shop name, photo, and logo, and does not show Aadhaar or PAN.

**Given** an Employee linked to User `u_01`  
**When** the Owner sets Employee `status=separated`  
**Then** the Employee remains listed as separated, headcount active decreases, pharmacist-eligible omits them, and User `u_01` is still active until Manage Users changes it.

### US-3: Free plan cannot use the directory

**Given** a **Pharmacy** on Free  
**When** any client calls `GET /employees?location_id=`  
**Then** the API returns 403 `PLAN_REQUIRED` with `required_plan: "starter"` and no Employee PII.

**Given** Free  
**When** the Owner opens `/account/employees`  
**Then** the UI shows a lock and a paywall naming Starter, not a blank table of real staff.

**Given** Starter and a caller with only Cashier permissions (`employees` false)  
**When** they `POST /employees`  
**Then** the API returns 403 `FORBIDDEN`.

## 9. Edge Cases & Error Handling

| Case                                  | Behaviour                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Missing `location_id`                 | 400 `LOCATION_REQUIRED`                                                                                                          |
| Free plan                             | 403 `PLAN_REQUIRED`                                                                                                              |
| Duplicate `employee_code`             | 409 `EMPLOYEE_CODE_TAKEN`                                                                                                        |
| Duplicate User link                   | 409 `USER_ALREADY_LINKED` or `EMPLOYEE_ALREADY_LINKED`                                                                           |
| Presigned key mismatch                | 400 `UPLOAD_KEY_INVALID`                                                                                                         |
| File too large / bad type             | 400 `VALIDATION_ERROR`                                                                                                           |
| 21st document                         | 409 `DOCUMENT_LIMIT`                                                                                                             |
| Hard delete attempted                 | No route; 405 if clients guess `DELETE /employees/{id}`                                                                          |
| Inactive pharmacist                   | Omitted from pharmacist-eligible                                                                                                 |
| Expired registration date in the past | Still eligible if number present and active (licence desk alerts are `statutory-registers`; this module does not block clock-in) |
| `expenses` salary entry               | Unrelated; this module does not post books                                                                                       |
| CSV of another tenant                 | Impossible; tenant from session                                                                                                  |

## 10. Open Questions / Assumptions

1. **Assumption:** No Employee hard delete in v1; `separated` is the terminal status.
2. **Assumption:** Position enum is `owner | manager | pharmacist | cashier | helper | other` to feed composition bars. These are HR labels, not **User** roles.
3. **Assumption:** CSV is export-only. There is no Employee CSV import in v1 (opening stock CSV is `inventory`).
4. **Assumption:** Aadhaar masked in CSV and lists; full Aadhaar only on authorised GET detail.
5. **Assumption:** Bank account number omitted from CSV; IFSC / UPI allowed.
6. **Assumption:** Pharmacist registration expiry in the past does not remove eligibility here; `statutory-registers` licence desk may still alert.
7. **Assumption:** `GET /employees/pharmacist-eligible` may be called with `statutory-registers` permission so duty UI works without granting full HR PII.
8. **Assumption:** ID card uses Account logo when present; missing logo / photo is a text-only card, not an error.
9. **Assumption:** `employee_code` pattern `EMP-0001` per tenant, not per location (v1 is one location per tenant).
10. Vague “role-composition bars (not salary runs)” is interpreted as counts by `position` among active staff, never rupees or payroll batches.
