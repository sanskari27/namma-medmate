# Requirement Doc: Admin Finance — Namma SaaS GST & Ledger (`admin-finance`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`.  
**Source:** feature catalogue §4.6, §2.4 SaaS GST, §4.3 billing/future GMV, §6 HQ packaging row; glossary; decomposition #37.  
**Sidebar:** **Finance**. Write: Super admin, Finance. Read: Operations (collection status). Support/Compliance: no ledger mutations.

This is **Namma the software vendor** collecting SaaS fees (GST 18% SAC 9983), **not** the chemist’s GSTR. A Namma admin is not a pharmacy user. Actions save immediately. Shop-floor GMV settlement is **not in v1** (document as future, flag off).

---

## 1. Summary

HQ **Finance** owns Namma’s books for **subscription invoices**: collection status, GST on SaaS (SAC 9983), **refunds of SaaS fees**, a **ledger with running balance**, and **GSTR-1 / GSTR-3B** for Namma’s own outward SaaS tax. Invoices and Cashfree payments are sourced from `saas-billing` / `admin-saas-crm`; this module posts the vendor ledger, issues SaaS credit notes for refunds, and prepares Namma’s GST returns. Pharmacy GSTR prepare remains `books-gst`. Future GMV (Namma Cashfree → chemist T+1/weekly, minus nothing) is flagged off and must not ship as a working settlement product.

---

## 2. Scope (in / out)

**In scope**

- SaaS invoice collection workspace (paid / due / overdue), aligned with CRM Billing totals.
- GST on subscriptions: 18%, SAC **9983**, shown on every SaaS invoice and credit note.
- Refunds of SaaS fees (full or remaining unrefunded amount) → SaaS credit note + ledger + invoice status `refunded` (or partial — §10).
- Platform ledger with **running balance** (per tenant AR and a Namma cash/Cashfree control).
- GSTR-1 and GSTR-3B **for Namma’s SaaS tax** (JSON + Excel download). Place of supply from pharmacy GSTIN vs Namma GSTIN (`admin-platform-settings`).
- Mark paid offline is implemented in `admin-saas-crm`; this module shows the resulting ledger post and may deep-link.
- Future GMV settlement section: visible copy “Not in v1” and disabled if feature flag `gmv_cashfree` is off (always off until product exists).

**Out of scope**

- Chemist GSTR-1/2B/3B, IRN, GSTN credentials — `books-gst`.
- Chemist P&L, trial balance, period lock — `books-gst`.
- Cashfree keys UI — `admin-platform-settings`.
- Cashfree checkout UX — `saas-billing`.
- Coupon/plan UI — `admin-saas-crm`.
- Shop-floor UPI/Card GMV capture, T+1 payout engine — **not built in v1**.
- Payroll, TDS/TCS withhold on SaaS — not in v1.
- Attachable add-on SKUs.

---

## 3. Dependencies

| Module                    | Need                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `saas-billing`            | `SaasInvoice` paid/issued/overdue, Cashfree payment ids, amounts, tenantId, period. Webhook already marked paid. |
| `admin-saas-crm`          | Mark paid offline, dunning status, refund request may originate here or Finance. Shared invoice ids.             |
| `admin-platform-settings` | Namma GSTIN, legal name, address, state code; `gmv_cashfree` flag (off).                                         |
| `tenancy`                 | Pharmacy GSTIN + state (place of supply).                                                                        |
| `audit`                   | Refunds, GSTR generate, manual ledger notes.                                                                     |
| `auth`                    | HQ JWT.                                                                                                          |

**External:** none for GSTR _prepare_ (JSON/Excel). Filing on GSTN is **outside** Namma (Namma’s CA files), same pattern as chemists.

---

## 4. Functional Requirements (FR-n: The system shall ...)

- FR-1: The system shall show Finance home tiles for the selected period: SaaS collected, due, overdue, refunded, GST collected (18% of taxable on paid invoices minus GST on credit notes).
- FR-2: The system shall list SaaS invoices with status, tenant, SAC 9983, taxable, GST, total, paid via (`cashfree` / `offline` / empty), due date.
- FR-3: The system shall open an invoice drawer consistent with `admin-saas-crm` (GST @18% SAC 9983) plus **Refund** for Finance/Super admin.
- FR-4: The system shall **refund** a paid SaaS invoice (full remaining amount) by posting a SaaS **credit note**, reversing GST 18% SAC 9983, crediting the tenant’s SaaS AR/credit, and setting invoice `refunded` when fully reversed. Offline and Cashfree-paid invoices both refund in **ledger**; Cashfree payment-gateway refund is out of v1 unless `saas-billing` already exposes it (§10).
- FR-5: The system shall refuse refund on `void`, unpaid, or already fully refunded invoices (`409 INVOICE_NOT_REFUNDABLE`).
- FR-6: The system shall maintain a **ledger** of lines: invoice issue (Dr AR, Cr Income, Cr GST output), payment (Dr Cashfree/Cash, Cr AR), refund (reverse), SaaS referral credit (Cr tenant SaaS wallet — contra AR), with a **running balance** per account and a platform trial-balance check (AR + cash − output GST − income − wallet liability = 0 in the SaaS subset).
- FR-7: The system shall show running balance on the ledger table (sorted by time ascending within account).
- FR-8: The system shall prepare **GSTR-1** for Namma: B2B rows (pharmacy GSTIN present) and B2C small (if GSTIN missing — should be rare; still listed) for SaaS invoices in the period, HSN/SAC **9983**, tax 18%, split CGST+SGST or IGST from place of supply.
- FR-9: The system shall prepare **GSTR-3B** summary for Namma: outward taxable, GST, credit notes, net tax on SaaS only — **not** pharmacy shop sales.
- FR-10: The system shall download GSTR-1 and GSTR-3B as **JSON** (GSTN schema subset for outward supplies) and **Excel**. This is prepare-only; Namma’s CA files on GSTN.
- FR-11: The system shall use Namma GSTIN from `admin-platform-settings`. If unset, GSTR download returns `409 PLATFORM_GSTIN_MISSING`.
- FR-12: The system shall compute place of supply: pharmacy GSTIN state vs Namma state → IGST if different; CGST+SGST if same.
- FR-13: The system shall **not** include chemist POS bills, khata, or shop GSTR in these returns.
- FR-14: The system shall show a **Future: GMV settlement** panel stating settlement is T+1 or weekly, Namma merchant, tenant-tagged, **no GMV take-rate**, and that it is **off / not in v1**. Controls disabled. No payout rows.
- FR-15: The system shall filter ledger by tenant, period, type (`invoice` / `payment` / `refund` / `credit`).
- FR-16: The system shall export ledger CSV for the filter.
- FR-17: The system shall deep-link tenant to `admin-saas-crm` Account-360 and `admin-tenants` drawer.
- FR-18: The system shall save refund reason immediately on submit and audit actor, invoice, amounts, before/after status.

---

## 5. Non-Functional Requirements

- NFR-1: Ledger page p95 ≤ 500 ms per page.
- NFR-2: Refund is idempotent on `idempotencyKey`.
- NFR-3: GSTR JSON generation p95 ≤ 3 s for 10,000 invoices.
- NFR-4: Money integer paise; GST 18% rounded to paise using the same half-up as `saas-billing`.
- NFR-5: English / i18n-ready.
- NFR-6: No GSTN secrets for pharmacies appear on this screen. Namma GSTIN is platform profile, not a chemist credential.
- NFR-7: Finance JWTs only for refund and GSTR generate; other HQ roles `403` on those POSTs.

---

## 6. Data Model / Entities

### `NammaSaasLedgerLine` (owned)

| Field                      | Type          | Notes                                                                                                                                    |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `lineId`                   | UUID          |                                                                                                                                          |
| `at`                       | timestamptz   |                                                                                                                                          |
| `tenantId`                 | UUID nullable | null = platform control                                                                                                                  |
| `account`                  | enum          | `saas_ar` `cashfree_clearing` `cash_offline` `saas_income` `gst_output_cgst` `gst_output_sgst` `gst_output_igst` `saas_credit_liability` |
| `debitPaise` `creditPaise` | int           | one side non-zero                                                                                                                        |
| `runningBalancePaise`      | int           | per (`tenantId`,`account`) after this line                                                                                               |
| `sourceType`               | enum          | `invoice` `payment` `refund` `referral_credit`                                                                                           |
| `sourceId`                 | UUID          | invoiceId / paymentId / creditNoteId / referralId                                                                                        |
| `memo`                     | text          |                                                                                                                                          |

Double-entry: each source posts ≥ 2 lines that balance.

### `SaasCreditNote` (owned here; invoice in `saas-billing`)

| Field                                  | Type   | Notes                          |
| -------------------------------------- | ------ | ------------------------------ |
| `creditNoteId`                         | UUID   |                                |
| `invoiceId`                            | UUID   | original SaaS invoice          |
| `number`                               | string | CN prefix, unique per Namma FY |
| `taxablePaise` `gstPaise` `totalPaise` | int    |                                |
| `sac`                                  | `9983` |                                |
| `reason`                               | text   |                                |
| `createdByHqUserId` `createdAt`        |        |                                |

### Referenced

`SaasInvoice`, Cashfree payment — `saas-billing`. Platform GSTIN — `admin-platform-settings`. Pharmacy GSTIN — `tenancy` / `go-live-kyc`.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/finance`. HQ JWT.

### 7.1 Home

`GET /admin/finance/summary?period=2026-08`

```json
{
  "success": true,
  "data": {
    "collectedPaise": 1768820,
    "duePaise": 176882,
    "overduePaise": 82482,
    "refundedPaise": 0,
    "gstCollectedPaise": 269820,
    "gmvSettlement": { "enabled": false, "v1Shipped": false }
  }
}
```

### 7.2 Invoices

`GET /admin/finance/invoices?status=&tenantId=&period=&cursor=`

`GET /admin/finance/invoices/{invoiceId}`

### 7.3 Refund

`POST /admin/finance/invoices/{invoiceId}/refund`

```json
{
  "reason": "Service unused — owner closed shop",
  "amountPaise": 176882,
  "idempotencyKey": "uuid"
}
```

v1: `amountPaise` must equal remaining refundable total (`409 PARTIAL_NOT_IN_V1` if less — §10).

`200`:

```json
{
  "success": true,
  "data": {
    "creditNoteId": "uuid",
    "number": "SCN-25-0008",
    "invoiceStatus": "refunded",
    "taxablePaise": 149900,
    "gstPaise": 26982,
    "totalPaise": 176882,
    "sac": "9983"
  }
}
```

### 7.4 Ledger

`GET /admin/finance/ledger?tenantId=&account=&from=&to=&cursor=&limit=50`

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "lineId": "uuid",
        "at": "2026-08-01T06:00:00Z",
        "tenantId": "uuid",
        "account": "saas_ar",
        "debitPaise": 176882,
        "creditPaise": 0,
        "runningBalancePaise": 176882,
        "sourceType": "invoice",
        "sourceId": "uuid",
        "memo": "Growth Aug 2026"
      }
    ],
    "nextCursor": null
  }
}
```

`GET /admin/finance/ledger.csv`

### 7.5 GSTR

`GET /admin/finance/gstr1?period=2026-08` → JSON body (outward supplies, SAC 9983)

`GET /admin/finance/gstr1.xlsx`

`GET /admin/finance/gstr3b?period=2026-08`

`GET /admin/finance/gstr3b.xlsx`

`409 PLATFORM_GSTIN_MISSING` if platform GSTIN absent.

### 7.6 Events

| Event                  | Payload                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `namma.saas.refunded`  | `{ invoiceId, creditNoteId, tenantId, totalPaise, actorHqUserId }` |
| `namma.gstr.generated` | `{ kind: "gstr1"\|"gstr3b", period, actorHqUserId }`               |

Consumers: `saas-billing` (invoice status), `admin-saas-crm` (drawer), `audit`.

Subscribe: `saas.invoice.marked_paid`, Cashfree paid, invoice issued, `saas.referral.credited` → post ledger lines.

### 7.7 UI

`/admin/finance` tabs: Overview · Invoices · Ledger · GSTR · GMV (disabled).

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 GST on SaaS

As Finance, I want every invoice and refund to carry 18% SAC 9983, so that Namma’s GSTR matches collections.

- Given a Growth invoice taxable ₹1,499, When I open the drawer, Then GST ₹269.82, total ₹1,768.82, SAC 9983.
- Given I refund it fully, When GSTR-1 is generated for that month, Then a credit-note row reverses that outward supply.

### US-2 Ledger running balance

As Finance, I want a running AR balance per chemist, so that overdue and collected reconcile.

- Given issue then Cashfree pay of the same total, When I open that tenant’s `saas_ar` ledger, Then running balance returns to 0.
- Given referral ₹500 credit, When I view the ledger, Then `saas_credit_liability` increases 50000 paise (not shop khata).

### US-3 Not pharmacy GSTR

As Finance, I want GSTR-3B here to exclude shop POS, so we do not file chemists’ tax as ours.

- Given pharmacies posted POS bills, When I download Namma GSTR-3B, Then those GMV rows are absent.
- Given platform GSTIN missing, When I download, Then `409 PLATFORM_GSTIN_MISSING`.

### US-4 GMV future

As Super admin, I want GMV settlement documented as off, so that nobody ships shop UPI through Finance in v1.

- Given `gmv_cashfree` flag off, When I open the GMV tab, Then copy states not in v1 and no payout table exists.
- Given flag on, When v1 Finance still has no settlement engine, Then the tab remains non-operational (no T+1 jobs) — product not built.

---

## 9. Edge Cases & Error Handling

| Case                                      | Behaviour                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Double refund                             | Second call same idempotency key returns first CN; different key `409 INVOICE_NOT_REFUNDABLE`.             |
| Refund unpaid invoice                     | `409`.                                                                                                     |
| Invoice issued, GSTIN on pharmacy missing | GSTR-1 B2C bucket; still SAC 9983.                                                                         |
| IGST vs CGST                              | Other state GSTIN → IGST 18%; same state → 9+9.                                                            |
| Cashfree duplicate webhook                | Single payment line.                                                                                       |
| Period with zero invoices                 | Empty GSTR with zeroes, not error.                                                                         |
| Support POST refund                       | `403`.                                                                                                     |
| Ledger out of balance                     | `GET /admin/finance/ledger/health` returns `500 LEDGER_OUT_OF_BALANCE` for HQ Super admin (nightly check). |

---

## 10. Open Questions / Assumptions

1. **Namma GSTR is prepare-only**; CA files on GSTN (same as chemists, different taxpayer).
2. **Full refund only in v1**; partial returns `409 PARTIAL_NOT_IN_V1`.
3. **Cashfree gateway refund** is not required in v1; HQ refund is ledger + credit note. If money must return via Cashfree, ops does it in Cashfree dashboard and still records this refund for GST.
4. **Referral ₹500** posts as credit liability applied to later SaaS invoices (`saas-billing`), visible on this ledger.
5. **GMV settlement** is future; flag exists in `admin-platform-settings`; **no take-rate**; T+1/weekly copy only.
6. **Namma state/GSTIN** live in platform settings, not chemist profile.
7. **Rounding** matches `saas-billing` (GST paise half-up).
8. **No add-on SKUs** appear as invoice lines.
9. Mark paid stays in `admin-saas-crm`; Finance consumes events.
10. SAC is always **9983** (IT services) for subscriptions.
