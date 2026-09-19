# Cross-cutting platform audit (Wave 0)

**Date:** 2026-09-15  
**Agents:** explore ×4 (server spine, dispensary spine, admin spine, ops/prod spine).  
**Scope:** Auth/session/PIN, tenancy, cookies, axios, Redux, money/time, envelopes, Flyway, jobs, compose/terraform/secrets, observability.  
**Not Phase 1 gaps:** D-013, D-006 (see `09-out-of-scope.md` once written). D-001 residual risk is recorded as SECURITY, not “missing audit.”

Parent merged and deduped subagent output. Evidence is from source, not from re-running listed full gates.

---

## What is solid

| Area | Evidence |
|---|---|
| Cookie session | `nmm_access` httpOnly, SameSite Lax; Secure in `application-prod.properties`. `AuthCookieService`. |
| JWT bound to DB session | `JwtAuthenticationFilter` + `findActiveScopedSession`. Dual-identity impersonation claims `act_uid`/`act_tid`/`act_role`. |
| Layering | ArchUnit `LayeredArchitectureTest`; controllers under `feature/` do not import `persistence`. |
| API envelope | `ApiResponse<T>` + `ApiException` 400/401/403/404/409/422. |
| Money | Integer `*_paise` columns; Cashfree paise helpers. |
| Time persist | `Clock.systemUTC()`, Hibernate JDBC UTC; IST used for display formatters and Jackson. |
| Idempotent stock/complete | Unique movement/complete keys (V27/V39/V41…); Cashfree SUCCESS early-return + row lock. |
| Webhook HMAC | Cashfree + Resend/Svix; blank secret rejects. |
| Job tenant queries | Scanners iterate tenants then query with `tenantId`. |
| Local ≠ RDS | Compose hardcodes local Postgres; `LocalEnvironmentGuard` rejects `rds.amazonaws.com` / `cache.amazonaws.com` on `local` profile. |
| SPA HTTP isolation | Each app’s `src/services/axios.ts` + `VITE_API_BASE_URL`; no `server/` or cross-SPA imports. |
| One Redux store | Dispensary: single `Provider` in `main.tsx`. Admin: `auth` + `inbox` only (correct for HQ). |
| D-015 idle lock (runtime) | 5-minute overlay keeps session; 3 PIN fails revoke; 4-hour abandon → login. Distinct keypad vs HQ cells. |
| Visual uniqueness | Dispensary viridian/Noto vs admin navy/IBM Plex. Nav copy is not a theme-swap clone. |
| Prod network | Loopback Compose ports, host Nginx TLS, private RDS/ElastiCache, `ap-south-1`. Secrets via SSM SecureString; `.env` gitignored. |

---

## Auth, session, PIN

Idle lock **implementation** matches D-015 on both SPAs. Enroll copy matches lock/resume (2026-09-18).

### [PIN-DISP-01] PIN enroll copy still says idle “signs out”
- Severity: P2
- **Status: FIXED** 2026-09-18 — `CounterPinEnroll` helper is lock + six-digit resume; tests forbid “signs out”.
- Type: UX-vs-CONTRACT / DRIFT
- Epic/Story: M1-S10 / D-015
- Apps: dispensary
- Persona: cashier / pharmacist / OWNER
- Evidence:
  - `dispensary/src/components/organisms/counter-pin-enroll/CounterPinEnroll.tsx` helper text (“this till **locks**” / “unlock and keep working”)
  - Runtime: `useIdleLock` + `DashboardLayout` keep session
- Expected: D-015 — idle shows PIN lock; same session resumes.
- Actual (was): First-enroll copy taught hard logout. **Now:** lock/resume.
- Click path: First password login → enroll dialog.
- Root layer: layout
- Fix: Done.
- Suggested tests: `CounterPinEnroll` asserts lock/resume wording, not “signs out”.
- Out of scope?: no

### [UX-ADM-001] HqPinEnroll copy still claims idle sign-out
- Severity: P1
- **Status: FIXED** 2026-09-18 — `HqPinEnroll` helper is lock + unlock this console; tests forbid “sign out”.
- Type: UX-vs-CONTRACT
- Epic/Story: M1-S02 / D-015
- Apps: admin
- Persona: MASTER | VA
- Evidence: `admin/src/components/organisms/hq-pin-enroll/HqPinEnroll.tsx` (~108–110)
- Expected: D-015 lock/resume.
- Actual (was): “Idle HQ consoles **sign out** after five minutes.” **Now:** lock after five minutes.
- Click path: First HQ login → Set HQ PIN modal.
- Root layer: layout
- Fix: Done.
- Suggested tests: enroll helper mentions lock, not sign-out.
- Out of scope?: no

### [AUTH-ADM-001] Idle PIN lock disabled for entire support session
- Severity: P1
- Type: SECURITY
- Epic/Story: M1-S02 / D-015 + M1-S08
- Apps: admin
- Persona: MASTER
- Evidence: `admin/src/layouts/DashboardLayout.tsx` `useIdleLock(pinSet && !mustChangePassword && !support)`
- Expected: Unattended HQ still PIN-locks. D-001 forbids timed *impersonation* auto-exit, not idle lock.
- Actual: Active impersonation disables idle lock indefinitely.
- Click path: Enter support → leave console idle >5 min → no lock.
- User impact: Unattended tenant-context support stays live on screen.
- Root layer: layout
- Fix: Keep idle lock during support; unlock resumes the same banner.
- Suggested tests: impersonation + pinSet + 5 min → lock still shown.
- Out of scope?: no (document in DECISIONS only if product explicitly waives HQ lock during support)

**Status:** FIXED 2026-09-15 — `useIdleLock(pinSet && !mustChangePassword)`; `HqSessionLock` mounts during support. `DashboardLayout.pin.test.tsx` support+5min lock. Browser: Enter Varshmaan → idle → lock overlay → Resume PIN keeps support banner. `M1-PIN-004` FIXED 2026-09-17 — unlock JWT keeps `act_*`.

### [PIN-DISP-02] Four-hour abandon path untested
- Severity: P2
- Type: TEST-GAP
- Epic/Story: D-015
- Apps: dispensary (admin similarly thin)
- Persona: all
- Evidence: `useIdleLock.ts` `LOCK_ABANDON_MS`; `DashboardLayout.pin.test.tsx` covers 5-min lock only.
- Expected: Abandoned lock → login picker + reason.
- Actual: Implemented; no automated abandon test.
- Fix: Fake timers 4h after lock; assert login + reason.
- Suggested tests: `DashboardLayout.pin.test` abandon case (both SPAs).
- Out of scope?: no

**Status:** FIXED 2026-09-17 — alias of `M1-PIN-003`. Both SPAs fake 4h after lock → login + abandoned.

### [SEC-005] Password-change gate uses acting user during impersonation
- Severity: P3
- Type: SECURITY
- Epic/Story: M1-S08
- Apps: server
- Persona: MASTER
- Evidence: `PasswordChangeRequiredFilter` uses `principal.userId()` (acting id when impersonating).
- Expected: Session owner (MASTER) must-change still enforced.
- Actual: Gate checks the target pharmacy user while impersonating.
- Fix: Check `sessionUserId` (and optionally acting).
- Suggested tests: `AuthImpersonationTest_masterMustChangeStillBlocksWhileImpersonating`
- Out of scope?: no

**Status:** FIXED 2026-09-18 — `PasswordChangeRequiredFilter` uses `principal.hqUserId()`. `AuthImpersonationTest` sets must-change after Enter, then pharmacy APIs 422.

---

## Tenancy and isolation

### [TENANT-001] Soft-deleted tenant not locked by TenantAccessFilter
- Severity: P2
- Type: ISOLATION
- Epic/Story: CROSS-CUTTING
- Apps: server
- Persona: OWNER / cashier
- Evidence: `TenantAccessFilter` — if `tenant == null || deletedAt != null` → continue (allow). Lifecycle tests cover SUSPENDED/EXPIRED, not soft-delete.
- Expected: Soft-deleted / missing tenant must not keep pharmacy API access.
- Actual: Only non-ACTIVE *status* locks.
- User impact: Orphan sessions could mutate data if `deleted_at` is set without TERMINATED + session revoke.
- Root layer: infra
- Fix: Treat deleted/missing tenant as locked (403) or revoke sessions on soft-delete.
- Suggested tests: `TenantAccessFilterTest_deletedTenantLocked`
- Out of scope?: no

Tenant lock for non-ACTIVE statuses (KYC, SUSPENDED, EXPIRED, TERMINATED) is implemented and tested.

**Status:** FIXED 2026-09-17 — missing/`deletedAt` tenant is 403 `TENANT_LOCKED`. `TenantLifecycleTest.ac03_softDeletedTenantIsLocked_TENANT_001`.

---

## Cookies, CORS, CSRF

### [SEC-003] `secure-cookie` defaults false outside prod profile
- Severity: P2
- Type: SECURITY / PROD-OPS
- Apps: server | infra
- Evidence: `application.properties` `app.security.secure-cookie=false`; prod overlay true.
- Actual: Wrong profile ships non-Secure `nmm_access`.
- Fix: Fail-fast in non-local profiles if `secure-cookie=false`, or default true and opt out only in `local`/`test`.
- Suggested tests: `AuthCookieServiceProdSecureTest`

**Status:** FIXED 2026-09-17 — `ProdSecureCookieGuard` `@Profile("prod")` fails fast if `app.security.secure-cookie=false`. Local/test stay false.

### [SEC-004] CSRF disabled; SameSite Lax mitigates
- Severity: P3
- Type: SECURITY
- Apps: server
- Evidence: `SecurityConfig` CSRF off; cookie SameSite Lax; CORS allowlist + credentials.
- User impact: Low on modern browsers.
- Fix: Document residual risk; optional double-submit later.

**Status:** WONTFIX 2026-09-18 — SameSite Lax + CORS allowlist is the Phase 1 residual. No CSRF token.

---

## Axios and session recovery

Both SPAs: 401 (except `INVALID_CREDENTIALS` / `INVALID_PIN`) clears storage and sends the user to login with a reason. 403/409/422 are left to screens — correct.

### [AXIOS-DISP-01] / [STATE-ADM-001] Auth hydrate from localStorage until first 401
- Severity: P3
- Type: STATE-FLOW
- Apps: dispensary | admin
- Evidence: `auth.slice.ts` `readStoredUser()`; no boot `/me`.
- User impact: Brief shell flash with a dead cookie.
- Fix (optional): `GET /api/v1/auth/me` on `ProtectedRoute` mount.

**Status:** FIXED 2026-09-18 — both `ProtectedRoute`s hydrate `/auth/me`; auth persist is `{ userId }` only (`PII-003`).

---

## Redux and branch / impersonation refresh

### [STATE-DISP-01] `branchSwitched` does not refresh many open screens
- Severity: P1
- Type: STATE-FLOW
- Epic/Story: CROSS-CUTTING / M1-S06
- Apps: dispensary
- Persona: OWNER switching outlets mid-shift
- Evidence:
  - `dispensary/src/store/auth.slice.ts` `branchSwitched` updates auth only
  - Refreshers: Orders, Dashboard, POS bootstrap (`activeBranchId` deps)
  - Non-refreshers: `CustomersScreen`, `CreditScreen`, `OffersScreen`, `DistributorsScreen` load once (`[dispatch, allowed]`)
- Expected: Open branch-scoped views reload or clear after outlet change.
- Actual: Auth updates; several screens keep prior Redux rows until remount.
- Click path: Outlet switch → API OK → open Customers/Credit/Offers still show previous outlet.
- User impact: Wrong outlet’s patients, khata, or schemes on screen.
- Root layer: store / screen
- Fix: Depend on `activeBranchId` (or listen to `branchSwitched`) and reload/reset screen slices. Confirm per resource whether the API is tenant-global (customers) vs session-branch (stock, POS).
- Suggested tests: Mount Customers/Credit/POS → switch branch → assert reload or explicit tenant-global copy.
- Out of scope?: no

### [UX-DISP-01] Collapsed rail cannot switch outlet
- Severity: P1
- Type: WRONG-BEHAVIOR
- Apps: dispensary
- Persona: OWNER / pharmacist
- Evidence: `AppSidebar.tsx` collapsed MapPin is a dead button; expanded path has the dropdown. Test covers expanded only.
- Click path: Collapse rail → MapPin → nothing.
- Fix: Same `DropdownMenu` on the collapsed trigger.
- Suggested tests: Collapse → open outlet menu → `switchSessionBranch`.

### [IMPERSON-002] Exit restores auth Redux; screen-local tenant state can stay stale
- Severity: P2
- Type: STATE-FLOW
- Epic/Story: M1-S08
- Apps: admin
- Persona: MASTER
- Evidence: `leaveSupport` → `exitImpersonation` → `sessionStarted(restored)` only. HQ screens hold local fetch state.
- Click path: Support enter → tenant-scoped screen → Exit banner → same route still showing prior payload.
- Fix: Key `Outlet` on `userId+tenantId`, or navigate to `/support` on exit.
- Suggested tests: Exit remounts outlet / clears fixture screen state.

---

## Notifications / deep links

### [BELL-DISP-01] Approval slips route to `/inventory`, not waiting sign-off
- Severity: P2
- Type: UX-FRICTION
- Apps: server + dispensary
- Persona: OWNER / pharmacist
- Evidence: `NotificationRoutingCopy.java` APPROVAL_REQUESTED → `/inventory`; `ROUTES.APPROVALS_PENDING` exists.
- Click path: Bell → Open approval → `/inventory`.
- Fix: Staff href `/approvals/pending`.
- Suggested tests: openNotification approval → pending route.

### [INBOX-001] HQ unread badge recomputed from current page only
- Severity: P2
- Type: STATE-FLOW
- Epic/Story: M10-S01
- Apps: admin
- Evidence: `inbox.slice.ts` `inboxRowFiled` sets unread = filter of current `rows`.
- User impact: False “inbox clear” when unread exists on other pages.
- Fix: Use server `unreadCount` or decrement by one, then `countHqUnread`.

### [INBOX-002] MASTER notification hrefs can dump to dashboard
- Severity: P2
- Type: WRONG-BEHAVIOR
- Epic/Story: M10-S02
- Apps: admin | server
- Evidence: Client `navigate(target.href)`; KYC `masterHref=null` falls back `/account`; admin `*` → Dashboard. Tests mock `/kyc`.
- User impact: Operator thinks they opened the queue; land on dashboard with no error.
- Fix: Explicit `masterHref` for HQ-bound types; whitelist unknown hrefs → failure banner.

---

## Money / time / envelope / Flyway / jobs

Money paise and UTC persist are solid. Residual time issues:

### [JOB-002] / [TIME-001] Business “today” and JVM default
- Severity: P3
- Type: TIME
- Evidence: Scanners `LocalDate.ofInstant(..., UTC)`; `NammaMedmateServerApplication` sets JVM default IST.
- Fix: Asia/Kolkata for scanner `LocalDate`; prefer UTC JVM default with explicit IST display.

**Status:** FIXED 2026-09-18 — refill/licence scanners, `LicenseService.today()`, WhatsApp enqueue days use `DashboardPolicy.IST`.

### [JOB-001] Due scanners wrap all tenants in one `@Transactional`
- Severity: P2
- Type: PROD-OPS
- Evidence: `RefillDueScanner.scanAll` / `CreditDueScanner` / `LicenseDueScanner` / `PrescriptionReferenceScanner`.
- User impact: One pharmacy failure can roll back the whole platform scan.
- Fix: Per-tenant `REQUIRES_NEW`.
- Suggested tests: `RefillDueScannerTest_oneTenantFailureDoesNotRollbackOthers`

**Status:** FIXED 2026-09-20 — remaining `ItemExpiryScanner` / `SupplierDueScanner` scan per tenant `REQUIRES_NEW`; `SubscriptionExpiryScanner` expires each due row in `REQUIRES_NEW`.

### [FLYWAY-001] Schema head is V64; tracker narrative stops at V56
- Severity: P3
- Type: DRIFT
- Evidence: V57–V64 present and sequential (new files, not rewritten early migrations).
- Fix: Docs/tracker note head = V64 (process only; this audit does not edit the tracker).

**Status:** FIXED 2026-09-18 — `docs/architecture/README.md` records live Flyway head = V64. Tracker not edited.

### [CROSS-001] Unhandled 500s may leave the ApiResponse envelope
- Severity: P3
- Fix: `@ExceptionHandler(Exception.class)` → 500 `INTERNAL_ERROR`.

**Status:** FIXED 2026-09-18 — `GlobalExceptionHandler.handleUnknown` returns 500 `INTERNAL_ERROR`. `NoResourceFoundException` 404; `HttpRequestMethodNotSupportedException` 405.

---

## Webhooks and secrets

### [SEC-002] Webhook HMAC accepts arbitrarily old timestamps
- Severity: P2
- Type: SECURITY
- Epic/Story: M11-S01 / M11-S02
- Apps: server
- Evidence: `CashfreeWebhookSignature.valid`, `ResendWebhookSignature.valid` — no skew window. Tests assert HMAC only.
- User impact: Captured signed bodies remain reusable indefinitely (Cashfree apply is otherwise idempotent).
- Fix: Reject `|now - timestamp| > N minutes`.
- Suggested tests: `CashfreePgAdapterTest_rejectsStaleTimestamp`, `ResendWebhookSignatureTest_rejectsStaleTimestamp`

### [IDEMP-001] Resend webhook apply has no pessimistic lock
- Severity: P3
- Type: STATE-FLOW
- Contrast: Cashfree uses `lockByProviderOrderId`.
- Fix: `lockByProviderMessageId` before transition.

**Status:** FIXED 2026-09-18 — `TransactionalEmailRepository.lockByProviderMessageId`; `ResendWebhookService.apply` uses it.

### [SEC-001] / [IMPERSON-001] Silent MASTER impersonation (D-001 residual)
- Severity: P1
- Type: SECURITY
- Epic/Story: M1-S08 / D-001 **closed**
- Expected: Product chose no audit and no TTL. This is residual launch risk, not a missing feature.
- Actual: Dual-identity JWT works; start/exit unlogged; session until explicit exit.
- User impact: Compromised MASTER can silently act as any tenant user with no forensic trail.
- Fix: Compensating ops controls (step-up, alerting) **without** inventing audit if D-001 still forbids it. Keep UI disclosure.
- Out of scope?: owner decision needed for compensating controls that would change D-001.

---

## Dispensary chrome UX (spine)

### [UX-vs-CONTRACT-01] Orders “Online” chrome vs D-008
- Severity: P2
- Type: UX-vs-CONTRACT
- Epic/Story: D-008 closed — ecommerce / online store / orders module is Phase 2
- Apps: dispensary
- Evidence: Nav hint “Online & counter sales”; `OrdersScreen` Online filter; `SalesOrderService` always `COUNTER`. Empty `screens/online-store/`.
- Click path: Nav Orders → Online filter → empty set while COUNTER rows exist.
- User impact: Looks like a live online store.
- Fix: Retitle to counter/kiosk history; hide Online filter until a Phase 2 story. Owner decision if kiosk should be labelled ONLINE.
- Out of scope?: owner decision needed for naming

### [UX-DISP-02] KYC banner claims floor closed; layout still renders modules
- Severity: P2
- Type: WRONG-BEHAVIOR
- Evidence: `DashboardLayout` “Floor modules stay closed” + `<Outlet />` always mounts.
- Fix: Soften copy **or** gate nav when status ∉ ACTIVE (UX-only; server remains authoritative).

### [UX-DISP-04] Header search is read-only placeholder
- Severity: P3
- Type: UX-FRICTION
- Evidence: `ShellHeader.tsx` `readOnly` search.
- Fix: Remove until a search story exists.

**Status:** FIXED 2026-09-18 — header search already removed (P2 POS chrome). `ShellHeader` has no read-only search.

### [UX-DISP-03] Missing rail icons; [DRIFT-DISP-01] empty leftover screen folders
- Severity: P3
- Empty dirs: `crm`, `employees`, `help`, `invoice-settings`, `online-store`, `racks`, `reorder`, `reports`, `sales-register`, `settings`; `staff-password/tests` empty.
- Fix: Delete empty folders; map remaining nav icons.

**Status:** FIXED 2026-09-18 — Returns `Undo2`, NDPS `ShieldAlert`, Outlets `Store`. Empty leftover screen dirs already gone.

### [UX-ADM-002] Full MASTER nav shown to every HQ role
- Severity: P2
- Type: UX-FRICTION
- Apps: admin
- Persona: VA
- Evidence: `NAV_ITEMS` unconditional; screens deny after navigation.
- Fix: Filter rail by `role`/`modules` (server still authoritative).

**Status:** FIXED 2026-09-17 — `visibleHqNav`. VA: Dashboard / KYC / Staff approvals. Browser: `verify.agent@nammamedmate.local` rail matches.

---

## Production ops (spine; details continue in `07-production-ops.md`)

**D-006** (hosting, residency, DR, backups, scale) is **OPEN**. Do not treat as a missing M12-S01 implementation. Current single-EC2 + 7-day RDS backup is a *fact*, not an approved NFR.

### [OPS-EMAIL-URL] Prod password-reset / email-verify URLs default to localhost
- Severity: P0
- Type: PROD-OPS
- Apps: server | infra
- Evidence: `application.properties` defaults `http://localhost:5173|5174/...`. SSM seed and `.env.prod.example` omit `PASSWORD_RESET_*` / `EMAIL_VERIFICATION_*`. Used by `PasswordLifecycleService`, `TenantRegistrationService`.
- User impact: Production forgot-password and verify-email emails point at localhost unless someone remembered to set SSM by hand.
- Fix: Seed HTTPS pharmacy/admin URLs in SSM and `application-prod.properties`.
- Suggested tests: Prod-profile config test asserting non-localhost URLs.
- Out of scope?: no

**Status:** FIXED 2026-09-15 — `application-prod.properties` HTTPS defaults; SSM seed + `.env.prod.example`; `ProdEmailUrlGuard` fail-fast on prod localhost; `ProdEmailUrlSeedTest` / `ProdEmailUrlGuardTest` 5/5. Existing SSM needs one-time `update-prod-env.sh set` because `ignore_changes`.

### [SECRET-SSM-WHATSAPP] Meta WhatsApp keys not in Terraform SSM seed
- Severity: P1
- Type: DRIFT
- Apps: infra
- **Status:** FIXED 2026-09-17 — alias of `M10-WA-003`. SSM seed + tfvars + `.env.prod.example` include `META_WHATSAPP_*`. Existing blobs need one-time `set`.

### [TF-SNAPSHOT] `skip_final_snapshot` defaults true
- Severity: P1
- Type: PROD-OPS
- **Status:** FIXED 2026-09-17 — default `false`; `deletion_protection = true`; final snapshot identifier when not skipping.

### [TF-SSH-EXAMPLE] Example SSH CIDR is world-open
- Severity: P1
- Type: SECURITY
- **Status:** FIXED 2026-09-17 — example `203.0.113.10/32`; README prefers SSM. Port 22 remains for a named `/32`.

### [OPS-STORAGE] App files on EC2 bind mount without backup story
- Severity: P1 (data) — policy under D-006
- Evidence: `compose.prod.yaml` `./files:/app/files`. KYC/licence evidence lives here.
- Out of scope?: backup *policy* blocked on D-006; still a current operational gap.

### [COMPOSE-REDIS-UNUSED] Redis provisioned; sessions are Postgres
- Severity: P2
- Evidence: Redis starter + ElastiCache; `SecurityConfig` STATELESS; sessions in `user_session`.
- User impact: Extra failure domain (actuator Redis health) and cost.
- Fix: Use Redis for a defined purpose, or remove until needed.

**Status:** FIXED 2026-09-20 — keep Redis service; `management.health.redis.enabled=false` so unused Redis cannot fail `/actuator/health`.

### [HEALTH-SHALLOW] / [CROSS-002] `/api/v1/health` is static UP
- Severity: P2/P3
- Evidence: `HealthService` hardcoded `UP`. Compose probes `/actuator/health` (better).
- Fix: Document actuator as readiness; or split liveness/readiness.

**Status:** FIXED 2026-09-18 — `HealthService` pings DataSource; actuator Redis health disabled (see `COMPOSE-REDIS-UNUSED`).

Other ops P2/P3: ElastiCache transit encryption `preferred` (P2), tfstate public-access block (P2), `HOST_NGINX.md` `pharmacy.` (P2). Cashfree env example vs TF and unused `PUBLIC_BASE_URL` are P3 **FIXED**.

---

## Wave 0 severity tally (this file)

| Sev | Count | Notes |
|---|---:|---|
| P0 | 1 | OPS-EMAIL-URL (real launch if prod emails fire). D-006 is blocked, not counted as a code P0. |
| P1 | 8 | AUTH-ADM-001, UX-ADM-001, STATE-DISP-01, UX-DISP-01, SEC-001 residual, SECRET-SSM-WHATSAPP, TF-SNAPSHOT, TF-SSH-EXAMPLE (+ OPS-STORAGE as data P1) |
| P2 | ~16 | webhooks skew, tenant soft-delete, jobs TX, Orders vs D-008, banners, inbox, redis unused, … |
| P3 | ~12 | CSRF, Flyway docs, health envelope, leftover folders, … |

Exact backlog IDs and effort land in `08-fix-backlog.md` after all waves.
