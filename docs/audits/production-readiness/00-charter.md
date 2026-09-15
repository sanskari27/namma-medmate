# Production-readiness + UX-behavior audit — charter

**Date:** 2026-09-15  
**Mode:** Independent audit. No implementation, no commits, no tracker edits, no silent product decisions.  
**Repo:** `/Volumes/SSD/codebase/medmate/namma-medmate`  
**HEAD at start:** inspect live tree; do not treat this prompt’s story counts as truth.

## Mission

Inspect the live codebase against story contracts, closed decisions, architecture invariants, and real pharmacy/HQ use. Write explanatory docs of:

1. What is missing.
2. What is implemented but behaves wrongly.
3. How to fix each finding (smallest concrete change; no new framework, no shared package, no invented product).

Evidence or it did not happen. Every finding cites path + symbol + (when possible) line range.

## Source precedence (highest wins)

1. Runtime/build truth: `server/pom.xml`, Java/Flyway, `dispensary/` + `admin/` package.json and source, Compose, Makefile, Terraform.
2. Story files under `docs/requirements/**` (immutable contracts + ACs).
3. Closed records in `docs/requirements/DECISIONS.md` (override stale product text — e.g. D-007 branch caps beat `product-compiled.md`).
4. `docs/product/product-compiled.md` and `docs/product/m1-*.md`…`m11-*.md`.
5. Architecture: `docs/architecture/README.md`.
6. Status only from `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`.

## Live tracker counts (re-read 2026-09-15)

From `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`:

| Status | Count |
|---|---:|
| done | 67 |
| in_progress | 0 |
| implemented | 0 |
| verified | 0 |
| ready | 0 |
| blocked | 1 (M1-S09, D-013) |
| deferred | 3 (M7-S05, M11-S03, M12-S01) |
| total | 71 |

These are **not** Phase 1 gaps:

- Open decisions: D-013 (DPDP / M1-S09 blocked), D-006 (NFR / M12-S01).
- Deferred: M7-S05, M11-S03, M12-S01.
- Explicit exclusions: customer/doctor login, offline POS, thermal invoices, SMS fallback, B2B lead pipeline, support ticketing, ecommerce / online store (D-008), GST/GSP filing, government integrations, shared product catalogue, generated clients, shared UI package.

Open decisions are **BLOCKED / OWNER NEEDED**, not “missing feature.” Convenient UX that conflicts with a story or closed decision is `UX-vs-CONTRACT`.

## Closed decisions in force

| ID | Chosen behavior that audits must treat as contract |
|---|---|
| D-001 | MASTER impersonation is **not** audit-logged; no timed expiry; nested forbidden. Residual launch risk still documented. |
| D-002 | Family credit = individual limits + family visibility; no shared pool. |
| D-003 | Prescription reference valid 6 months, then auto-archive. |
| D-004 | Expenses post immediately; no M1-S07 threshold. |
| D-005 | Free / Starter / Growth+ report matrix locked. |
| D-007 | Branch caps Free 1 / Starter 2 / Growth 3 / Pro 5; MASTER may override. |
| D-008 | Ecommerce / online store / orders module is Phase 2. Growth has no ONLINE_STORE entitlement. |
| D-009 | Kiosk includes Phase 1 self-order workflow (Pro, Kiosk-typed branches). |
| D-010 | Offers: highest priority wins; one per line; discount before GST. |
| D-011 | Medication safety: tenant data, warn-only, ack with reason. |
| D-012 | Loyalty Growth+; 1 pt / ₹100 paid taxable; 1 pt = ₹1; max 20% of grand total. |
| D-014 | Saved PIN login, device-scoped, 30-day sliding, 3 fails drop device. |
| D-015 | 5-minute idle PIN lock keeps session; 4-hour abandon or dead session → login picker. |

Open: D-006, D-013.

## Live surface map (reconfirmed 2026-09-15)

### Dispensary (`:5173`) — routed screens

Auth: Login, Register (`screens/register`), VerifyEmail, Forgot/Reset password.  
App: Dashboard, Account, Subscription, StaffAccounts, CounterRoles, Branches, Customers, Credit, Campaigns, POS (`/pos`), Offers, Inventory, Purchases, Distributors, Returns, Prescriptions, Licenses, ControlledRegister, Registers, Expenses, Aging, ShopBooks (`/books`), CaPack (`/accountant`), Trends (`/reports`), CustomReports, SignOffRules, WaitingSignOff, FloorActivity, WhatsappTemplates, WhatsappSends, Kiosk, **Orders (`/orders`)**.

Layout chrome: `DashboardLayout` sidebar, PIN/idle lock, CounterAlertBell, branch switch, KYC/tenant lock banners.

**Orders** is routed and nav-labelled “Online & counter sales”. D-008 excludes ecommerce. Wave 3/5 must classify this as counter history vs Phase-2 store (`UX-vs-CONTRACT` if the Online filter implies a store).

### Dispensary leftover / empty folders (not routed)

Empty dirs: `crm`, `employees`, `help`, `invoice-settings`, `online-store`, `racks`, `reorder`, `reports`, `sales-register`, `settings`.  
`staff-password/` contains tests only (password flow moved to StaffAccounts / overlay). Record as DRIFT/dead tree, not missing features.

### Admin (`:5174`) — routed screens

Auth: Login, Forgot/Reset.  
App: Dashboard, Operators, OperatorPassword, HqDesks, StaffVerification, Pharmacies, KycQueue, Subscriptions, SupportSession, WorkflowDesks, HqSignOffs, PlatformActivity, LicenceExpiry, WhatsappProvider (`/whatsapp-templates`).

Layout chrome: navy HQ rail, HqInboxBell, impersonation banner (`HqSupportBanner`).

### Stores

- Dispensary global: `auth`, `notifications`. Screen slices registered on the **same** root store (dashboard, pos, orders, customers, inventory, …). Campaigns has **no** `screens/campaigns/store/` registered.
- Admin global: `auth`, `inbox` only. HQ screens appear to use local/page hooks, not screen slices.

### Server packages

`feature/` and `application/` cover: access, analytics, approval, audit, auth, branch, campaign, communications, compliance, customer*, customreport, dashboard, doctor, finance, impersonation, inventory, kiosk, kyc, loyalty, manufacturer, medicationsafety, notification, offer, prescription, product*, purchaseorder, purchasereturn, sales, session, staff, subscription, supplier, tenant, plus `HealthController`.

Infrastructure: security, cashfree, email, whatsapp, pdf, LocalEnvironmentGuard.

Flyway: **V1–V64**. Tracker stories mention through V56 (Cashfree). V57–V64 exist in runtime truth and must be audited as live schema even if they post-date story evidence:

- V57 product_category_icon
- V58 sales_invoice_prescription_attachment
- V59 customer_directory_indexes
- V60 inventory_overview_product_flags
- V61 sales_offer_display_fields
- V62 kiosk_config_and_order_lines
- V63 expense_party_payment_gst
- V64 expense_gst_percent_integer

### Infra

`compose.yaml`, `compose.prod.yaml`, Makefile, `.env.example`, `infra/terraform/` (bootstrap + envs/prod + modules/platform).

## Personas (keep distinct)

| App | Roles | Voice |
|---|---|---|
| Dispensary | OWNER, pharmacist, cashier, inventory, accountant | Shop-floor / viridian. Never HQ clone. |
| Admin | MASTER, Support, KYC/VA, platform accountant | Navy / Plex HQ. Never dispensary clone. |

Customers and doctors have no login.

## Invariants (audit everywhere they apply)

Controllers never call repositories; writes `@Transactional`. Every pharmacy query has `tenant_id`; branch-owned also `branch_id`. Client role/tenant/branch/price/total/entitlement claims untrusted. `/api/v1` + `ApiResponse<T>`; 400/401/403/404/409/422 as contracted. Money = integer paise in persistence and API; UI displays rupees. Time persisted UTC, displayed IST. Schema only via new immutable Flyway. HTTP only through each SPA’s `src/services/axios.ts` + `VITE_API_BASE_URL`. No `server/` import into SPAs; SPAs never import each other. One Redux store; nested Providers that hide the root store are a defect. Server remains authoritative. Required UI states: loading, empty, validation, denied, conflict, failure, success + focus restore. Idempotent + concurrency-safe webhooks and stock/finance/lifecycle writes.

## Finding schema

Every finding in this folder uses:

```
### [ID] Short title
- Severity: P0 | P1 | P2 | P3
- Type: MISSING | WRONG-BEHAVIOR | UX-FRICTION | UX-vs-CONTRACT | SECURITY | ISOLATION | STATE-FLOW | TEST-GAP | PROD-OPS | DRIFT
- Epic/Story, Apps, Persona, Evidence, Expected, Actual, Click path, User impact, Root layer, Fix, Suggested tests, Out of scope?
```

ID format: `M6-POS-014`, `CROSS-TENANT-003`, `UX-POS-007`.

## Wave plan

| Wave | Scope | Agents | Doc written after wave |
|---|---|---|---|
| 0 | Cross-cutting platform spines | 4× explore | `02-cross-cutting.md` draft + this charter |
| 1 | M1 Auth/roles + M2 Org + M10 Notifications + M11 Integrations | 4× generalPurpose | `m1.md` `m2.md` `m10.md` `m11.md` |
| 2 | M3 CRM + M4 Inventory | 2× generalPurpose | `m3.md` `m4.md` |
| 3 | M5 Procurement + M6 POS/billing | 2× generalPurpose | `m5.md` `m6.md` |
| 4 | M7 Compliance + M8 Finance + M9 Reports | 3× generalPurpose | `m7.md` `m8.md` `m9.md` |
| 5 | Cashier / OWNER / MASTER journeys + security | 3× generalPurpose + security pass | `03-click-paths.md` `04-state-and-data-flow.md` `05-ux-behavior.md` `06-security-isolation.md` |
| 6 | Parent synthesis (no agents) | — | `01-executive-summary.md` `07-production-ops.md` `08-fix-backlog.md` `09-out-of-scope.md` |

Max 4–6 subagents per wave. Subagents are **read-only**. Parent merges, dedupes, and writes markdown before the next wave. Do not spawn `story-implementer`, `requirement-orchestrator`, or `gsd-*`. Do not re-run listed full gates unless a wave is blocked without them.

## Agents used

Recorded as waves complete.

| Wave | Agent type | Coverage | Status |
|---|---|---|---|
| Parent | this session | Charter + synthesis | complete |
| 0 | explore ×4 | server / dispensary / admin / ops spines | complete → `02-cross-cutting.md` |
| 1 | generalPurpose ×4 | M1, M2, M10, M11 | complete → `m1.md` `m2.md` `m10.md` `m11.md` |
| 2 | generalPurpose ×2 | M3 CRM + M4 Inventory | complete → `m3.md` `m4.md` |
| 3 | generalPurpose ×2 | M5 Procurement + M6 POS | complete → `m5.md` `m6.md` |
| 4 | generalPurpose ×3 | M7 + M8 + M9 | complete → `m7.md` `m8.md` `m9.md` |
| 5 | generalPurpose ×3 + parent security pass | cashier / OWNER / MASTER journeys + security | complete → `03`–`06` |
| 6 | parent | synthesis | complete → `01`, `07`, `08`, `09` |

## Definition of done

- Every Phase 1 `done` story has an AC coverage row (covered / partial / missing / UX-wrong) in `m1.md`–`m11.md`.
- Every dispensary and admin screen and every layout chrome control has at least one traced primary click path (`03-click-paths.md` + `m6.md` POS table).
- Cross-cutting isolation, money, time, session, and plan-gating reviewed once globally (`02`, `06`, `07`).
- P0/P1 findings have a concrete fix (`08-fix-backlog.md`).
- Open decisions listed as blockers, not implementation todos (`09-out-of-scope.md`).
- `01-executive-summary.md` and `08-fix-backlog.md` exist and agree (P0 = 7 unique facts; P1 ≈ 70 after alias merge).

**Audit complete 2026-09-15.** No implementation, commits, or tracker edits were made.
