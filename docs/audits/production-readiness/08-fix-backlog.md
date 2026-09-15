# Fix backlog (ordered)

**Date:** 2026-09-15  
**Agrees with:** [`01-executive-summary.md`](01-executive-summary.md)  
Do **not** add tracker rows. Suggested `M6-FIX-01`-style IDs are for a future owner to mint stories.

Counts after **alias merge** (same fact, one row):

| Sev | Unique facts | Meaning |
|---|---:|---|
| P0 | **7** | Launch blockers |
| P1 | **~70** | Wrong money / stock / auth / tenant / clinical / day-path |
| P2 | **~80** | Real UX/ops pain |
| P3 | **~40** | Polish, leftover folders, test-only |

This file is the work order. Detail and evidence live in `m1.md`–`m11.md`, `02`–`07`.

---

## Alias map (do not count twice)

| Canonical | Also filed as | Why one job |
|---|---|---|
| `OPS-EMAIL-URL` | `M1-PWD-001`, `M2-REG-001`, `M11-MAIL-001` | Same SSM/env URL defaults |
| `M3-SAFE-001` | `M6-SAFE-001` | Same missing evaluate/ack/assertCleared |
| `AUTH-ADM-001` | `M1-PIN-002` | Idle lock off during support |
| `UX-ADM-001` | `M1-PIN-001` (admin copy) | PIN enroll “signs out” vs D-015 |
| `PIN-DISP-01` | `M1-PIN-001` (dispensary copy) | Same copy bug on floor |
| `M1-BRANCH-001` | `UX-DISP-01` | Collapsed rail no outlet switch |
| `M1-BRANCH-002` | `STATE-DISP-01` | Branch switch does not refresh lists |
| `M1-IMPERSON-001` | `SEC-001`, `IMPERSON-001` | D-001 residual (no audit) |
| `M1-IMPERSON-003` | `IMPERSON-002` | Exit impersonation stale screens |
| `M10-WA-003` | `SECRET-SSM-WHATSAPP` | Meta keys missing from SSM seed |
| `M10-INBOX-001` | `INBOX-001` | Unread from current page |
| `M10-ROUTE-003` | `BELL-DISP-01` | Approval href → `/inventory` |
| `M10-ROUTE-004` | `INBOX-002` | MASTER href dump |
| `SEC-002` | `M11-CF-001` | HMAC no timestamp skew |
| `IDEMP-001` | `M11-MAIL-002` | Resend apply no `FOR UPDATE` |
| `M6-RX-001` | `M7-RX-001` | Remaining fill unused |
| `M5-PO-003` | `M9-DASH-008` (symptom) | Forever-ISSUED POs inflate home |
| `JOB-001` | `M10-JOB-001` | All-tenant job TX |
| `TIME-001` | `JOB-002`, `M10-TIME-001` | UTC vs IST “today” |
| `UX-POS-001` | overlaps `M6-PDF-001`, `UX-POS-005` | Post-Charge dead till + no New sale |
| `M2-LIFE-003` | `UX-DISP-02` | Lock copy vs always-mounted Outlet |
| `HEALTH-SHALLOW` | `CROSS-002` | Static `/api/v1/health` |

---

## Band 0 — P0 launch blockers (do these first)

| Order | ID | Story | Apps | Effort | Depends-on | Suggested story | Fix (smallest) |
|---|---|---|---|---|---|---|---|
| 1 | `M3-SAFE-001` | M3-S08 / M6-S05 | server + dispensary | M | — | `M6-FIX-01` | POS evaluate + ack; `SalesInvoiceService.complete` `assertCleared` (D-011) |
| 2 | `M10-WA-001` | M10-S04 | server | S | — | `M10-FIX-01` | Graph `template.name` = Meta unique name (`refill_due`), not `{tenantId}_…` |
| 3 | `M10-WA-002` | M10-S04 | server | S | `M10-WA-001` | `M10-FIX-01` | Send Graph `components` for template variables |
| 4 | `OPS-EMAIL-URL` | M1-S03 / M2-S01 / M11-S02 | infra | S | — | `OPS-FIX-01` | Seed HTTPS `PASSWORD_RESET_URL` / verify-email in SSM (Cashfree return already seeded) |
| 5 | `M6-OFFER-001` | M6-S06 | dispensary | M | — | `M6-FIX-01` | `POST /invoices/{id}/offers` before Charge; surface 422 AMBIGUOUS_PRECEDENCE |
| 6 | `M6-POS-001` | M6-S01–S08 | dispensary | L | owner: restore vs amend | `M6-FIX-01` | Restore Save/Collect/GST/khata/loyalty/print **or** rewrite stories+tests. Do not leave `done` lying |
| 7 | `M9-DASH-001` | M9-S01 | server + dispensary | S | — | `M9-FIX-01` | `GET /dashboards/home` opens the user’s default desk, not OWNER |

---

## Band 1 — P1 session, impersonation, kiosk, tenant lock

| ID | Story | Apps | Effort | Depends-on | Suggested | One-line fix |
|---|---|---|---|---|---|---|
| `M1-AUTH-001` | M1-S01/S10 | dispensary + admin | S | — | `M1-FIX-01` | Wrong-app Sign in: `logoutSession` + forget saved login |
| `AUTH-ADM-001` | M1-S02/S08 | admin | S | — | `M1-FIX-02` | Keep idle lock during impersonation |
| `M1-PWD-003` | M1-S03/S08 | server | S | — | `M1-FIX-02` | Block password/PIN rotate while `act_*` set (MASTER uses own HQ password) |
| `M1-IMPERSON-002` | M1-S08 | admin | M | — | `M1-FIX-02` | HQ chrome/authz uses MASTER identity; pharmacy APIs use acting |
| `M1-IMPERSON-004` | M1-S08 | server | S | — | `M1-FIX-02` | Refuse Enter on non-ACTIVE tenants |
| `SEC-NEW-001` | M1-S08 | server | S | — | `M1-FIX-02` | Offboard/deactivate target ends acting session |
| `M1-IMPERSON-001` | M1-S08 | — | — | **D-001 closed** | — | Residual risk only. Do **not** add audit unless owner reopens D-001 |
| `M1-WF-001` | M1-S07 | server | M | owner | `M1-FIX-03` | Apply pharmacy rules at POS **or** relabel HQ desks as platform-only |
| `M1-BRANCH-001` | M1-S06 | dispensary | S | — | `M1-FIX-04` | Collapsed MapPin opens outlet switch |
| `M1-BRANCH-002` | M1-S06 | dispensary | M | — | `M1-FIX-04` | After `branchSwitched`, refetch mounted lists |
| `STATE-POS-001` | M6-S01 | dispensary | S | `M1-BRANCH-002` | `M6-FIX-02` | Outlet switch: `newSale` or confirm abandon |
| `M2-KIOSK-001` | M2-S07 | server | L | D-009 | `M2-FIX-01` | Reserve stock or document ticket ≠ sale; no fake qty |
| `M2-KIOSK-002` | M2-S07 | dispensary | S | — | `M2-FIX-01` | Idempotency key on Place order |
| `M2-KIOSK-003` | M2-S07 | server + dispensary | M | — | `M2-FIX-01` | Hash PIN; never echo `0000`; dedicated kiosk session |
| `M2-KIOSK-004` | M2-S07 | server | S | D-008 | `M2-FIX-01` | Catalogue = on-hand at branch; drop `onlineListed` preference |
| `M2-LIFE-001` | M2-S03/S05 | server | M | owner (auto-lock?) | `M2-FIX-02` | Subscription EXPIRED → tenant lock **or** job + copy |
| `M2-LIFE-002` | M2-S03 | dispensary | S | — | `M2-FIX-02` | Refresh `tenantStatus` from `/me` on focus / lock events |
| `SEC-NEW-002` | M2-S01 | server | S | — | `M1-FIX-01` | Register: opaque taken (same as login) |
| `SEC-NEW-003` | M1-S01 | server | M | AC06 lockout | `M1-FIX-01` | IP throttle (not account lockout) |
| `PII-001` | M1-S10 | server | S | — | `M1-FIX-01` | Saved-login list: mask email |
| `SEC-NEW-004` | CROSS | server | S | — | `OPS-FIX-02` | Prometheus MASTER/ops only |
| `SEC-NEW-005` | CROSS | infra | S | — | `OPS-FIX-02` | Nginx CSP + `frame-ancestors` + HSTS |
| `M11-CF-002` | M11-S01 | dispensary | M | — | `M11-FIX-01` | PENDING copy; reuse checkout key; no second order |
| `M11-CF-008` | M11-S01 | admin | M | — | `M11-FIX-01` | HQ reconcile action, not display-only |

---

## Band 2 — P1 till honesty after P0 (POS remainder)

Do with or immediately after `M6-POS-001`. If owner **amends** stories instead of restoring chrome, several of these become `UX-vs-CONTRACT` closed by the amendment.

| ID | Story | Apps | Effort | Depends-on | Suggested | One-line fix |
|---|---|---|---|---|---|---|
| `M6-PAY-001` | M6-S03 | dispensary | M | `M6-POS-001` | `M6-FIX-01` | Mixed tender amounts; server still owns total |
| `M6-PAY-002` | M6-S03 | dispensary | S | `M6-POS-001` | `M6-FIX-01` | Discount blur retender; 422 approval ≠ tender miss |
| `M6-GST-001` | M6-S02 | dispensary | M | `M6-POS-001` | `M6-FIX-01` | Restore GST override / GSTIN / line discount |
| `M6-HOLD-001` | M6-S05 | dispensary | S | — | `M6-FIX-01` | Held list on till **or** Orders labelled “Held bills” |
| `M6-PDF-001` | M6-S08 | dispensary | M | `M6-POS-001` | `M6-FIX-01` | Print/email after Charge; then New sale |
| `UX-POS-005` | M6 | dispensary | S | — | `M6-FIX-02` | Header + New sale dispatches `newSale` |
| `UX-POS-006` | M6 | dispensary | S | `UX-POS-005` | `M6-FIX-02` | Back after COMPLETED must not PATCH |
| `M6-RX-001` | M6-S04 | dispensary | M | `M6-POS-001` | `M6-FIX-01` | Remaining fill + real Rx reference |
| `M6-POS-002` | M6-S01 | dispensary | S | `M6-POS-001` | `M6-FIX-01` | Line MRP/selling edit |
| `M6-TEST-001` | M6 | dispensary | M | `M6-POS-001` | `M6-FIX-01` | Rewrite POS tests to live chrome |
| `M4-FEFO-001` | M4-S04 | dispensary | S | — | `M4-FIX-02` | Near-expiry banner; drop empty batch option (`UX-POS-004`) |

---

## Band 3 — P1 money desks (purchases, aging, GST, expenses)

| ID | Story | Apps | Effort | Depends-on | Suggested | One-line fix |
|---|---|---|---|---|---|---|
| `M5-PO-002` | M5-S02/S04 | dispensary + server | L | — | `M5-FIX-01` | One transactional “bill + GRN” **or** server composite |
| `M5-PO-003` | M5-S02 | server | S | `M5-PO-002` | `M5-FIX-01` | Close PO when fully received |
| `M5-GRN-002` | M5-S04 | server | M | — | `M5-FIX-01` | Free qty as free, not blended rate |
| `M5-GRN-001` | M5-S04 | dispensary | M | `M5-PO-001` | `M5-FIX-01` | Record delivery against outstanding |
| `M5-PO-001` | M5-S02 | dispensary | L | owner restore vs rewrite | `M5-FIX-01` | Remount indent desk |
| `M5-REO-001` | M5-S03 | dispensary | M | — | `M5-FIX-02` | Draft PO from reorder (Growth+) |
| `M5-QC-001` | M5-S05 | dispensary | M | — | `M5-FIX-03` | Pending check deep-link from Purchases |
| `M5-RET-001` | M5-S06 | dispensary | S | — | `M5-FIX-03` | Keep DN number after QC reject |
| `M5-KHATA-001` | M5-S06 | dispensary | S | — | `M5-FIX-04` | Growth dues + PLAN_LIMIT upgrade CTA |
| `M5-KHATA-002` | M5-S06 | server | M | — | `M5-FIX-04` | FIFO buckets, not whole balance on oldest date |
| `M5-SUP-002` | M5 | dispensary | M | floor restore | — | Unskip / rewrite Purchases+Distributors tests |
| `M8-AGE-001` | M8-S03 | dispensary | S | — | `M8-FIX-01` | Render server FIFO buckets |
| `M8-GST-001` | M8-S04 | dispensary + copy | S | owner ITC vs 3B | `M8-FIX-02` | Rename “ITC eligible” **or** include in 3B |
| `M8-BOOK-001` | M8-S04 | server | M | — | `M8-FIX-02` | P&L revenue taxable (not GST-inclusive) |
| `M8-EXP-001` | M8-S01 | dispensary | S | — | `M8-FIX-03` | Confirm / VOID posted spend |
| `M8-EXP-002` | M8-S01 | dispensary | S | — | `M8-FIX-03` | Expense “today” = IST |
| `M8-EXP-003` | M8-S01 | dispensary | S | — | `M8-FIX-03` | Remount receipt evidence |
| `OWN-EXP-001` | M8-S01 | dispensary | S | — | `M8-FIX-03` | All-outlets: require outlet pick; never `branches[0]` |
| `M8-CA-001` | M8-S05 | dispensary | S | — | `M8-FIX-04` | Copy: Download PDF (not Share); drop filing language |
| `OWN-CA-002` | M9-S05 | dispensary | S | D-005 | `M8-FIX-04` | GST toggles off when Growth sections omitted |
| `M8-TEST-001` | M8 | dispensary | M | floor restore | — | Rewrite expenses/aging/CA tests |
| `M7-REG-001` | M7-S03 / M9-S05 | server | S | D-005 | `M7-FIX-01` | Near-expiry **compliance** register not Starter-gated |

---

## Band 4 — P1 CRM, inventory, reports, notifications

| ID | Story | Apps | Effort | Depends-on | Suggested | One-line fix |
|---|---|---|---|---|---|---|
| `M3-CRM-001` | M3-S02–S10 | dispensary | L | — | `M3-FIX-01` | Remount merge/family/refill/tags/loyalty/safety on Customers |
| `M3-CRM-002` | M3-S02 | server | L | — | `M3-FIX-01` | EXECUTE moves sales/khata/loyalty/history |
| `M3-CREDIT-001` | M3-S05 / M6-S03 | dispensary | S | — | `M3-FIX-02` | Load khata remaining on patient pick |
| `M3-LOY-001` | M3-S09 | dispensary | M | `M6-POS-001` | `M3-FIX-02` | Use points + OWNER adjust |
| `M3-REFILL-001` | M3-S06 | dispensary | M | `M3-CRM-001` | `M3-FIX-01` | Due strip on Customers + till |
| `M3-FAM-001` | M3-S10 | dispensary | M | `M3-CRM-001` | `M3-FIX-01` | Family visibility + member settle |
| `M3-CRM-003` | M3 | dispensary | M | `M3-CRM-001` | — | Rewrite CRM/POS tests to live UI |
| `M4-SKU-001` | M4-S01 | dispensary | S | — | `M4-FIX-01` | Empty catalogue → Add product |
| `M4-RCV-001` | M4-S03 | dispensary | L | — | `M4-FIX-01` | Remount receive / batch / movements |
| `M4-EXP-001` | M4-S04 | dispensary | S | — | `M4-FIX-02` | Expiring filter uses warn days |
| `M4-ADJ-001` | M4-S05 | dispensary | S | — | `M4-FIX-03` | Confirm money/stock before send/approve |
| `M4-TAKE-001` | M4-S06 | dispensary | S | — | `M4-FIX-03` | Start count OWNER-only in UI |
| `M4-TEST-001` | M4 | dispensary | M | `M4-RCV-001` | — | Register inventory slice; live floor tests |
| `M9-DASH-002` | M9-S02 | dispensary | M | `M9-DASH-001` | `M9-FIX-01` | Mount owner widget envelopes on live home |
| `M9-DASH-003` | M9-S01 | dispensary | S | — | `M9-FIX-01` | Dues hero = rupees or customer count, not bucket count |
| `M9-DASH-004` | M9-S02 | dispensary | S | — | `M9-FIX-01` | Drills to source record, not `/pos` |
| `M9-DASH-005` | M9-S05 | server | S | D-005 | `M9-FIX-02` | Home charts respect Growth gate |
| `M9-DASH-006` | M9-S05 | dispensary | S | D-005 | `M9-FIX-02` | Free aging = PLAN_LIMIT wall, not ₹0 |
| `M9-DASH-007` | M9-S02 | server | S | — | `M9-FIX-01` | Low-stock glance includes zero on-hand |
| `M9-DASH-009` | M9-S02 | dispensary | S | — | `M9-FIX-01` | FAILED sources: unavailable, not zeros |
| `OWN-NAV-001` | M9 / M4 | dispensary | S | — | `M9-FIX-01` | Restock href `?view=guidance` |
| `OWN-NAV-003` | M4 | dispensary | M | — | `M4-FIX-01` | All-outlets Stock: tenant overview, not empty |
| `OWN-NAV-004` | M2-S06 | dispensary | S | — | `M2-FIX-03` | All-outlets Transfers: list or require outlet |
| `OWN-SUB-001` | M2-S05 | dispensary | S | — | — | Free card: not “Monthly billing” |
| `M10-ROUTE-001` | M10-S02 | server | M | — | `M10-FIX-02` | Write `notification_role_assignment` on role assign |
| `M10-ROUTE-002` | M10-S02 | server | L | `M10-ROUTE-001` | `M10-FIX-02` | Producers for five silent matrix triggers |
| `M10-WA-007` | M10-S03 | admin | S | — | `M10-FIX-01` | Rescan pulls Meta templates (or copy: ping only) |
| `M7-LIC-001` | M7-S01 | dispensary | S | — | `M7-FIX-02` | Staff licence bell → OWNER copy or pharmacist surface |
| `M7-REG-002` | M7/M8/M9 | dispensary | S | — | — | Distinct nav labels: Register vs Books vs Trends vs Custom |
| `M7-TEST-001` | M7 | dispensary | M | — | — | Register live Redux in M7 tests |
| `UX-ADM-DASH-001` | admin home | admin | M | — | `M9-FIX-03` | Wire HQ KPIs from KYC/pharmacy lists |
| `M11-CF-003` | M11-S01 | dispensary | S | — | — | Align checkout copy + tests with live UI |

---

## Band 5 — remaining P1 ops / isolation / security

| ID | Story | Apps | Effort | Depends-on | Suggested | One-line fix |
|---|---|---|---|---|---|---|
| `M10-WA-003` | M10-S03 | infra | S | — | `OPS-FIX-01` | Add Meta keys to SSM seed (or documented manual) |
| `TF-SNAPSHOT` | CROSS | infra | S | D-006 | `OPS-FIX-03` | `skip_final_snapshot = false` for prod |
| `TF-SSH-EXAMPLE` | CROSS | infra | S | — | `OPS-FIX-03` | Example CIDR `/32`; drop world SSH |
| `OPS-STORAGE` | CROSS | infra | L | **D-006** | — | Files backup policy blocked until NFR closed; still a data risk |
| `M5-REO-002` | M5-S03 | server | S | — | `M5-FIX-02` | Last purchase price = this branch |
| `M2-KYC-002` | M2-S02 | admin | S | — | `M2-FIX-04` | Evidence Open via blob fetch + cookie |
| `SEC-NEW-006` | CROSS | server | S | owner | — | Cookie-only if product wants no Bearer |
| `SEC-NEW-007` | M11-S01 | server | S | — | `M11-FIX-01` | Reconcile POST, not GET |

---

## P2 (do after P1 band 1–3) — compact

Full text in epic files. Unique IDs (aliases already merged):

**Auth / layout:** `PIN-DISP-02`/`M1-PIN-003`, `M1-PIN-004`, `M1-BRANCH-003`, `M1-IMPERSON-003`, `TENANT-001`, `SEC-003`, `M2-REG-002`, `M2-KYC-001`, `M2-LIFE-003`, `M2-PLAN-001`, `M2-LIFE-004`, `UX-ADM-002`.

**POS / UX:** `UX-POS-002`, `UX-POS-003`, `M6-NET-001`, `M6-PAY-003`, `UX-DISP-04` (header search dead).

**CRM:** `UX-CRM-002`, `UX-CRM-003`, `UX-CRM-005`, `M3-HIST-001`, `M3-CREDIT-002`, `M3-CAMP-001`.

**Inventory:** `M4-CTRL-001`, `M4-ONLINE-001`, `M4-UOM-001`, `M4-MONEY-001`, `M4-COMP-001`.

**Procurement:** `M5-PO-004`, `M5-GRN-003`, `M5-QC-002` (UX-vs-CONTRACT), `M5-RET-002`, `M5-KHATA-003`, `M5-KHATA-004`, `M5-SUP-001`.

**Finance / reports:** `M8-AGE-002`, `M8-CA-002`, `M8-CA-003`, `M8-BOOK-002`, `M8-BOOK-003`, `M8-EXP-004`, `M9-DASH-010`, `M9-DASH-011` (D-008), `M9-DASH-012`, `M9-TREND-001`, `M9-CUST-001`, `M9-TEST-001`.

**Compliance:** `M7-NDPS-001`, `M7-LIC-002`, `M7-LIC-003` (GET `/due` writes scan).

**Notifications:** `M10-INBOX-001`, `M10-ROUTE-003`, `M10-ROUTE-004`, `M10-INBOX-002`, `M10-INBOX-003`, `M10-ROUTE-005`, `M10-WA-004`.

**Integrations:** `SEC-002`, `M11-CF-004`, `M11-CF-005`, `M11-MAIL-003`, `M11-CF-006`.

**Jobs / ops:** `JOB-001`, `COMPOSE-REDIS-UNUSED`, `HEALTH-SHALLOW`, `TF-REDIS-CRYPTO`, `TF-S3-STATE`, `COMPOSE-DOC-DRIFT`, `UX-vs-CONTRACT-01` (Orders Online vs D-008).

---

## P3 (last)

`SEC-004` CSRF, `SEC-005`/`M1-PWD-002`, `AXIOS-DISP-01`, `FLYWAY-001`, `CROSS-001`, `UX-DISP-03`/`DRIFT-DISP-01`, `M1-APPR-001`, `M1-APPR-002`, `M1-SAVED-001` (doc), `M2-XFER-001`, `M2-KIOSK-005` (doc), `UX-CRM-001` (walk-in default — owner), `M4-DEAD-001`, `M5-QC-003`, `M6` leftover P3, `M10-WA-005`, `M10-WA-006`, `IDEMP-001`, `M11-MAIL-002`, `M11-CF-007`, `COMPOSE-CASHFREE-ENV`, `OPS-PUBLIC-BASE`, `PII-002`, `PII-003`, `TENANT-NEW-001`.

---

## Too big for a drive-by (mint later; do not add tracker now)

| Suggested ID | Covers | Why not drive-by |
|---|---|---|
| `M6-FIX-01` | `M6-POS-001` + pay/GST/offers/safety/print/tests | Floor rewrite vs story amendment |
| `M3-FIX-01` | CRM remount + merge ledgers | Many dialogs + server EXECUTE |
| `M4-FIX-01` | Receive/batch/movements + All-outlets Stock | Unmounted workspaces |
| `M5-FIX-01` | Atomic bill+GRN + indent + close PO + free qty | Money + three HTTP |
| `M10-FIX-02` | Roster write + five producers | Cross-module events |
| `M2-FIX-01` | Kiosk stock + session + PIN | D-009 workflow correctness |
| `M9-FIX-01` | Home desk + widgets + drills | Role UX + D-005 |

---

## Recommended sequence (matches `01-executive-summary.md`)

1. P0 clinical + Graph + prod mail (`M3-SAFE-001`, `M10-WA-001/002`, `OPS-EMAIL-URL`).
2. P0 till honesty (`M6-POS-001` + `M6-OFFER-001`) **or** owner amends M6 stories.
3. P0 staff home (`M9-DASH-001`).
4. P1 session/auth/kiosk/tenant lock (Band 1).
5. P1 money desks (Band 3).
6. P1 CRM remount + POS remainder + FEFO (Bands 2+4).
7. P1 notifications/reports/ops (rest of Band 4–5).
8. P2 then P3.

**Do not** implement D-013 / M1-S09, D-006 / M12-S01, deferred M7-S05 / M11-S03, or D-001 audit, as “fixes.” See [`09-out-of-scope.md`](09-out-of-scope.md).
