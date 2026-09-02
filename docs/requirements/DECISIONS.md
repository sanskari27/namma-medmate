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
| D-006 | Production NFR baseline | Define hosting, residency, platforms, scale, DR, retention, portability, localization, and environments. | Open | M12-S01 | Product owner |
| D-007 | Canonical branch limits | Resolve Starter 1 versus 2 and Pro unlimited versus 5 branches across product sources. | Closed | M2-S05 | Product owner |
| D-008 | Growth online-store entitlement | Confirm ecommerce is Phase 2 and remove it from Phase 1 Growth entitlements, or specify Phase 1 behavior. | Closed | M2-S05 | Product owner |
| D-009 | Kiosk scope | Confirm whether Kiosk is only a branch classification or includes a Phase 1 self-order workflow. | Closed | M2-S07 | Product owner |
| D-010 | Scheme and offer rule engine | Provide precedence, eligibility, stacking, date, quantity, tax, return, and approval rules. | Closed | M6-S06 | Product owner |
| D-011 | Medication safety source and policy | Approve the clinical data source, allergy/interaction matching, severity, unavailable-data behavior, override authority, and audit policy. | Closed | M3-S08 | Product and clinical owner |
| D-012 | Loyalty policy | Define eligible spend/products, earn rate, point value, rounding, redemption limits, expiry, return reversal, downgrade behavior, and adjustment authority. | Closed | M3-S09 | Product owner |
| D-013 | DPDP operational policy | Define the data inventory, purpose/minimization, notice/consent, principal requests, correction, export, erasure, legal-retention exceptions, grievance, breach, deadlines, and accountable roles required for the stated India DPDP baseline. | Open | M1-S09 | Product, legal, and security owner |

## Closed-decision record format

Record the chosen behavior, rejected alternatives, effective date, owner, and
affected story IDs below the table. Never rewrite product source history.

## D-001 — MASTER impersonation is not audit-logged

**Chosen:** MASTER may start and exit a tenant-user support impersonation session. Start/stop and acting identity are **not** written to the audit trail. The session lasts until explicit exit (no timed auto-expiry). Nested impersonation remains forbidden.

**Rejected:** Mandatory audit of impersonation start/stop/acting identity; timed max session length (e.g. 30 min / 1 hr).

**Effective:** 2026-09-03  
**Owner:** Product owner  
**Affected:** M1-S08

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

## D-015 — Five-minute idle signs out (PIN picker relogin)

**Chosen:** After five minutes of inactivity on a PIN-enrolled session, the till or HQ console **signs out** (revokes the access session, keeps saved people). There is no idle lock overlay and no same-session PIN unlock. Relogin is the saved-login picker plus PIN (or email+password for another account). PIN enroll still happens once after first password login.

**Rejected:** Five-minute idle PIN lock that keeps the session; a second 55-minute idle logout on top of lock.

**Effective:** 2026-09-02  
**Owner:** Product owner  
**Affected:** M1-S10
