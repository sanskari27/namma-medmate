# Executive summary — production-readiness + UX-behavior audit

**Date:** 2026-09-15  
**Waves:** 0–6 complete.  
**Verdict: NOT READY** for production launch.

Tracker: **67 done**, **1 blocked** (M1-S09 / D-013), **3 deferred** (M7-S05, M11-S03, M12-S01). Those blocked/deferred items are **not** implementation gaps. The launch problem is that **`done` stories were later rewritten on the floor**: POS, Customers, Inventory Stock, Purchases, Dashboard, Expenses, Aging, and CA pack no longer match the verified story UIs, while many SPA tests still click the old buttons.

Documentation set (this folder):

| File | Contents |
|---|---|
| [`00-charter.md`](00-charter.md) | Mission, counts, wave log |
| [`01-executive-summary.md`](01-executive-summary.md) | This verdict |
| [`02-cross-cutting.md`](02-cross-cutting.md) | Auth, tenancy, money, jobs, compose |
| [`m1.md`](m1.md) … [`m11.md`](m11.md) | Per-epic AC coverage + findings |
| [`03-click-paths.md`](03-click-paths.md) | Primary CTAs |
| [`04-state-and-data-flow.md`](04-state-and-data-flow.md) | Redux, stale matrix, job hrefs |
| [`05-ux-behavior.md`](05-ux-behavior.md) | Journeys |
| [`06-security-isolation.md`](06-security-isolation.md) | Authz, D-001 residual, D-013 blocked |
| [`07-production-ops.md`](07-production-ops.md) | Compose, Terraform, D-006 |
| [`08-fix-backlog.md`](08-fix-backlog.md) | Ordered unique facts |
| [`09-out-of-scope.md`](09-out-of-scope.md) | Blocked / deferred / exclusions |

Server money/stock/complete paths are often still correct. The shop till and HQ morning path are not.

---

## Counts (unique IDs after parent merge)

Approximate unique findings across this folder (duplicates of the same fact, e.g. `OPS-EMAIL-URL` = `M1-PWD-001` = `M2-REG-001` = `M11-MAIL-001`, counted once):

| Severity | Count | Meaning |
|---|---:|---|
| **P0** | **7** | Launch blockers if you turn on real pharmacies / WABA / Resend |
| **P1** | **~70** | Wrong money, stock, auth, tenant, clinical, or day-path |
| **P2** | **~80** | Real UX/ops pain |
| **P3** | **~40** | Polish, test-gap, leftover folders |

Exact ordered work is in [`08-fix-backlog.md`](08-fix-backlog.md). This summary and that backlog **agree** on P0 and the first P1 band.

**P0 unique IDs:** `M3-SAFE-001` (alias `M6-SAFE-001`), `M10-WA-001`, `M10-WA-002`, `OPS-EMAIL-URL` (aliases `M1-PWD-001` / `M2-REG-001` / `M11-MAIL-001`), `M6-OFFER-001`, `M6-POS-001`, `M9-DASH-001`.

---

## Top 15 launch risks (plain language)

1. **Allergy bills can Charge with no warning.** Live POS never evaluates medication safety; `complete` does not `assertCleared` (D-011). Tests still click “Check draft.”
2. **Patient WhatsApp cannot succeed.** Graph is sent the tenant namespace as the template name and **drops variables**. SSM also omits Meta keys.
3. **Forgot-password and verify-email links default to localhost** unless someone hand-set SSM. Cashfree return URL *is* seeded; email URLs are not.
4. **Published schemes never apply at the till.** D-010 lives on the server; POS never `POST /offers`.
5. **The till is a different product than the story tests.** Proceed / Charge replaced Save / Collect / GST / Khata left / Use points / Print. Mixed tender is gone. After Charge there is no New sale; header “+ New sale” does not reset Redux.
6. **Cashier’s first screen after login is a 403.** Home always opens the OWNER desk. Role dashboards still exist on the server and are unused.
7. **Wrong-app Sign in still creates a session** and can plant an HQ identity on a shop till (one-active-session kills the real HQ session).
8. **Kiosk is the OWNER cookie** with exit PIN default `0000` returned by the API; tickets do not reserve stock.
9. **Customers directory dropped merge, family, refill, tags, loyalty, safety.** Server APIs remain; the floor cannot run CRM.
10. **MASTER support cannot use HQ modules** after Enter (acting pharmacy role). Idle lock is off. Support can rotate the target’s password. D-001: still **not** audit-logged (owner choice — residual risk).
11. **Purchases is three non-atomic HTTP calls** that leave forever-open ISSUED POs; free qty blends into unit rate (GST/khata wrong); partial GRN is impossible on the floor.
12. **Aging and expense GST lie to the CA.** Floor ages the whole party on the oldest item; expense GST is labelled ITC but GSTR-3B ignores it; P&L revenue is GST-inclusive.
13. **Home charts skip D-005**; Free dues show ₹0 instead of an upgrade wall.
14. **Branch switch does not refresh** Customers/Credit/Offers; POS keeps the open cart on the new outlet; collapsed rail cannot switch outlet.
15. **Subscription EXPIRED does not lock the tenant.** Non-payment does not close the floor.

---

## What is actually solid

- Layering: controllers do not call repositories; ArchUnit holds.
- Cookie session: `nmm_access` httpOnly + SameSite Lax; JWT bound to DB session; one-active-session.
- Complete invoice: FOR UPDATE, expected total, unique complete key, stock movement keys `sale:{invoice}:{line}`, khata `chargeForSale`, hold writes no stock.
- D-007 branch caps; D-008 no ONLINE_STORE entitlement on the **server**; D-004 expenses post immediately; D-002 individual khata charge (no pool) on complete.
- D-010 offer evaluator (if called); FEFO suggestion API; expired batch blocked at issue.
- KYC + VA approve; Free on approve + default branch; transfer row locks; QC `qc:{id}:{line}` idempotency.
- SPA HTTP isolation (axios + `VITE_API_BASE_URL`); viridian vs navy uniqueness; idle PIN lock **runtime** (copy is stale).
- Local compose never points at RDS; `LocalEnvironmentGuard`; prod loopback + Nginx TLS + private RDS.
- Flyway V1–V64 sequential; new files only (V57–V64 exist beyond tracker V56).

---

## Not gaps (do not implement as Phase 1)

Open **D-013** (DPDP / M1-S09), open **D-006** (NFR / M12-S01). Deferred M7-S05, M11-S03, M12-S01. Exclusions: customer/doctor login, offline POS sync, thermal invoices, SMS, ecommerce store (D-008), GST/GSP filing, government integrations, shared catalogue/UI package. Full list: [`09-out-of-scope.md`](09-out-of-scope.md).

D-001 “no impersonation audit” is a **closed product choice**. Residual launch risk is documented; do not silently add audit.

---

## Recommended fix order

1. **P0 clinical + comms + prod mail:** safety assert on complete + POS panel; Graph template name + variables; seed HTTPS email URLs.
2. **P0 till honesty:** either restore Save/Collect/GST/schemes/khata/loyalty/print **or** amend stories and rewrite tests — do not leave `done` lying.
3. **P0 staff home:** `GET /dashboards/home` must open the user’s desk, not OWNER.
4. **P1 session/auth:** wrong-app logout; HQ idle lock during support; impersonation identity for HQ chrome; kiosk PIN hash; tenant lock UX + subscription→tenant expiry.
5. **P1 money desks:** atomic purchase bill; close PO; stop blending free qty; aging FIFO on floor; expense ITC copy; P&L tax basis.
6. **P1 CRM remount** existing dialogs; POS khata remaining; FEFO banner; branch-switch refresh.
7. Everything else in [`08-fix-backlog.md`](08-fix-backlog.md).

Do **not** mark tracker rows `done` as launch-complete. Independent story PASSes were against the **pre-rewrite** floors.
