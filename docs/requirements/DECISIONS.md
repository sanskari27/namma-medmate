# Product decisions

Agents must not resolve these questions. An affected story remains `blocked`
until the product owner changes the decision to `Closed` and records the
chosen behavior and date.

| ID | Decision | Question | Status | Blocks | Owner |
|---|---|---|---|---|---|
| D-001 | MASTER impersonation audit policy | Should impersonation remain unlogged, or must start/stop and acting identity be audited? | Open | M1-S08 | Product owner |
| D-002 | Family credit model | Use one family credit pool or individual limits with family-wide payoff visibility? | Open | M3-S10 | Product owner |
| D-003 | Prescription reference retention | Confirm the Phase 1 prescription-reference validity and archive period. | Open | M7-S04 | Product owner |
| D-004 | Expense approval | Must expense recording use approval thresholds, and which role approves? | Open | M8-S02 | Product owner |
| D-005 | Starter versus Growth reporting | Finalize the report and analytics entitlement split. | Open | M9-S05 | Product owner |
| D-006 | Production NFR baseline | Define hosting, residency, platforms, scale, DR, retention, portability, localization, and environments. | Open | M12-S01 | Product owner |
| D-007 | Canonical branch limits | Resolve Starter 1 versus 2 and Pro unlimited versus 5 branches across product sources. | Open | M2-S05 | Product owner |
| D-008 | Growth online-store entitlement | Confirm ecommerce is Phase 2 and remove it from Phase 1 Growth entitlements, or specify Phase 1 behavior. | Open | M2-S05 | Product owner |
| D-009 | Kiosk scope | Confirm whether Kiosk is only a branch classification or includes a Phase 1 self-order workflow. | Open | M2-S07 | Product owner |
| D-010 | Scheme and offer rule engine | Provide precedence, eligibility, stacking, date, quantity, tax, return, and approval rules. | Open | M6-S06 | Product owner |
| D-011 | Medication safety source and policy | Approve the clinical data source, allergy/interaction matching, severity, unavailable-data behavior, override authority, and audit policy. | Open | M3-S08 | Product and clinical owner |
| D-012 | Loyalty policy | Define eligible spend/products, earn rate, point value, rounding, redemption limits, expiry, return reversal, downgrade behavior, and adjustment authority. | Open | M3-S09 | Product owner |
| D-013 | DPDP operational policy | Define the data inventory, purpose/minimization, notice/consent, principal requests, correction, export, erasure, legal-retention exceptions, grievance, breach, deadlines, and accountable roles required for the stated India DPDP baseline. | Open | M1-S09 | Product, legal, and security owner |

## Closed-decision record format

Record the chosen behavior, rejected alternatives, effective date, owner, and
affected story IDs below the table. Never rewrite product source history.

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
