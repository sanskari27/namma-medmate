# Product decisions

Agents must not resolve these questions. An affected story remains `blocked`
until the product owner changes the decision to `Closed` and records the
chosen behavior and date.

| ID | Decision | Question | Status | Blocks | Owner |
|---|---|---|---|---|---|
| D-001 | MASTER impersonation audit policy | Should impersonation remain unlogged, or must start/stop and acting identity be audited? | Closed | M1-S08 | Product owner |
| D-002 | Family credit model | Use one family credit pool or individual limits with family-wide payoff visibility? | Closed | M3-S10 | Product owner |
| D-003 | Prescription reference retention | Confirm the Phase 1 prescription-reference validity and archive period. | Closed | M7-S04 | Product owner |
| D-004 | Expense approval | Must expense recording use approval thresholds, and which role approves? | Closed | M8-S02 | Product owner |
| D-005 | Starter versus Growth reporting | Finalize the report and analytics entitlement split. | Closed | M9-S05 | Product owner |
| D-006 | Production NFR baseline | Define hosting, residency, platforms, scale, DR, retention, portability, localization, and environments. | Closed | M12-S01 | Product owner |
| D-007 | Canonical branch limits | Resolve Starter 1 versus 2 and Pro unlimited versus 5 branches across product sources. | Closed | M2-S05 | Product owner |
| D-008 | Growth online-store entitlement | Confirm ecommerce is Phase 2 and remove it from Phase 1 Growth entitlements, or specify Phase 1 behavior. | Closed | M2-S05 | Product owner |
| D-009 | Kiosk scope | Confirm whether Kiosk is only a branch classification or includes a Phase 1 self-order workflow. | Closed | M2-S07 | Product owner |
| D-010 | Scheme and offer rule engine | Provide precedence, eligibility, stacking, date, quantity, tax, return, and approval rules. | Closed | M6-S06 | Product owner |
| D-011 | Medication safety source and policy | Approve the clinical data source, allergy/interaction matching, severity, unavailable-data behavior, override authority, and audit policy. | Closed | M3-S08 | Product and clinical owner |
| D-012 | Loyalty policy | Define eligible spend/products, earn rate, point value, rounding, redemption limits, expiry, return reversal, downgrade behavior, and adjustment authority. | Closed | M3-S09 | Product owner |
| D-013 | DPDP operational policy | Define the data inventory, purpose/minimization, notice/consent, principal requests, correction, export, erasure, legal-retention exceptions, grievance, breach, deadlines, and accountable roles required for the stated India DPDP baseline. | Closed | M1-S09 | Product, legal, and security owner |

## Closed-decision record format

Record the chosen behavior, rejected alternatives, effective date, owner, and
affected story IDs below the table. Never rewrite product source history.

## D-001 — MASTER impersonation is not audit-logged

**Chosen:** MASTER may start and exit a tenant-user support impersonation session. Start/stop and acting identity are **not** written to the audit trail. The session lasts until explicit exit (no timed auto-expiry). Nested impersonation remains forbidden.

**Rejected:** Mandatory audit of impersonation start/stop/acting identity; timed max session length (e.g. 30 min / 1 hr).

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M1-S08

## D-006 — Production NFR baseline (Phase 1)

**Chosen:** Phase 1 production is a single EC2 in ap-south-1 with RDS Postgres 16, ElastiCache Redis, and host Nginx TLS. All application data, backups, logs, and object files stay in ap-south-1. Named processors may hold copies as those vendors require: Resend (email), Cashfree (payments), Meta WhatsApp. Clients are browser-only (dispensary SPA, admin SPA, kiosk in the browser). The till is a shop PC or tablet browser; invoice copy is A4 PDF. Thermal printers, cash drawers, and hardware scanners are not in this baseline. Scale is tens of pharmacies and a few concurrent tills per shop, with no published peak-TPS number. Availability is best-effort single AZ; deploys and Flyway restarts may take the shop offline for minutes. RDS keeps 7-day automated backups and deletion protection. KYC, licence, expense, and prescription evidence files live in private S3 in ap-south-1 with versioning and no public access (not the EC2 bind mount). Database RPO is about 24 hours; RTO is hours (restore RDS and rebuild or restart EC2). File restore uses S3 versions. UI is English only; money is INR paise; time persists UTC and displays IST. While a tenant is active, keep business records. Personal-data access, export, erasure, and churn deletion wait on D-013. Environments are local/docker (never RDS or ElastiCache) and prod (SSM secrets). LocalEnvironmentGuard stays.

**Rejected:** Multi-AZ or managed compute as the Phase 1 hosting baseline; a DR copy in another region; leaving evidence files on the EC2 disk without S3; a 99.9% availability promise; native or PWA clients; Hindi or other locale packs; a separate staging stack; inventing DPDP principal-request or churn-deletion rules in this decision.

**Effective:** 2026-09-20  
**Owner:** Product owner  
**Affected:** M12-S01

## D-013 — Phase 1 DPDP operational policy

**Chosen:** Phase 1 ships staff-mediated access, correction, export, and erasure in the product (no principal login, no magic-link portal, no extra consent UI). OWNER records and fulfills tenant shop principals (customers, doctors, suppliers, staff). MASTER records and fulfills MASTER accounts and OWNER/tenant KYC held to run the SaaS. Pharmacy OWNER is Fiduciary for tenant shop data; Namma MedMate is Fiduciary for MASTER accounts and SaaS KYC. Identity: OWNER/MASTER attests out-of-band (method text + attester + timestamp) before the clock starts. Deadline is 30 calendar days from verified accept. Export/access is JSON of that principal’s current profile fields plus related invoice/register IDs — not a GST/NDPS line dump. Correction changes current profile fields only; posted invoices, GST, NDPS, audit, and S3 evidence objects are never rewritten. Erasure refuses to alter those legal facts; optional CRM fields (email, DOB, gender, address, blood group, allergies, chronic conditions) may be blanked; name/phone stay if they appear on a legal invoice/register, otherwise they become a stable “erased” placeholder with the same id. Staff/OWNER/MASTER erasure revokes sessions and saved devices, marks the user inactive, blanks optional profile fields, and keeps the user id on audit/approval rows; KYC evidence required to run/close the account is kept. Tenant churn does not auto-wipe personal data. Request rows themselves are kept indefinitely. Walk-in with no profile: OWNER may create a staff-managed customer using existing name+phone fields, then process. No extra child/guardian rules. Logs/notifications keep today’s feature payloads; never log passwords, PINs, tokens, or KYC file bytes. Impersonation stays unlogged (D-001). Grievance and breach are ops runbook only (no in-app module; product copy is “contact platform ops”). No campaign consent flag.

**Rejected:** Public self-service or new principal login; platform as Fiduciary for shop customer data; rewriting historical invoices/registers; automatic churn wipe; in-app grievance/breach; extra consent UI; inventing a grievance email in the product.

**Effective:** 2026-09-20  
**Owner:** Product owner  
**Affected:** M1-S09

## D-002 — Family credit uses individual limits

**Chosen:** Each family member keeps an individual credit limit and ledger. Family views show combined payoff/visibility across members; invoices and payments stay attributable to the member who incurred them. There is no single shared family credit pool.

**Rejected:** One shared family credit pool and one family-wide limit; OWNER chooses shared vs individual per family at link time.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M3-S10

## D-007 — Canonical branch limits

**Chosen:** Branch caps are Free 1 / Starter 2 / Growth 3 / Pro 5. MASTER may override the branch cap per tenant.

**Rejected:** Starter 1 branch; Pro unlimited branches (product-compiled matrix).

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M2-S05

## D-008 — Online store is Phase 2

**Chosen:** Ecommerce / online store / orders are Phase 2. Remove online-store from Phase 1 Growth entitlements. Growth Phase 1 keeps its other named entitlements (reports, CRM & CA sharing, reorder & distributors, user limits) without an online-store module flag.

**Rejected:** Phase 1 Growth includes a real online-store/orders module; Phase 1 entitlement stub that is hidden until later stories.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M2-S05

## D-009 — Kiosk includes Phase 1 self-order workflow

**Chosen:** Kiosk is not only a branch classification. Phase 1 Pro includes a self-order kiosk workflow for Kiosk-typed branches.

**Rejected:** Branch type label only (Retail / Kiosk) with no self-order workflow in Phase 1.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M2-S07

## D-003 — Prescription reference validity 6 months

**Chosen:** A prescription reference is valid for **6 months** from the issue/attach date used on the sale, then auto-archives. Archived references remain readable for history but are not selectable for new sales.

**Rejected:** 12-month validity; indefinite active references.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M7-S04

## D-004 — Expenses post without approval threshold

**Chosen:** Accountant and OWNER may record and post expenses immediately. Phase 1 has **no** expense approval threshold and does not route expense creation through M1-S07.

**Rejected:** Approval above a rupee threshold; all expenses require approval before posting.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M8-S02

## D-005 — Plan-tier report matrix locked

**Chosen:**
- **Free:** Day Book, Sales Summary, Purchase Summary.
- **Starter:** Free set plus Expense Summary and basic Expiry/Near-Expiry.
- **Growth and Pro:** Starter set plus analytics/charts, AR/AP aging, GST reports, and custom report builder.

Denied reports show an upgrade explanation without leaking results. Downgrade preserves historical data but removes gated access.

**Rejected:** Zero reporting on Free/Starter; moving custom builder or GST reports into Starter.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M9-S05

## D-010 — Scheme and offer rules

**Chosen:**
- **Precedence:** highest priority number wins among eligible offers.
- **Stacking:** at most one offer per invoice line.
- **Tax:** discount applied before GST on the discounted taxable base.
- **Returns:** reverse the proportional snapshotted line benefit from the original invoice; no separate points-style clawback engine beyond that snapshot.
- **Configure / publish:** OWNER or a role OWNER has approved for offer management; publishing does not use a separate M1-S07 threshold workflow in Phase 1.
- Expired or inactive offers never apply; applied benefits are snapshotted on invoice lines.

**Rejected:** Newest-wins precedence; multiple stacked offers per line; discount after GST; mandatory M1-S07 publish approval by discount %.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M6-S06

## D-011 — Phase 1 medication safety (tenant data, warn-only)

**Chosen:**
- **Source (Phase 1):** no third-party clinical vendor. Match tenant-entered customer allergy text against tenant product master fields (name, generic/brand, composition). Drug–drug coverage is limited to **duplicate same-composition / same-active therapy** warnings from product master data. Full curated interaction databases are Phase 2.
- **Severity:** warn-only; never hard-block sale completion.
- **Unavailable / unmapped data:** allow sale with a visible “not checked” / incomplete-check state; never present unchecked as safe.
- **Acknowledge to proceed:** any billing role that can complete the sale, with a mandatory reason.
- **Audit:** acknowledgment/override is audit-logged (who, when, customer, medicines, matched warning, reason).

**Rejected:** Licensed external interaction dataset in Phase 1; hard-block on critical severity; block completion when data unavailable; Pharmacist-only acknowledgment without cashier path.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M3-S08

## D-012 — Loyalty earn and redeem policy

**Chosen:**
- **Plan gate:** Growth and higher only.
- **Earn:** 1 point per ₹100 of taxable amount **actually paid** on eligible completed sales (khata/unpaid credit portion does not earn until paid).
- **Redeem:** 1 point = ₹1 INR; max **20%** of the invoice grand total; balance cannot go negative.
- **Rounding:** nearest point on earn.
- **Expiry:** never.
- **Eligible products:** all saleable products on entitled plans.
- **Returns:** reverse earned and redeemed points tied to the source sale.
- **Plan downgrade below Growth:** freeze earn and redeem; retain existing balance.
- **Manual adjustment:** OWNER only; every balance change is an immutable ledger entry.

**Rejected:** Earn on unpaid khata; points expiry; redemption above 20%; non-OWNER manual adjustments; excluding controlled products by default.

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M3-S09

## D-014 — Saved PIN login (device-scoped staff picker)

**Chosen:** After email+password and PIN enroll, this browser keeps that person as a saved login. Several people per device. Tap a saved person and enter the six-digit PIN to start a **new** session (the one-active-session rule still applies). Sign out ends the session and keeps saved people. A binding lasts 30 days from the last successful PIN or password login on that device (sliding). Three failed PINs drop that person on this device; password login still works. Password change, email reset, and admin reset revoke all of that user’s saved devices. PIN is accepted only with a device binding. WhatsApp OTP is not a Phase 1 login factor. Owner enable/remove in Manage Users waits for M1-S04.

**Rejected:** Last-user-only remembered account; PIN as a global password from any browser; WhatsApp OTP as a Phase 1 login factor.

**Superseded idle behavior:** See D-015.

**Effective:** 2026-09-02  
**Owner:** Product owner  
**Affected:** M1-S10

## D-015 — Five-minute idle PIN lock (revised)

**Chosen:** After five minutes of inactivity on a PIN-enrolled session, the till or HQ console shows a **full-screen PIN lock** and keeps the server session. Correct PIN resumes the same session, branch, and in-progress work. Three failed unlock PINs revoke the session and return to the saved-login picker. Explicit Sign out still revokes the session and keeps saved people (D-014). If the lock is left abandoned for **four hours**, or the access session is otherwise dead (401 `UNAUTHORIZED` / `SESSION_REVOKED`), the client clears local session and returns to the login picker with a short reason. PIN enroll still happens once after first password login. Access JWT TTL matches the server session TTL so an active shift does not ghost-fail while the UI still looks signed in.

**Rejected:** Five-minute idle hard sign-out with no lock overlay (2026-09-02 choice); idle lock without a long-abandon or dead-session recovery path.

**Effective:** 2026-09-09 (revises 2026-09-02)  
**Owner:** Product owner  
**Affected:** M1-S02, M1-S10  
**Supersedes:** Prior D-015 idle-sign-out wording; M1-S10-AC04b idle-sign-out expectation follows this revision.
