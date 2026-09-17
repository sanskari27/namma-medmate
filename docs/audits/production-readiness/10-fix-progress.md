# Audit fix progress

Updated: 2026-09-17
Policy: restore story chrome; no tracker edits; no out-of-scope.

| ID | Status | Slice | Apps | Tests | Gates | Notes |
|---|---|---|---|---|---|---|
| M3-SAFE-001 | FIXED | A | server + dispensary | see below | see Slice A gates | alias M6-SAFE-001 |
| M6-SAFE-001 | FIXED | A | server + dispensary | alias of M3-SAFE-001 | same | closed with canonical |
| M10-WA-001 | FIXED | B | server | see Slice B close-out | see Slice B close-out | Graph template.name = Meta unique name |
| M10-WA-002 | FIXED | B | server | same | same | Graph components body variables |
| OPS-EMAIL-URL | FIXED | C | infra + server | see Slice C close-out | see Slice C close-out | aliases M1-PWD-001, M2-REG-001, M11-MAIL-001 |
| M1-PWD-001 | FIXED | C | infra + server | alias of OPS-EMAIL-URL | same | closed with canonical |
| M2-REG-001 | FIXED | C | infra + server | alias of OPS-EMAIL-URL | same | closed with canonical |
| M11-MAIL-001 | FIXED | C | infra + server | alias of OPS-EMAIL-URL | same | closed with canonical |
| M6-OFFER-001 | FIXED | D | dispensary | see Slice D close-out | see Slice D close-out | POST offers on Proceed + Charge |
| M6-POS-001 | FIXED | E | dispensary | see Slice E close-out | see Slice E close-out | live Proceed/Charge + remounted chrome |
| M6-POS-002 | FIXED | E | dispensary | same | same | line MRP/selling |
| M6-GST-001 | FIXED | E | dispensary | same | same | GSTIN / IGST / override / line discount |
| M6-PDF-001 | FIXED | E | dispensary | same | same | Print/Send/New sale after Charge |
| UX-POS-001 | FIXED | E | dispensary | alias of M6-PDF-001 | same | post-Charge New sale |
| M6-PAY-002 | FIXED | E | dispensary | same | same | retender after pricing; APPROVAL_REQUIRED copy |
| M6-PAY-001 | FIXED | Band 2 | dispensary | see Band 2 close-out | see Band 2 close-out | mixed Cash/UPI/Card/Bank/Khata amounts |
| M6-HOLD-001 | FIXED | Band 2 | dispensary | same | same | held strip + resume on till |
| UX-POS-005 | FIXED | Band 2 | dispensary | same | same | header + New sale dispatches newSale |
| UX-POS-006 | FIXED | Band 2 | dispensary | same | same | Back after COMPLETED does not PATCH |
| M6-RX-001 | FIXED | Band 2 | dispensary | same | same | remaining fill + required Rx reference |
| M6-TEST-001 | FIXED | Band 2 | dispensary | same | same | POS tests use Proceed/Charge chrome |
| M4-FEFO-001 | FIXED | Band 2 | dispensary | same | same | FEFO option; near-expiry banner; no empty batch |
| UX-POS-004 | FIXED | Band 2 | dispensary | alias of M4-FEFO-001 | same | closed with FEFO empty-option drop |
| M9-DASH-001 | FIXED | F | server + dispensary | see Slice F close-out | see Slice F close-out | default desk, not OWNER |
| M1-AUTH-001 | FIXED | G | dispensary + admin | see Slice G close-out | see Slice G close-out | wrong-app logout + forget + filter |
| AUTH-ADM-001 | FIXED | H | admin | see Slice H close-out | see Slice H close-out | idle lock during support |
| M1-PIN-002 | FIXED | H | admin | alias of AUTH-ADM-001 | same | closed with canonical |
| M1-PWD-003 | FIXED | I | server + admin | see Slice I close-out | see Slice I close-out | no password/PIN rotate while acting |
| M1-IMPERSON-002 | FIXED | J | admin + server | see Slice J close-out | see Slice J close-out | HQ chrome/authz MASTER; pharmacy APIs acting |
| M1-IMPERSON-001 | WONTFIX | — | — | 09-out-of-scope D-001 | — | residual; do not add audit |
| M1-WF-001 | FIXED | Band 1 leftover | server + admin | see leftover close-out | see leftover close-out | platform rule fallback at POS |
| M2-LIFE-001 | FIXED | Band 1 leftover | server | see leftover close-out | see leftover close-out | EXPIRED/CANCELLED + expiry job lock floor |
| M1-IMPERSON-004 | FIXED | K | server | see Slice K close-out | see Band 1 gates | Enter refused on non-ACTIVE tenant |
| SEC-NEW-001 | FIXED | K | server | same | same | TERMINATED acting JWT rejected except Exit/logout |
| M1-BRANCH-001 | FIXED | M | dispensary | see Slice M close-out | same | alias UX-DISP-01 |
| UX-DISP-01 | FIXED | M | dispensary | alias of M1-BRANCH-001 | same | closed with canonical |
| M1-BRANCH-002 | FIXED | M | dispensary | same | same | alias STATE-DISP-01; Outlet keyed on branch |
| STATE-DISP-01 | FIXED | M | dispensary | alias of M1-BRANCH-002 | same | closed with canonical |
| STATE-POS-001 | FIXED | M | dispensary | same | same | outlet switch clears POS draft |
| M2-KIOSK-001 | FIXED | P | server + dispensary | see Slice P close-out | same | ticket reserves stock via issue(); cancel restocks |
| M2-KIOSK-002 | FIXED | P | server + dispensary | same | same | idempotency key unique + Place order |
| M2-KIOSK-003 | FIXED | P | server + dispensary | same | same | bcrypt PIN; never echo; EXIT_PIN_REQUIRED |
| M2-KIOSK-004 | FIXED | P | server + dispensary | same | same | catalogue = on-hand; drop onlineListed prefer |
| M2-LIFE-002 | FIXED | Q | dispensary | see Slice Q close-out | same | hydrate /me on focus |
| SEC-NEW-002 | FIXED | Q | server + dispensary | same | same | register duplicate = 401 INVALID_CREDENTIALS |
| SEC-NEW-003 | FIXED | Q | server | same | same | IP throttle 20/min (test 10000) |
| PII-001 | FIXED | Q | server | same | same | saved-login email mask |
| SEC-NEW-004 | FIXED | Q | server | same | same | prometheus MASTER-only matcher |
| SEC-NEW-005 | FIXED | Q | infra | same | same | nginx HSTS + CSP frame-ancestors |
| M11-CF-002 | FIXED | R | dispensary | see Slice R close-out | same | PENDING copy + reuse checkout key |
| M11-CF-008 | FIXED | R | admin + server | same | same | MASTER POST reconcile |
| M5-PO-002 | FIXED | Band 3 | server + dispensary | see Band 3 close-out | see Band 3 close-out | POST /purchase-orders/receive-bill |
| M5-PO-003 | FIXED | Band 3 | server | same | same | close PO when remaining qty 0 |
| M5-GRN-002 | FIXED | Band 3 | server + dispensary | same | same | free qty as 0-rate line |
| M5-GRN-001 | FIXED | Band 3 | dispensary | same | same | Record delivery against outstanding |
| M5-PO-001 | FIXED | Band 3 | dispensary | same | same | Bills + Open indents desk |
| M5-REO-001 | FIXED | Band 3 | dispensary | same | same | Draft from this outlet reorder + PLAN_LIMIT |
| M5-QC-001 | FIXED | Band 3 | dispensary | same | same | QC deep-link; Accept pharmacist/OWNER |
| M5-RET-001 | FIXED | Band 3 | dispensary | same | same | Open debit note after QC reject |
| M5-KHATA-001 | FIXED | Band 3 | dispensary | same | same | dues strip + PLAN_LIMIT CTA |
| M5-KHATA-002 | FIXED | Band 3 | server | same | same | FIFO remaining slices on /suppliers/dues |
| M5-SUP-002 | FIXED | Band 3 | dispensary | same | same | live Purchases + Distributors tests |
| M8-AGE-001 | FIXED | Band 3 | dispensary | same | same | render server FIFO buckets |
| M8-GST-001 | FIXED | Band 3 | dispensary | same | same | GST in spend (inclusive) |
| M8-BOOK-001 | FIXED | Band 3 | server | same | same | P&L taxable revenue |
| M8-EXP-001 | FIXED | Band 3 | dispensary | same | same | confirm before delete posted spend |
| M8-EXP-002 | FIXED | Band 3 | server | same | same | expense today = IST |
| M8-EXP-003 | FIXED | Band 3 | dispensary | same | same | receipt evidence local file state |
| OWN-EXP-001 | FIXED | Band 3 | dispensary | same | same | all-outlets require outlet pick |
| M8-CA-001 | FIXED | Band 3 | dispensary | same | same | Download PDF pack; drop filing language |
| OWN-CA-002 | FIXED | Band 3 | dispensary | same | same | GST toggle off when GSTR omitted |
| M8-TEST-001 | FIXED | Band 3 | dispensary | same | same | expenses/aging/CA tests on live chrome |
| M7-REG-001 | FIXED | Band 3 | server | same | same | compliance NEAR_EXPIRY ungated |
| M3-CRM-001 | FIXED | Band 4 | dispensary | see Band 4 close-out | see Band 4 close-out | remount merge/family/refill/tags/loyalty |
| M3-CRM-002 | FIXED | Band 4 | server | same | same | EXECUTE moves sales/khata/loyalty/history |
| M3-CREDIT-001 | FIXED | E | dispensary | see Slice E close-out | see Slice E close-out | khata remaining on patient pick |
| M3-LOY-001 | FIXED | E | dispensary | same | same | Use points + OWNER adjust |
| M3-REFILL-001 | FIXED | Band 4 | dispensary | see Band 4 close-out | see Band 4 close-out | due strip Customers + till |
| M3-FAM-001 | FIXED | Band 4 | dispensary | same | same | family visibility + member settle |
| M3-CRM-003 | FIXED | Band 4 | dispensary | same | same | CRM tests on live chrome |
| M4-SKU-001 | FIXED | Band 4 | dispensary | same | same | empty catalogue → Add product |
| M4-RCV-001 | FIXED | Band 4 | dispensary | same | same | Receive stock / batches / movements |
| M4-EXP-001 | FIXED | Band 4 | server | same | same | expiring filter uses warn days |
| M4-ADJ-001 | FIXED | Band 4 | dispensary | same | same | confirm before send/approve |
| M4-TAKE-001 | FIXED | Band 4 | dispensary | same | same | Start count OWNER-only |
| M4-TEST-001 | FIXED | Band 4 | dispensary | same | same | inventory tests on live floor |
| M9-DASH-002 | FIXED | Band 4 | dispensary | same | same | owner widgets on live home |
| M9-DASH-003 | FIXED | Band 4 | server + dispensary | same | same | dues hero = rupees |
| M9-DASH-004 | FIXED | Band 4 | dispensary | same | same | drills to /orders and invoice |
| M9-DASH-005 | FIXED | Band 4 | server | same | same | home charts Growth gate |
| M9-DASH-006 | FIXED | Band 4 | dispensary | same | same | Free aging = PLAN_LIMIT wall |
| M9-DASH-007 | FIXED | Band 4 | server | same | same | low-stock glance includes 0 on-hand |
| M9-DASH-009 | FIXED | Band 4 | dispensary | same | same | FAILED sources: unavailable |
| OWN-NAV-001 | FIXED | Band 4 | dispensary | same | same | Restock href ?view=guidance |
| OWN-NAV-003 | FIXED | Band 4 | server + dispensary | same | same | all-outlets Stock tenant overview |
| OWN-NAV-004 | FIXED | Band 4 | dispensary | same | same | all-outlets Transfers require outlet |
| OWN-SUB-001 | FIXED | Band 4 | dispensary | same | same | FREE card hides Monthly billing |
| M10-ROUTE-001 | FIXED | Band 4 | server | same | same | write notification_role_assignment |
| M10-ROUTE-002 | FIXED | Band 4 | server | same | same | five silent matrix producers |
| M10-WA-007 | FIXED | Band 4 | admin | same | same | Ping provider (templates unchanged) |
| M7-LIC-001 | FIXED | Band 4 | server + dispensary | same | same | STAFF_LICENSE → /account; pharmacist view |
| M7-REG-002 | FIXED | Band 4 | dispensary | same | same | Register / NDPS / Schedule / GST books |
| M7-TEST-001 | FIXED | Band 4 | dispensary | same | same | M7 tests register live Redux |
| UX-ADM-DASH-001 | FIXED | Band 4 | admin | same | same | HQ KPIs from KYC/pharmacy/subs lists |
| M11-CF-003 | FIXED | R | dispensary | see Slice R close-out | see Slice R close-out | checkout copy + tests already live |
| M10-WA-003 | FIXED | Band 5 | infra | see Band 5 close-out | see Band 5 close-out | alias SECRET-SSM-WHATSAPP |
| SECRET-SSM-WHATSAPP | FIXED | Band 5 | infra | alias of M10-WA-003 | same | closed with canonical |
| TF-SNAPSHOT | FIXED | Band 5 | infra | same | same | skip_final_snapshot false + deletion_protection |
| TF-SSH-EXAMPLE | FIXED | Band 5 | infra | same | same | example SSH /32, not world-open |
| OPS-STORAGE | BLOCKED | Band 5 | infra | 09-out-of-scope D-006 | — | file backup policy waits on NFR |
| M5-REO-002 | FIXED | Band 5 | server | same | same | last purchase price this branch |
| M2-KYC-002 | FIXED | Band 5 | admin | same | same | evidence Open via blob + cookie |
| SEC-NEW-006 | WONTFIX | Band 5 | server | owner | — | keep cookie + Bearer; owner if cookie-only |
| SEC-NEW-007 | FIXED | Band 5 | server + dispensary | same | same | GET status read-only; POST reconcile |
| PIN-DISP-02 | FIXED | P2 Auth | dispensary + admin | alias of M1-PIN-003 | same | 4h abandon |
| M1-PIN-003 | FIXED | P2 Auth | dispensary + admin | see P2 Auth close-out | see P2 Auth close-out | 4h abandon after lock |
| M1-PIN-004 | FIXED | P2 Auth | server | same | same | PIN unlock keeps act_* |
| M1-BRANCH-003 | FIXED | P2 Auth | server | same | same | JWT filter re-checks assignment |
| M1-IMPERSON-003 | FIXED | P2 Auth | admin | same | same | exit remounts Support |
| TENANT-001 | FIXED | P2 Auth | server | same | same | deleted/missing tenant locked |
| SEC-003 | FIXED | P2 Auth | server | same | same | prod fail-fast insecure cookie |
| M2-REG-002 | FIXED | P2 Auth | server + dispensary | same | same | used verify → Sign in |
| M2-KYC-001 | FIXED | P2 Auth | server + dispensary | same | same | HQ copy + KYC notify |
| M2-LIFE-003 | FIXED | P2 Auth | dispensary | same | same | lock nav + redirect /account |
| M2-PLAN-001 | FIXED | P2 Auth | dispensary | same | same | Pro/Free copy, no hospital |
| M2-LIFE-004 | FIXED | P2 Auth | server + admin | same | same | KYC-pending Suspend/Terminate |
| UX-ADM-002 | FIXED | P2 Auth | admin | same | same | VA rail MASTER-filtered |
| SEC-002 | FIXED | P2 Integrations | server | see P2 Integrations/ops close-out | delta | alias M11-CF-001; HMAC + 5min skew |
| M11-CF-001 | FIXED | P2 Integrations | server | alias of SEC-002 | same | closed with canonical |
| M11-CF-004 | FIXED | P2 Integrations | dispensary | same | same | payment return keeps success banner |
| M11-CF-005 | FIXED | P2 Integrations | infra | same | same | CASHFREE_ENV=production in .env.prod.example |
| M11-MAIL-003 | FIXED | P2 Integrations | server | same | same | ONBOARDING/INVOICE_COPY HTML escaped |
| M11-CF-006 | FIXED | P2 Integrations | dispensary | same | same | PlanStatusBanner alert vs status |
| JOB-001 | FIXED | P2 Jobs/ops | server | same | same | per-tenant REQUIRES_NEW |
| COMPOSE-REDIS-UNUSED | FIXED | P2 Jobs/ops | compose | comment | — | Redis unused by sessions; keep service |
| HEALTH-SHALLOW | FIXED | P2 Jobs/ops | server | same | same | /health pings DataSource |
| TF-REDIS-CRYPTO | FIXED | P2 Jobs/ops | infra | terraform | — | replication group + transit encryption preferred |
| TF-S3-STATE | FIXED | P2 Jobs/ops | infra | terraform | — | tfstate public access block |
| COMPOSE-DOC-DRIFT | FIXED | P2 Jobs/ops | docs | — | — | HOST_NGINX pharmacy. host |
| UX-vs-CONTRACT-01 | FIXED | P2 Jobs/ops | dispensary | same | same | Orders = counter/kiosk; hide Online |
| UX-POS-002 | WONTFIX | P2 POS/UX | dispensary | existing Proceed-disabled | — | by design: Proceed needs customer/walk-in |
| UX-POS-003 | FIXED | P2 POS/UX | dispensary | see P2 remainder close-out | see P2 remainder close-out | search form Enter + restore focus |
| M6-NET-001 | FIXED | P2 POS/UX | dispensary | same | same | health ping while online; focus on UP |
| M6-PAY-003 | FIXED | P2 POS/UX | dispensary | same | same | PATCH DRAFT before Charge/Hold |
| UX-DISP-04 | FIXED | P2 POS/UX | dispensary | same | same | dead header search removed |
| UX-CRM-002 | FIXED | P2 CRM | dispensary + server | same | same | merge preview linked-record copy |
| UX-CRM-003 | FIXED | P2 CRM | dispensary + server | same | same | family picker hides other households |
| UX-CRM-005 | FIXED | P2 CRM | dispensary | same | same | POS 409 phone fills search |
| M3-HIST-001 | FIXED | P2 CRM | dispensary | same | same | named-customer purchases use /history |
| M3-CREDIT-002 | FIXED | P2 CRM | server + dispensary | same | same | aging buckets = /aging D61_90 D90_PLUS |
| M3-CAMP-001 | FIXED | P2 CRM | dispensary | same | same | campaign save uses chosen template slot |
| M4-CTRL-001 | FIXED | P2 Inventory | dispensary | same | same | schedule export ≠ NDPS sale sheet |
| M4-ONLINE-001 | FIXED | P2 Inventory | dispensary | same | same | hide Online listing (D-008) |
| M4-UOM-001 | FIXED | P2 Inventory | dispensary | same | same | convert fail does not packSize-fallback |
| M4-MONEY-001 | FIXED | P2 Inventory | dispensary | same | same | floor MRP two rupee decimals |
| M4-COMP-001 | WONTFIX | P2 Inventory | — | D-011 TEXT | — | unstructured composition; not a missing column |
| M5-PO-004 | FIXED | P2 Procurement | server | same | same | ISSUED qty until first GRN; GRN → PO_HAS_RECEIPTS |
| M5-GRN-003 | FIXED | P2 Procurement | server + dispensary | same | same | invoice date not stuffed into ETA |
| M5-QC-002 | FIXED | P2 Procurement | server | same | same | OWNER QC intentional (pharmacist or owner) |
| M5-RET-002 | FIXED | P2 Procurement | dispensary | same | same | Sale returns vs Stockist debit notes |
| M5-KHATA-003 | FIXED | P2 Procurement | dispensary | same | same | confirm pay vs outstanding |
| M5-KHATA-004 | FIXED | P2 Procurement | dispensary | same | same | stockist ledger lines on pay dialog |
| M5-SUP-001 | FIXED | P2 Procurement | dispensary | same | same | PAN, credit limit, bank on master |
| M8-AGE-002 | FIXED | P2 Finance | dispensary | same | same | Excel/CSV FIFO bucket columns |
| M8-CA-002 | FIXED | P2 Finance | dispensary | same | same | advisors keyed by tenantId |
| M8-CA-003 | FIXED | P2 Finance | dispensary | same | same | in-page All outlets vs this outlet |
| M8-BOOK-002 | FIXED | P2 Finance | dispensary | same | same | party/payment chips tagged; drop item |
| M8-BOOK-003 | FIXED | P2 Finance | server | already stored GSTIN | — | gstr1 uses invoice customerGstin |
| M8-EXP-004 | FIXED | P2 Finance | server | same | same | GST inclusive HALF_UP |
| M9-DASH-010 | FIXED | P2 Reports | server + dispensary | same | same | IST as-of from generatedAt |
| M9-DASH-011 | FIXED | P2 Reports | server + dispensary | same | same | drop Online home channel (D-008) |
| M9-DASH-012 | FIXED | P2 Reports | dispensary | same | same | pending GRN/approvals on New purchase |
| M9-TREND-001 | FIXED | P2 Reports | dispensary | same | same | denied copy = Reporting |
| M9-CUST-001 | FIXED | P2 Reports | dispensary | same | same | export CSV; preview formatPaise |
| M9-TEST-001 | FIXED | P2 Reports | server | same | same | home KPI assembly test |
| M7-NDPS-001 | FIXED | P2 Compliance | dispensary | same | same | kiosk catalogue drops controlled SKUs |
| M7-LIC-002 | FIXED | P2 Compliance | admin | same | same | Isolate = display-only filter copy |
| M7-LIC-003 | FIXED | P2 Compliance | server | same | same | GET /due read-only; scan job writes |
| M10-INBOX-001 | FIXED | P2 Notifications | dispensary + admin | same | same | unreadCount decrement, not page recount |
| M10-ROUTE-003 | FIXED | P2 Notifications | server | same | same | approval staffHref /approvals/pending |
| M10-ROUTE-004 | FIXED | P2 Notifications | server + admin | same | same | MASTER hrefs + HQ whitelist |
| M10-INBOX-002 | FIXED | P2 Notifications | server | same | same | role/module strip revokes sources |
| M10-INBOX-003 | FIXED | P2 Notifications | server | same | same | sourceRecordId + typed hrefs |
| M10-ROUTE-005 | FIXED | P2 Notifications | server | same | same | low-stock rising-edge; restock retires key |
| M10-WA-004 | FIXED | P2 Notifications | server | same | same | credit-due once while balance > 0 |

Status: OPEN | IN_PROGRESS | FIXED | BLOCKED | WONTFIX (cite 09-out-of-scope)

Current slice: remaining P2 compact groups — FIXED. Next picker: P3.
Blocked on user: SEC-NEW-006 (cookie-only needs owner). M1-IMPERSON-001 WONTFIX (D-001). M4-COMP-001 WONTFIX (unstructured TEXT / D-011). UX-POS-002 WONTFIX (Proceed disabled until customer/walk-in). D-013 still tracker-blocks M1-S09. D-006 still tracker-blocks M12-S01 and OPS-STORAGE file-backup policy.

## P2 remainder close-out (2026-09-18)

No commit requested. All remaining compact P2 groups after Auth + Integrations/ops.

- POS: search Enter + restore focus; health ping while online; PATCH DRAFT before Charge/Hold; dead header search removed. Proceed still needs customer/walk-in (`UX-POS-002` by design).
- CRM: merge linked-record copy; family picker; POS 409 phone fills search; named-customer `/history`; aging keys `D61_90`/`D90_PLUS`; campaign template slot.
- Inventory: Schedule stock sheet ≠ NDPS sale book; hide Online listing; convert fail does not packSize-fallback; floor MRP two decimals. `M4-COMP-001` WONTFIX (unstructured TEXT / D-011).
- Procurement: ISSUED qty correction until first GRN; receipts → 409 `PO_HAS_RECEIPTS`; invoice date not stuffed into ETA; OWNER QC intentional; Sale returns vs Stockist debit notes; pay confirm + ledger; PAN/credit/bank on supplier.
- Finance/reports: FIFO CSV buckets; tenant-keyed CA advisors + All outlets; book chips tagged; GSTR-1 uses stored GSTIN; GST HALF_UP; IST as-of; no Online home channel; GRN/approval counts; Reporting denied copy; CSV not Excel.
- Compliance: kiosk drops controlled SKUs; HQ licence isolate is display-only; `GET /due` read-only.
- Notifications: unread decrement; approval `/approvals/pending`; MASTER href whitelist; role strip revokes sources; `sourceRecordId`; low-stock rising-edge; credit-due once while positive.
- Integrations/ops: recorded in the close-out below.

Delta tests: CRM 66; inventory+POS convert 87; PO/GRN 17 after ISSUED-qty restore; notifications 74; admin licence+inbox 22; finance aging/CA/dashboard/expense/home KPI.

Listed gates (server then SPA, sequential):

- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw spotless:check test` — spotless applied (18 files). Tests run: 975, Failures: 1 **not this slice**: `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility` HEAD seed. GoodsReceipt over-receipt qty correction green after ISSUED-without-GRN PATCH.
- `cd dispensary && npm run lint` — HEAD unused-import residuals (account/credit/distributors/offers).
- `cd dispensary && npm run test -- --run` — 115 failed / 573 passed — HEAD screens missing slice reducers (branches/offers/returns/credit/staff/…). P2 POS/inventory/CRM/distributors delta suites green.
- `cd dispensary && npm run build` — HEAD `tsc` residuals (account/credit/distributors/inventory.replaceAll/orders/shop-books).
- `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 200 passed; vite build ok.
- `make compose-config` — ok.
- `node --test scripts/validate-requirements.test.mjs` then `node scripts/validate-requirements.mjs` — 71 stories valid.

Out of scope: P3; D-013/M1-S09; D-006/M12-S01; D-001 audit; Redis still in Compose (sessions Postgres); kiosk NDPS filter is client-only.

## P2 Integrations / jobs/ops close-out (2026-09-18)

No commit requested.

- Cashfree/Resend HMAC still constant-time; timestamps older than 5 minutes are rejected (`Clock` injected).
- Subscription `?payment=` skips the parallel catalogue load; fulfilled load does not clear `success`. Failure banners use `role="alert"`.
- Scanners `scanAll` is not one platform TX; each tenant is `REQUIRES_NEW` via a lazy self-proxy.
- `/api/v1/health` pings the DataSource; envelope unchanged. Redis stays in Compose (sessions are Postgres).
- ElastiCache is a single-node replication group with transit encryption `preferred` (cluster API cannot TLS Redis). Tfstate bucket blocks public access. Nginx doc host is `pharmacy.`.
- Orders nav is counter/kiosk history; Online filter hidden (D-008 Phase 2).

Delta tests: server unit + `TESTCONTAINERS_RYUK_DISABLED=true` `CashfreeBillingTest,ResendWebhookTest`; dispensary `SubscriptionScreen.test.tsx` + `OrdersScreen.utils.test.ts`.

## Band 5 close-out (2026-09-17)

No commit requested. Remaining P1 ops / isolation / security.

- SSM seed + `.env.prod.example` + tfvars include `META_WHATSAPP_*`. Existing blobs still `ignore_changes` — one-time `update-prod-env.sh set`.
- Prod RDS: `skip_final_snapshot` default false, `deletion_protection = true`, final snapshot identifier when not skipping. SSH example is `203.0.113.10/32`, not world-open.
- Reorder last price fallback is batches on-hand at this `branch_id`, not tenant-wide. Annex with no local purchase stays unmapped.
- HQ KYC “Open evidence” fetches the file with axios `withCredentials` and opens a blob URL (button, not a raw API href).
- OWNER Cashfree GET is status only; POST `/api/v1/subscriptions/payments/cashfree/reconcile?orderId=` applies provider PAID. Dispensary return poll uses POST.
- `OPS-STORAGE` file-backup policy remains BLOCKED on D-006. `SEC-NEW-006` WONTFIX: cookie + Bearer stay until owner asks cookie-only.

Tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=ProdOpsSeedTest,ReorderToDraftTest,CashfreeBillingTest test` — Tests run: 18, Failures: 0, BUILD SUCCESS. `CashfreeBillingRollbackTest` included in full suite (2 passed).

`cd admin && npm run test -- --run src/screens/kyc-queue/tests/KycQueueScreen.test.tsx src/screens/subscriptions/tests/SubscriptionsScreen.test.tsx` — 10 + 16 passed. `cd dispensary && npm run test -- --run src/screens/subscription/tests/SubscriptionScreen.test.tsx` — 11 passed.

Listed gates (server then SPA, sequential):

- `cd server && ./mvnw spotless:check` — HEAD residuals (kiosk/inventory/expense/credit/auth). Band 5 Java Spotless-clean.
- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 951, Failures: 1 **not this slice**: `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility` HEAD seed.
- `cd dispensary && npm run lint` — HEAD unused-import residuals. Band 5 `subscriptions.ts` eslint clean.
- Full dispensary suite 120 failed / 542 passed — HEAD screens missing slice reducers, predates this band. Subscription 11 green.
- `cd dispensary && npm run build` — HEAD `tsc` residuals. Band 5 file typed clean.
- `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 194 passed; vite build ok.
- `make compose-config` — ok.
- `node --test scripts/validate-requirements.test.mjs` then `node scripts/validate-requirements.mjs` — 71 stories valid.

Browser (localhost:5174 MASTER): KYC queue Malleshwaram Drugs — Open evidence is a button (not a raw API link). Demo file missing locally → “Could not open evidence. Try again.” Session cookie fetch ran (Opening… then failure copy). Terraform/SSM not live-applied.

Out of scope: P2+; D-013/M1-S09; D-006/M12-S01 file-backup policy; D-001 audit; cookie-only auth without owner.

## P2 Auth / layout close-out (2026-09-17)

No commit requested. First P2 compact group (auth, cookies, KYC lock chrome).

- PIN idle: 4h after lock → login + abandoned (both SPAs). Unlock while impersonating keeps `act_*` on the new JWT.
- JWT filter nulls session branch when `canAccessBranch` is false; planted foreign `activeBranchId` → 422 `NO_ACTIVE_BRANCH`.
- Soft-deleted / missing tenant → 403 `TENANT_LOCKED` (allowlist `/me` unchanged). Prod profile fail-fast if `secure-cookie=false`.
- Used verify link → 409 `EMAIL_ALREADY_VERIFIED` + Sign in. OWNER KYC copy names HQ; submit notifies OWNER+MASTER (`KYC pack waiting`).
- Non-ACTIVE floor: rail = Account (Subscription after KYC); other paths redirect `/account`. Free card is POS/GST only; Pro tagline `Kiosk & more`.
- KYC-pending tenants: Suspend/Terminate (not Active/Expired). VA rail: Dashboard / KYC / Staff approvals. Exit support remounts `/support`.

Tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=AuthServiceTest,AuthImpersonationTest,TenantStatusTransitionTest,TenantLifecycleTest,TenantRegistrationTest,BranchAssignmentTest,NotificationRoutingMatrixTest,NotificationRoutingTest,TenantKycTest,ProdSecureCookieGuardTest test` — Tests run: 120 then 29 after assertion fix, Failures: 0, BUILD SUCCESS.

`cd dispensary && npm run test -- --run src/layouts/DashboardLayout.pin.test.tsx src/layouts/DashboardLayout.test.tsx src/screens/verify-email/tests/VerifyEmailScreen.test.tsx src/screens/account/tests/AccountScreen.test.tsx src/screens/subscription/tests/SubscriptionScreen.utils.test.ts` — 38 passed.

`cd admin && npm run test -- --run src/layouts/DashboardLayout.pin.test.tsx src/layouts/DashboardLayout.impersonation.test.tsx src/screens/pharmacies/tests/PharmaciesScreen.test.tsx` — 22 passed.

Listed gates (server then SPA, sequential):

- `cd server && ./mvnw spotless:check` — HEAD residuals (kiosk/inventory/expense/credit/auth). P2 Auth Java Spotless-clean (`TenantStatusTransitionTest`, `SecurityConfig`).
- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 958, Failures: 1 **not this slice**: `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility` HEAD seed.
- `cd dispensary && npm run lint` — HEAD unused-import residuals. P2 Auth files eslint clean.
- Full dispensary suite 120 failed / 547 passed — HEAD screens missing slice reducers, predates this band. Auth/layout 38 green.
- `cd dispensary && npm run build` — HEAD `tsc` residuals. `routes.const.ts` typed clean after `Set<string>` lock paths.
- `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 198 passed; vite build ok.
- `make compose-config` — ok.
- `node --test scripts/validate-requirements.test.mjs` then `node scripts/validate-requirements.mjs` — 71 stories valid.

Browser: VA (`verify.agent@nammamedmate.local`) rail Dashboard / KYC / Staff approvals only. MASTER Pharmacies: Pending Chemist Jayanagar + other Verification required rows show Suspend + Terminate. OWNER `/subscription`: Free `Core billing — free forever` + Billing/POS & GST only; Pro `Kiosk & more` (no Hospital). PIN unlock on MASTER resumed. 4h abandon, verify-link replay, and KYC-lock redirect not live-clicked (tests cover).

Out of scope: remaining P2 compact (POS/UX, CRM, inventory, procurement, finance, compliance, notifications, integrations, jobs); P3; D-013/M1-S09; D-006/M12-S01; D-001 audit.

## Band 4 close-out (2026-09-17)

No commit requested. P1 CRM, inventory, home, notifications, nav, HQ pulse.

- Customers: due-refill strip; name opens merge/family/refill/tags/loyalty/khata/doctors. Merge EXECUTE repoints sales, khata, loyalty, history, refill, tags, family.
- Inventory: Add product; Receive stock; expiring uses warn days; adj confirm; Start count OWNER-only; all-outlets Stock sums tenant on-hand (Receive hidden); Transfers copy asks to pick an outlet.
- Home: owner widgets; dues hero rupees; Restock `/inventory?view=guidance`; recent sales `/orders`; analytics PLAN_LIMIT wall; FAILED unavailable.
- Nav: Register book / NDPS sale book / Schedule stock book / Shop GST books. FREE hides Monthly billing. STAFF_LICENSE href `/account`; pharmacist STAFF licence read-only.
- Notifications: role assign writes `notification_role_assignment`; producers ITEM_EXPIRY, SUPPLIER_DUE, ACCOUNT_CREATED, PLAN_LIMIT, SUBSCRIPTION_EXPIRY.
- Admin: tenant pulse counts from lists; WABA “Ping provider (templates unchanged)”.

Tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=CustomerMergeTest,CustomerMergeRollbackTest,InventoryGuidanceTest,AccessRoleTest,NotificationRoutingTest,RoleDashboardTest,PurchaseReturnTest,LicenseTest test` — Band 4 classes green (`InventoryGuidanceTest#allOutletsOverviewSumsBranchStock_OWN_NAV_003` passed). Full `./mvnw test` earlier: Tests run: 945, Failures: 1 **not this slice** (`ExpenseTest.ac01_systemCategoriesAndCustomExtensibility` HEAD seed).

`cd dispensary && npm run test -- --run src/screens/customers/tests/CustomersScreen.test.tsx src/screens/customers/tests/CustomersScreen.utils.test.ts src/screens/inventory/tests/InventoryScreen.test.tsx src/screens/inventory/tests/QualityCheckWorkspace.test.tsx src/screens/inventory/tests/PurchaseReturnWorkspace.test.tsx src/screens/dashboard/tests/DashboardScreen.test.tsx src/screens/dashboard/tests/DashboardDesk.test.tsx src/screens/account/tests/AccountScreen.test.tsx src/screens/licenses/tests/LicensesScreen.test.tsx src/screens/subscription/tests/SubscriptionScreen.test.tsx src/layouts/DashboardLayout.test.tsx` — 189+8 account + 76 inventory (Account 8 after live Redux wrap). PurchaseReturnWorkspace 9 passed.

Listed gates (server then SPA, sequential):

- `cd server && ./mvnw spotless:check` — HEAD residuals (kiosk/inventory/expense/credit/auth). Band 4 Java applied.
- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 945, Failures: 1 **not this slice**: `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility`.
- `cd dispensary && npm run lint` — HEAD unused-import residuals (account/credit/distributors/offers). Band 4 files eslint clean.
- Full dispensary suite 137 failed / 525 passed — HEAD screens missing slice reducers, predates this band. Band 4 CRM/inventory/dashboard/account/licence/nav suites green.
- `cd dispensary && npm run build` — HEAD `tsc` residuals (account/credit/distributors/inventory.format/offers/orders/shop-books). Band 4 inventory.thunks typed clean.
- `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 193 passed; vite build ok.
- `make compose-config` — ok.
- `node --test scripts/validate-requirements.test.mjs` then `node scripts/validate-requirements.mjs` — 71 stories valid.

Browser (localhost:5173 owner, Indiranagar): Customers Due refills (12); Fam Parent Smoke opens Merge duplicate / Link member / family / refill / tags / points. Inventory Receive stock + Add product; Physical count Start count; nav Register book / NDPS sale book / Shop GST books. All outlets Stock: 110 SKUs / 1,49,487 units, no Receive stock; Transfers: Select an outlet before managing floor stock. Home Restock → `/inventory?view=guidance`; recent invoices → `/orders`; owner widgets Stockist dues / Transfers / Licences due. Licences Add licence + pharmacist paper. HQ: Tenant pulse cards labeled; live pulse failed while session idle-locked (tests wire counts). WABA copy Ping provider (templates unchanged).

Out of scope: Band 5+; D-013/M1-S09; D-006/M12-S01; D-001 audit.

## Band 3 close-out (2026-09-17)

No commit requested. P1 money desks: purchases, aging, GST, expenses, CA pack, compliance near-expiry.

- `POST /api/v1/purchase-orders/receive-bill` one key; free qty as 0-rate line; PO CLOSED when remaining 0
- Indent desk: Bills | Open indents; New indent; Issue; Record delivery qty ≤ remaining; Draft from reorder + PLAN_LIMIT
- QC deep-link `/inventory?view=qc&receiptId=`; Accept pharmacist or OWNER; Open debit note after reject
- `/suppliers/dues` FIFO remaining slices; Distributors overdue strip + PLAN_LIMIT CTA
- Aging floor renders server buckets; expense today IST; P&L “Taxable revenue”; expense GST card “GST in spend (inclusive)”
- Expenses: confirm delete; evidence file local; all-outlets require outlet pick
- CA: Download PDF pack; GST switch off when GSTR1/GSTR3B omitted
- Compliance `NEAR_EXPIRY` ungated (`capability(ComplianceReportKey)` null); finance Starter gate unchanged

Tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=PurchaseOrderTest,PurchaseOrderPolicyTest,GoodsReceiptTest,PurchaseReturnTest,FinanceReportTest,CaPackTest,ReportAccessPolicyTest,PlanTierReportTest test` — Tests run: 46, Failures: 0.

`cd dispensary && npm run test -- --run src/screens/expenses/tests/ExpensesScreen.test.tsx src/screens/aging/tests/AgingScreen.test.tsx src/screens/ca-pack/tests/CaPackScreen.test.tsx src/screens/purchases/tests/PurchasesScreen.test.tsx src/screens/distributors/tests/DistributorsScreen.test.tsx src/screens/inventory/tests/QualityCheckWorkspace.test.tsx` — 47 passed.

Listed gates (server then SPA, sequential):

- `cd server && ./mvnw spotless:check` — HEAD residuals (kiosk/inventory/expense/credit/auth). Band 3 Java applied.
- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 936, Failures: 2 **not this slice**: `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility`, `InventoryGuidanceTest.ac03_expiryThresholdIsConfigurable`.
- `cd dispensary && npm run lint` — HEAD unused-import residuals (account/credit/distributors/offers). Band 3 files eslint clean.
- Slice tests 47 passed (above). Full suite 267 failed / 381 passed — HEAD screens missing slice reducers (M4-TEST-001 / CRM), predates this band.
- `cd dispensary && npm run build` — HEAD `tsc` residuals (account/credit/distributors/inventory.format/offers/orders/shop-books). Band 3 purchases/inventory status/CA files typed clean.
- `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 190 passed; vite build ok.
- `make compose-config` — ok.
- `node --test scripts/validate-requirements.test.mjs` then `node scripts/validate-requirements.mjs` — 71 stories valid.

Browser (localhost:5173 owner, Indiranagar): Purchases shows Bills / Open indents, New indent, New purchase entry, Draft from this outlet reorder. Open pharmacist check lands on Inventory Quality check with the GRN selected and Accept onto floor. Expenses card reads GST in spend (inclusive). Khata dues strip shows 0–30 / 31–60 / 61–90 / 90+ remaining buckets. CA pack button is Download PDF pack; hint is not a GSTR filing.

Out of scope: Band 4+; D-013/M1-S09; D-006/M12-S01; D-001 audit.

## Band 1 close-out (2026-09-16)

No commit requested.

### Slice K — M1-IMPERSON-004, SEC-NEW-001

- `ImpersonationService.start` 422 `TARGET_TENANT_INACTIVE` when tenant is not ACTIVE
- Acting JWT rejected after target `TERMINATED` except DELETE impersonation / POST logout
- Tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=AuthImpersonationTest test` — Tests run: 17, Failures: 0

### Slice M — M1-BRANCH-001/002, STATE-POS-001 (aliases UX-DISP-01, STATE-DISP-01)

- Collapsed MapPin uses the same outlet `DropdownMenu`
- `<Outlet key={activeBranchId}>` remounts the open screen
- `pos.slice` `branchSwitched` clears the draft
- Tests: `cd dispensary && npm run test -- --run src/layouts/DashboardLayout.test.tsx src/screens/pos/tests/PosOutletSwitch.test.tsx` — 15+2 passed

### Slice P — M2-KIOSK-001/002/003/004

- V65: bcrypt `staff_exit_pin`, unique `kiosk_ticket.idempotency_key`, wipe plaintext `0000`
- `createTicket` prices from server catalogue, `issue()` reserve, cancel `restockFromSalesReturn`
- GET kiosk returns `staffExitPinSet` only; open requires PIN
- Dispensary: in-stock catalogue; Place order sends idempotency key; PIN verified on exit
- Tests: `./mvnw -Dtest=KioskTest,KioskRollbackTest test` — 8+1 passed. `npm run test -- --run src/screens/kiosk/tests/KioskCatalogue.test.ts src/screens/kiosk/tests/KioskScreen.test.tsx` — passed

### Slice Q — M2-LIFE-002, SEC-NEW-002/003/004/005, PII-001

- Dashboard hydrates `/me` on mount/focus/visibility
- Register duplicate email 401 `INVALID_CREDENTIALS` (opaque SPA copy)
- `AuthIpThrottle` 20/min prod, 10000 test
- Saved-login `maskEmail`; prometheus `hqRole()==admin_super`; nginx HSTS + `frame-ancestors 'none'`
- Tests: `AuthSavedLoginTest` 13, `TenantRegistrationTest` 6, `AuthIpThrottleTest` 2, `SavedLoginMaskTest` 1, `PrometheusAccessTest` 1, DashboardLayout focus lock

### Slice R — M11-CF-002, M11-CF-008

- PENDING copy; sessionStorage checkout key reuse; held CTA disabled
- HQ POST `/api/v1/admin/subscriptions/payments/{id}/reconcile`
- Tests: SubscriptionScreen pending case; `CashfreeBillingTest` 7; admin SubscriptionsScreen 16 including Reconcile

### Band 1 listed gates

- Server: `cd server && ./mvnw spotless:check` — HEAD residuals (Inventory/Expense/credit format); this band’s files applied. `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 930, Failures: 8 (HEAD Expense category seed + InventoryGuidance date + postRent 422 cascade on finance/CA/custom/plan-tier). Band 1 classes green.
- Dispensary: `npm run lint` — HEAD unused-import residuals (account/credit/distributors/offers/purchases). Slice tests 47 passed (layout/POS/kiosk/subscription/register). Full suite 369 failed / 286 passed — HEAD screens missing slice reducers in test stores, predates this band. `tsc -b` HEAD residuals; kiosk thunks typed clean.
- Admin: `npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 190 passed; vite build ok.
- Compose: `make compose-config` — ok.

Browser (localhost:5173 owner): saved-login emails masked (`c***@varshmaan.local`). Collapsed MapPin opens All outlets / Indiranagar / Koramangala / Kiosk. Switch to kiosk remounts dashboard to ₹0 for that outlet. Kiosk config Staff exit PIN is empty (placeholder 4–8 digits; no `0000`).

Out of scope: M1-IMPERSON-001, M1-WF-001, M2-LIFE-001, M1-PIN-004, M1-IMPERSON-003, Band 3+.

## Band 2 close-out (2026-09-16)

No commit requested. Dispensary POS remainder after Slice E.

- Mixed tender: Cash/UPI/Card/Bank/Khata amounts + refs; Charge disabled until cover; walk-in Khata disabled; server complete still owns total
- Held strip on cart with resume; hold parks and returns to cart
- Header `+ New sale` is a button that dispatches `newSale` and opens Sales
- Back after COMPLETED clears the till (no PATCH)
- Rx remaining via `GET` prescriptions; Rx reference required (upload optional)
- FEFO suggested option; near-expiry banner; no empty batch option
- POS tests rewritten to Proceed / Charge / Continue as walk-in
- `selectPosCartQtyByProductId` memoized (new Map every render locked the product grid)

Tests: `cd dispensary && npm run test -- --run src/screens/pos/tests src/layouts/DashboardLayout.test.tsx src/layouts/DashboardLayout.pin.test.tsx` — 107 passed.

Listed gates (dispensary only; no server/admin/compose change):

- `cd dispensary && npm run lint` — HEAD unused-import residuals (account/credit/distributors/offers/purchases). Band 2 POS/layout eslint clean.
- Slice tests 107 passed (above).
- `cd dispensary && npm run build` — HEAD `tsc` residuals (inventory/orders/shop-books/credit/account); none in POS Band 2 files.

Browser (localhost:5173 owner, Indiranagar): header `+ New sale` is a button and clears leftover tender/banner. Held strip shows Resume bill INV/…/00385–00382. Colgate batch is `A26-0102 · FEFO suggested` with no empty Select batch. Walk-in Proceed → Take payment with Cash/UPI/Card/Bank/Khata fields; Khata disabled; Cash ₹118 enables Charge ₹118.00 & invoice (not collected). New sale returns to empty cart + held strip.

Out of scope: Band 3+.

## Band 1 leftovers close-out (2026-09-16)

No commit requested. Owner unblocked: apply platform rules at POS; auto-lock on subscription expiry.

### M1-WF-001

- `ApprovalService.resolveApplicableRule` uses pharmacy Sign-off first, then PLATFORM
- POS `evaluateDiscountApproval` uses that lookup; HQ Workflow desks copy names the till fallback
- Tests: `SalesInvoicePricingTest` platform-only PENDING + pharmacy-wins NOT_REQUIRED; `WorkflowDesksScreen.test.tsx` 6 passed

### M2-LIFE-001

- MASTER override EXPIRED/CANCELLED sets ACTIVE tenant to EXPIRED (SUSPENDED/TERMINATED unchanged)
- `SubscriptionExpiryScanner` + UTC `0 5 0 * * *` job expires ACTIVE rows with `expiresAt <= now`
- Tests: `SubscriptionTest.ac01_masterOverrideExpiredOrCancelledLocksActiveTenant`, `ac01_pastExpiresAtJobLocksActiveTenantNotSuspended`

Slice tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=SubscriptionTest,SalesInvoicePricingTest,ApprovalWorkflowTest,TenantLifecycleTest test` — Tests run: 38, Failures: 0.

Listed gates (server then admin; sequential):

- `cd server && ./mvnw spotless:check` — HEAD residuals (kiosk/inventory/expense/credit/auth). This slice’s Java is clean.
- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 934, Failures: 2 **not this slice**: `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility`, `InventoryGuidanceTest.ac03_expiryThresholdIsConfigurable`.
- `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 190 passed; vite build ok.

Browser (localhost:5174 MASTER): `/workflows` subtitle reads that platform rules apply at the till when a pharmacy has no Sign-off rule. Empty state still “No platform workflow rules yet.” Did not store a live platform discount rule (would gate Varshmaan POS).

## Slice K contract

```
Slice: K
Findings: M1-IMPERSON-004, SEC-NEW-001
Stories used as behavior: M1-S08 AC03 (inactive target denied); tenant lock for non-ACTIVE
Decisions: D-001 unchanged
Apps: server
Out of scope: M1-IMPERSON-001 audit; M1-IMPERSON-003 stale screens; M1-PIN-004 unlock act_*
Remount targets:
  - POST /admin/impersonation 422 when tenant is not ACTIVE
  - Acting JWT rejected after target TERMINATED except Exit/logout
Tests to add/change:
  - AuthImpersonationTest
```

## Slice J close-out (2026-09-15)

No commit requested. Files:

- `admin/src/services/auth.ts` (`toAuthUser` keeps MASTER chrome while `impersonation` holds acting)
- `admin/src/services/auth.chrome.test.ts`
- `admin/src/screens/support-session/tests/SupportSessionScreen.test.tsx`
- `admin/src/screens/pharmacies/tests/PharmaciesScreen.test.tsx`
- `admin/src/layouts/DashboardLayout.impersonation.test.tsx` / `DashboardLayout.pin.test.tsx` (fixtures)
- `server/src/main/java/com/nammamedmate/server/infrastructure/security/AuthPrincipal.java` (`sessionRole`, `hqRole()`, `hqUserId()`)
- `server/src/main/java/com/nammamedmate/server/infrastructure/security/JwtService.java`
- HQ `requireMaster` / KYC `requireReviewer` use session-owner identity
- `server/src/test/java/com/nammamedmate/server/feature/impersonation/AuthImpersonationTest.java`

Slice tests: `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=AuthImpersonationTest test` — Tests run: 15, Failures: 0. `cd admin && npm run test -- --run src/services/auth.chrome.test.ts src/screens/support-session/tests/SupportSessionScreen.test.tsx src/screens/pharmacies/tests/PharmaciesScreen.test.tsx src/layouts/DashboardLayout.impersonation.test.tsx src/layouts/DashboardLayout.pin.test.tsx` — Tests 27 passed.

Listed full gate: `cd server && ./mvnw spotless:check` — HEAD residuals (11 files; this slice clean). `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 921, Failures: 2 (HEAD `Expense*` category seed + `InventoryGuidanceTest` date). `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 189 passed; vite build ok.

Browser: MASTER Enter Varshmaan → session `role=admin_super` + impersonation `pharmacy_owner`. Pharmacies lists tenants with lifecycle controls; KYC queue loads. Banner identifies acting Varshmaan / original Sanskar. Exit drops banner.

Out of scope: M1-IMPERSON-003 exit stale screens; M1-IMPERSON-004 non-ACTIVE Enter; M1-IMPERSON-001 audit; M1-PIN-004 unlock JWT `act_*`.

## Slice J contract

```
Slice: J
Findings: M1-IMPERSON-002
Stories used as behavior: M1-S08 AC01 (bounded support; original MASTER restored) / AC02 (banner)
Decisions: D-001 unchanged (no audit/TTL)
Apps: admin (+ server HQ requireMaster so Pharmacies/KYC APIs stay MASTER-capable)
Out of scope: M1-IMPERSON-003 exit stale screens; M1-IMPERSON-004 non-ACTIVE Enter; M1-IMPERSON-001 audit; M1-PIN-004 unlock drops act_*
Remount targets:
  - toAuthUser keeps HQ chrome as MASTER (role admin_super) while impersonation holds acting
  - HQ requireMaster / KYC reviewer authorize session owner, not acting pharmacy role
Tests to add/change:
  - AuthImpersonationTest HQ tenants + KYC while acting
  - toAuthUser chrome mapping
  - SupportSessionScreen after Enter
  - PharmaciesScreen still MASTER-capable during support
```

## Slice I close-out (2026-09-15)

No commit requested. Files:

- `server/src/main/java/com/nammamedmate/server/domain/ImpersonationCredentialPolicy.java`
- `server/src/main/java/com/nammamedmate/server/application/auth/AuthService.java` (`setPin`)
- `server/src/main/java/com/nammamedmate/server/application/auth/PasswordLifecycleService.java` (`changePassword`)
- `server/src/test/java/com/nammamedmate/server/feature/impersonation/AuthImpersonationTest.java`
- `admin/src/layouts/DashboardLayout.tsx` (no password overlay during support)
- `admin/src/layouts/DashboardLayout.impersonation.test.tsx`

Slice tests: `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=AuthImpersonationTest test` — Tests run: 14, Failures: 0. `cd admin && npm run test -- --run src/layouts/DashboardLayout.impersonation.test.tsx src/layouts/DashboardLayout.pin.test.tsx` — Tests 7 passed.

Listed full gate: `cd server && ./mvnw spotless:check` — HEAD residuals (10 files; this slice clean). `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw test` — Tests run: 920, Failures: 2 (HEAD `Expense*` category seed + `InventoryGuidanceTest` date). `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 186 passed; vite build ok.

Browser: MASTER Enter Varshmaan → `POST /auth/password` and `POST /auth/pin` → 403 `SUPPORT_CREDENTIALS_BLOCKED`; `/me` still pharmacy_owner + impersonation. Support banner; no Rotate HQ password overlay.

Out of scope: M1-PWD-002 acting must-change filter; M1-PIN-004 unlock JWT `act_*`; admin-reset.

## Slice I contract

```
Slice: I
Findings: M1-PWD-003
Stories used as behavior: M1-S08 Out (password reset is not impersonation); M1-S03 change/set PIN
Decisions: D-001 unchanged (no audit/TTL)
Apps: server, admin
Out of scope: M1-PWD-002 filter sessionUserId; M1-PIN-004 unlock JWT act_*; admin-reset endpoint
Remount targets:
  - POST /auth/password and /auth/pin 403 when impersonating
  - HqPasswordChange not mounted during support
Tests to add/change:
  - AuthImpersonationTest
  - DashboardLayout.impersonation.test.tsx
```

## Slice H close-out (2026-09-15)

No commit requested. Files:

- `admin/src/layouts/DashboardLayout.tsx` (idle lock + `HqSessionLock` while impersonating)
- `admin/src/layouts/DashboardLayout.pin.test.tsx` (support + 5 min still locks)

Slice tests: `cd admin && npm run test -- --run src/layouts/DashboardLayout.pin.test.tsx src/layouts/DashboardLayout.impersonation.test.tsx` — Tests 6 passed.

Listed full gate: `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 185 passed; vite build ok.

Browser: MASTER `/support` Enter Varshmaan → banner → backdate `nmm.admin.lastActivityAt` → **HQ session locked** with support banner still present → PIN 123456 Resume → lock gone, banner still Varshmaan / Sanskar.

Out of scope: M1-PIN-004 unlock JWT `act_*`; M1-PWD-003 PIN rotate while acting; UX-ADM-001 enroll copy; PIN-DISP-02 4h abandon test.

## Slice H contract

```
Slice: H
Findings: AUTH-ADM-001 (alias M1-PIN-002)
Stories used as behavior: M1-S02 idle PIN lock; M1-S08 support banner
Decisions: D-015 lock/resume; D-001 no impersonation TTL (idle lock is not TTL)
Apps: admin
Out of scope: M1-PIN-004 unlock JWT drops act_*; M1-PWD-003 PIN rotate while acting; UX-ADM-001 enroll copy; PIN-DISP-02 4h abandon test
Remount targets:
  - useIdleLock enabled when pinSet even if impersonation
  - HqSessionLock still mounts during support
Tests to add/change:
  - DashboardLayout.pin.test.tsx
```

## Slice G close-out (2026-09-15)

No commit requested. Files:

- `dispensary/src/screens/login/LoginScreen.tsx` (`finishSignIn` logout+forget; till-role saved list)
- `dispensary/src/screens/login/components/counter-pin-sign-in/CounterPinSignIn.tsx` (await `onSignedIn`)
- `dispensary/src/screens/login/tests/LoginScreen.test.tsx`
- `admin/src/screens/login/LoginScreen.tsx` (`finishSignIn` logout+forget; HQ-role saved list)
- `admin/src/screens/login/components/hq-pin-sign-in/HqPinSignIn.tsx` (await `onSignedIn`)
- `admin/src/screens/login/tests/LoginScreen.test.tsx`

Slice tests: `cd dispensary && npm run test -- --run src/screens/login/tests/LoginScreen.test.tsx` — 22 passed. `cd admin && npm run test -- --run src/screens/login/tests/LoginScreen.test.tsx` — 22 passed.

Listed full gate: `cd dispensary && npm run lint` — 6 unused-import errors outside login (HEAD). `npm run test -- --run` — 387 failed / 261 passed / 1 skipped (HEAD POS/directory suites; LoginScreen not in fail list). `npm run build` — tsc failures outside login (inventory/kiosk/orders/shop-books/credit). `cd admin && npm run lint && npm run test -- --run && npm run build` — lint clean; Tests 184 passed; vite build ok.

Browser: MASTER `:5174` then `:5173` HQ email Sign in → denied, stayed on `/login`, `GET /auth/me` 401. Till picker showed Counter staff / Priya / Varshmaan only (no HQ person). OWNER email on `:5174` → “HQ credentials were not recognised.”, `GET /auth/me` 401.

Out of scope: PII-001 email mask; AUTH-ADM-001 idle lock; server login reject-by-app (one-active-session still revokes the other app’s session on the successful login before SPA logout).

## Slice G contract

```
Slice: G
Findings: M1-AUTH-001
Stories used as behavior: M1-S01 wrong-app denied; M1-S10 saved login bind
Decisions: D-014 saved PIN still applies for same-app people
Apps: dispensary, admin
Out of scope: PII-001 email mask; AUTH-ADM-001 idle lock; server login reject-by-app
Remount targets:
  - finishSignIn wrong app → logoutSession + forgetSavedLogin
  - saved-list filter to this app's roles
Tests to add/change:
  - LoginScreen.test.tsx both apps
```

## Slice F close-out (2026-09-15)

No commit requested. Files:

- `server/src/main/java/com/nammamedmate/server/application/dashboard/HomeDashboardService.java` (owner desk only if permitted; skip aging for cashier)
- `server/src/test/java/com/nammamedmate/server/feature/dashboard/RoleDashboardTest.java` (`homeOpensStaffDefaultDeskWithoutOwnerForbidden`)
- `dispensary/src/screens/dashboard/store/dashboard.thunks.ts` / `dashboard.slice.ts` / `dashboard.selectors.ts`
- `dispensary/src/screens/dashboard/useDashboardScreen.ts` / `DashboardScreen.tsx` / `DashboardScreen.utils.ts` / `DashboardScreen.content.ts` / `DashboardScreen.css`
- `dispensary/src/screens/dashboard/components/dashboard-desk-switch/`
- `dispensary/src/screens/dashboard/components/dashboard-cashier-desk/`
- `dispensary/src/screens/dashboard/components/dashboard-inventory-desk/`
- `dispensary/src/screens/dashboard/components/dashboard-accountant-desk/`
- `dispensary/src/screens/dashboard/tests/DashboardDesk.test.tsx`

Slice tests: `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=RoleDashboardTest test` — Tests run: 7, Failures: 0 (2026-09-15T21:58:20+05:30). `cd dispensary && npm run test -- --run src/screens/dashboard/tests/DashboardDesk.test.tsx src/screens/dashboard/tests/DashboardScreen.test.tsx src/screens/dashboard/tests/dashboard.store.test.ts` — Tests 40 passed.

Listed full gate: `cd server && ./mvnw spotless:check test` — spotless HEAD residuals (10 files; HomeDashboardService clean; tests not reached). `cd dispensary && npm run lint` — 6 unused-import errors outside dashboard (HEAD). `npm run test -- --run` — 387 failed / 260 passed (HEAD POS suites still `M6-TEST-001`; dashboard desk +13). `npm run build` — tsc failures outside dashboard (inventory/kiosk/orders/shop-books/credit).

Browser: OWNER `/` Shop glance + desk tabs; Till today shows today's sales ₹118 and held bills, not dues/analytics. Cashier `counter.staff@varshmaan.local` lands on `/` with Till today (not 403); outlet/password-change overlays remain.

Out of scope: M9-DASH-002 owner widget envelopes, DASH-003 dues hero, DASH-005/006 charts.

## Slice F contract

```
Slice: F
Findings: M9-DASH-001
Stories used as behavior: M9-S01 role desks; GET /dashboards/{role}; default desk + switch
Decisions: D-005 unchanged on unused owner widgets (DASH-002 stays open)
Apps: server, dispensary
Out of scope: M9-DASH-002 owner widget envelopes; DASH-003 dues hero; DASH-004 drills; DASH-005/006 charts/aging; M9-TEST-001 rewrite of owner home suite
Remount targets:
  - GET /dashboards/home must not call owner desk for staff
  - live / uses fetchDashboard(defaultDesk) for staff; OWNER keeps fetchHomeDashboard
  - desk switch for permittedRoles
Tests to add/change:
  - RoleDashboardTest home cashier 200
  - DashboardDesk.test.tsx
```

## Slice E close-out (2026-09-15)

No commit requested. Files:

- `dispensary/src/screens/pos/components/pos-cart-line/` (MRP ₹ / Selling ₹ / line discount)
- `dispensary/src/screens/pos/components/pos-gst-panel/` (GSTIN, IGST, tax override)
- `dispensary/src/screens/pos/components/pos-loyalty-panel/` (Use points)
- `dispensary/src/screens/pos/components/pos-invoice-copy/` (Print / Send / New sale)
- `dispensary/src/screens/pos/store/pos.thunks.ts` (`adjustTax`, `printInvoice`, `emailCopy`, `loadCustomerLoyalty`, redeem caps)
- `dispensary/src/screens/pos/store/pos.slice.ts` / `pos.selectors.ts` / `PosScreen.utils.ts` (`tenderForMode`, `APPROVAL_REQUIRED`)
- `dispensary/src/screens/pos/PosScreen.tsx` / `PosScreen.content.ts` / `PosScreen.css`
- `dispensary/src/screens/pos/components/pos-cart-panel/` / `pos-bill-payment/` / `pos-customer-dialog/` (credit load on pick)
- `dispensary/src/screens/pos/tests/PosTillChrome.test.tsx`

Slice tests: `cd dispensary && npm run test -- --run src/screens/pos/tests/PosTillChrome.test.tsx` — Tests 20 passed (2026-09-15T21:45:15+05:30). Delta `PosScreen` + `PosMedicationSafety` + `PosOfferApply` 43 passed together.

Listed full gate: `cd dispensary && npm run lint` — 6 unused-import errors outside POS (HEAD). Slice POS eslint clean. `npm run test -- --run` — 387 failed / 247 passed (HEAD POS suites still on Save bill / Collect bill = `M6-TEST-001`). `npm run build` — tsc failures outside POS (inventory/kiosk/orders/shop-books/credit).

Browser: Indiranagar `/pos` → Colgate (blank MRP/selling) → type 120/100 → walk-in → Proceed → GSTIN/Tax override/Print visible → Cash → Charge ₹118 → Print + New sale enabled → New sale returns to empty cart.

Kept live Proceed/Charge labels. Did not rewrite `M6-TEST-001`. Mixed tender `M6-PAY-001`, held list, Rx remaining, OWNER loyalty adjust remain open.

## Slice E contract

```
Slice: E
Findings: M6-POS-001 (do-with M6-POS-002, M6-GST-001, M6-PDF-001 / UX-POS-001)
Stories used as behavior: M6-S01 line MRP/selling; M6-S02 GSTIN/override/line discount; M6-S03 khata remaining; M6-S08 print/email; M3-S09 Use points on till
Decisions: restore chrome (default fork); do not amend stories; keep live Proceed/Charge as Save/Collect
Apps: dispensary
Out of scope: M6-TEST-001 rewrite of Save bill/Collect bill suites; M6-PAY-001 mixed tender; M6-HOLD-001; M6-RX-001; M3-LOY-001 OWNER adjust; D-013
Remount targets:
  - cart line MRP ₹ / Selling ₹ / line discount (mrpChanged, sellingChanged, discountChanged)
  - payment GSTIN, GST breakup incl. IGST, tax override (adjustInvoiceTax)
  - Use points (getCustomerLoyalty + redeemPoints on Charge)
  - Khata left (loadCustomerCredit on pick)
  - Print this bill / Send bill copy / New sale after Charge
Tests to add/change:
  - PosTillChrome.test.tsx (live Proceed/Charge labels)
```

## Slice D close-out (2026-09-15)

No commit requested. Files:

- `dispensary/src/screens/pos/store/pos.thunks.ts` (`applyInvoiceOffers` after pricing on Proceed; again before Charge)
- `dispensary/src/screens/pos/store/pos.slice.ts` / `pos.selectors.ts`
- `dispensary/src/screens/pos/components/pos-offer-panel/`
- `dispensary/src/screens/pos/PosScreen.tsx` / `PosCartPanel.tsx` / `PosScreen.content.ts` / `PosScreen.utils.ts` / `PosScreen.css`
- `dispensary/src/screens/pos/tests/PosOfferApply.test.tsx`

Slice tests: `cd dispensary && npm run test -- --run src/screens/pos/tests/PosOfferApply.test.tsx` — Tests 9 passed (2026-09-15T21:14:55+05:30). Delta `PosMedicationSafety` + `PosScreen` 14 passed.

Listed full gate: `cd dispensary && npm run lint` — 6 unused-import errors outside POS (HEAD). `npm run test -- --run` — 387 failed / 227 passed (HEAD POS chrome tests still on Save bill). `npm run build` — tsc failures outside POS (inventory/kiosk/orders/shop-books). Slice eslint clean.

Browser: Apply scheme on `/pos`; unsaved click shows “Save this bill first…”. Proceed with Colgate walk-in still blocked by missing selling price (`M6-POS-002` / Slice E), so live Charge apply was not exercised in the browser.

## Slice D contract

```
Slice: D
Findings: M6-OFFER-001
Stories used as behavior: M6-S06 (eligible display, apply, snapshot, D-010)
Decisions: D-010 highest priority wins; one offer per line; discount before GST
Apps: dispensary
Out of scope: M6-POS-001 chrome restore, M6-PAY-*, SECRET-SSM-WHATSAPP
Remount targets:
  - applyInvoiceOffers / listInvoiceOffers
  - saveInvoice after pricing (Proceed)
  - collectPayment before complete (Charge)
  - POS scheme panel (loading/empty/apply/ambiguous)
Tests to add/change:
  - PosOfferApply.test.tsx (live Proceed/Charge labels + posReducer)
```

## Slice C close-out (2026-09-15)

No commit requested. Files:

- `server/src/main/resources/application-prod.properties` (HTTPS defaults for reset/verify)
- `server/src/main/java/com/nammamedmate/server/infrastructure/ProdEmailUrlGuard.java` (`@Profile("prod")` fail-fast)
- `infra/terraform/modules/platform/{variables.tf,main.tf}` SSM seed keys
- `infra/terraform/envs/prod/{variables.tf,main.tf,terraform.tfvars.example}`
- `.env.prod.example`
- `infra/terraform/README.md` (existing SSM needs one-time `update-prod-env.sh set`)
- `server/src/test/java/com/nammamedmate/server/ProdEmailUrlSeedTest.java`
- `server/src/test/java/com/nammamedmate/server/ProdEmailUrlGuardTest.java`

Local `application.properties` and `compose.yaml` still default localhost. Local Spring not pointed at RDS.

Slice tests: `./mvnw -Dtest=ProdEmailUrlSeedTest,ProdEmailUrlGuardTest test` — Tests run: 5, Failures: 0, BUILD SUCCESS (2026-09-15T17:57:10+05:30)

Compose gate: `make compose-config` — exit 0 (2026-09-15)

Listed full gate: `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw spotless:check test` — **BUILD FAILURE** at `spotless:check` on 10 unrelated HEAD files (kiosk/inventory/expense/customer-credit line-wrap). Slice Java is Spotless-clean. Did not format those into this slice.

Existing prod SSM blobs are not overwritten by later Terraform applies (`ignore_changes`). First apply seeds the three HTTPS URLs; live blobs that predate this slice need `./scripts/update-prod-env.sh set` or the Prod env (SSM) workflow. Runtime still safe without that step because `application-prod.properties` HTTPS defaults apply when env is unset.

Aliases closed: `M1-PWD-001`, `M2-REG-001`, `M11-MAIL-001`.

## Slice C contract

```
Slice: C
Findings: OPS-EMAIL-URL (aliases M1-PWD-001, M2-REG-001, M11-MAIL-001)
Stories used as behavior: M1-S03, M2-S01, M11-S02 (reset/verify links in mail)
Decisions: none; local Spring stays off RDS
Apps: infra + server
Out of scope: SECRET-SSM-WHATSAPP, TF-SNAPSHOT, TF-SSH-EXAMPLE, D-006
Remount targets:
  - Cashfree TF var + SSM join + .env.prod.example
  - application-prod.properties HTTPS defaults
  - LocalEnvironmentGuard-style prod fail-fast
Tests to add/change:
  - prodPropertiesDefaultToHttpsNotLocalhost_OPS_EMAIL_URL
  - ssmSeedAndProdEnvExampleIncludeEmailUrls_OPS_EMAIL_URL
  - rejectsLocalhostInProd_OPS_EMAIL_URL / acceptsPharmacyHttps_OPS_EMAIL_URL
```

## Slice B close-out (2026-09-15)

No commit requested. Files:

- `server/src/main/java/com/nammamedmate/server/application/communications/WhatsAppMessageService.java` (`deliver` Graph name = unique name; slots ordered from body)
- `server/src/main/java/com/nammamedmate/server/infrastructure/whatsapp/MetaWhatsAppAdapter.java` (`graphMessageBody` + `components`)
- `server/src/main/java/com/nammamedmate/server/domain/WhatsAppTemplatePolicy.java` (`bodySlotOrder`)
- `server/src/test/java/com/nammamedmate/server/feature/communications/WhatsAppMessageTest.java`
- `server/src/test/java/com/nammamedmate/server/infrastructure/whatsapp/MetaWhatsAppAdapterTest.java`
- `server/src/test/java/com/nammamedmate/server/domain/WhatsAppTemplatePolicyTest.java`

Slice tests: `TESTCONTAINERS_RYUK_DISABLED=true ./mvnw -Dtest=WhatsAppTemplatePolicyTest,MetaWhatsAppAdapterTest,WhatsAppMessageTest,WhatsAppMessageRollbackTest test` — Tests run: 24, Failures: 0, BUILD SUCCESS (2026-09-15T13:44:30+05:30)

Listed full gate: `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw spotless:check test` — **BUILD FAILURE** at `spotless:check` on 10 unrelated HEAD files (kiosk/inventory/expense line-wrap). Slice Java is Spotless-clean. Did not format those into this slice. Namespace still persisted as `{tenantId}_{uniqueName}` (M10-S03). No Graph tokens in git.

Aliases closed: none (canonical IDs only).

## Slice B contract

```
Slice: B
Findings: M10-WA-001, M10-WA-002
Stories used as behavior: M10-S04 (approved templates; provider send)
Decisions: none new; keep tenant namespace for persistence (M10-S03)
Apps: server
Out of scope: M10-WA-003 SSM keys, SMS fallback, D-013
Remount targets:
  - WhatsAppMessageService.deliver
  - MetaWhatsAppAdapter.sendTemplate / Graph JSON
Tests to add/change:
  - ac_graphTemplateNameIsUniqueName_M10_WA_001
  - graphTemplateNameIsMetaUniqueName_M10_WA_001
  - graphBodySendsOrderedComponents_M10_WA_002
  - orderedSlotsFollowBody_M10_WA_002
```

## Slice A contract

```
Slice: A
Findings: M3-SAFE-001 (alias M6-SAFE-001)
Stories used as behavior: M3-S08, M6-S05 (complete must not skip D-011)
Decisions: D-011 warn-only + ack with reason; unchecked never shown as safe
Apps: server + dispensary
Out of scope for this slice: M6-POS-001 restore, M6-OFFER-001, M3-CRM-*, D-013
Remount targets:
  - server MedicationSafetyService.assertCleared
  - SalesInvoiceService.complete
  - dispensary src/services/medicationSafety.ts
  - POS evaluation/reason in pos.slice + payment step panel
Tests to add/change:
  - ac_assertClearedOnComplete_M3_SAFE_001
  - ac_completeWithoutReasonWhenWarnings_M3_SAFE_001
  - ac_completeUnmatchedKeys_M3_SAFE_001
  - ac_walkInCompleteWithLinesNotPresentedAsSafe_M3_SAFE_001
  - PosMedicationSafety.test.tsx (evaluate on Proceed, ack reason, Charge)
```

## Slice A close-out (2026-09-15)

No commit requested. Files:

- `server/src/main/java/com/nammamedmate/server/application/medicationsafety/MedicationSafetyService.java`
- `server/src/main/java/com/nammamedmate/server/application/sales/InvoiceCompletionCommand.java`
- `server/src/main/java/com/nammamedmate/server/application/sales/SalesInvoiceService.java`
- `server/src/main/java/com/nammamedmate/server/feature/sales/SalesInvoiceController.java`
- `server/src/test/java/com/nammamedmate/server/feature/medicationsafety/MedicationSafetyTest.java`
- `server/src/test/java/com/nammamedmate/server/feature/sales/SalesInvoiceSafetyCompleteTest.java`
- `dispensary/src/screens/pos/components/pos-safety-panel/`
- `dispensary/src/screens/pos/store/pos.thunks.ts` (evaluate on save; Charge sends keys+reason)
- `dispensary/src/screens/pos/store/pos.slice.ts`, `pos.selectors.ts`
- `dispensary/src/screens/pos/PosScreen.tsx`, `PosScreen.content.ts`, `PosScreen.css`, `PosScreen.utils.ts`
- `dispensary/src/services/salesInvoices.ts`
- `dispensary/src/screens/pos/tests/PosMedicationSafety.test.tsx`
- `dispensary/src/screens/pos/tests/PosScreen.test.tsx` (live chrome; safety cases moved)

Slice tests:

- Server `SalesInvoiceSafetyCompleteTest` — 4/4 in listed `./mvnw test` (Tests run: 4, Failures: 0)
- Dispensary `npm run test -- --run src/screens/pos/tests/PosMedicationSafety.test.tsx src/screens/pos/tests/PosScreen.test.tsx` — 2 files, 14 passed
- Slice eslint on those POS files — clean

Listed full gates (run once, sequential; not success on HEAD residuals):

- `cd server && TESTCONTAINERS_RYUK_DISABLED=true ./mvnw spotless:check test` — **BUILD FAILURE**. 908 tests, 2 failures **not this slice**: `InventoryGuidanceTest.ac03_expiryThresholdIsConfigurable` (date: expiry 2026-09-20 vs today 2026-09-15), `ExpenseTest.ac01_systemCategoriesAndCustomExtensibility` (seed has more system codes than the test list). Slice Java is Spotless-clean; `spotless:check` still flags 10 unrelated HEAD files (kiosk/inventory/expense line-wrap). Did not format those into this slice.
- `cd dispensary && npm run lint` — **FAIL** 6 unused-import errors outside POS (account, credit, distributors, kiosk, offers, purchases).
- `cd dispensary && npm run test -- --run` — **FAIL** 395 failed / 218 passed. Failures are missing Provider / missing reducers / dead POS labels (`Save bill`, `Collect bill`, `Use points`). That is `M6-TEST-001` / Slice E. Not rewritten here.
- `cd dispensary && npm run build` — **FAIL** pre-existing `tsc` in inventory/kiosk/orders/shop-books/credit, none in POS safety files.

Browser: pharmacist login → `/pos` → Select customer → Add Colgate pack → Proceed. Payment/safety panel not reached: live catalogue line had empty suggested selling paise (`Add medicines with MRP and selling price before saving.`). That is Slice E price chrome, not D-011. Safety click path is covered by `PosMedicationSafety.test.tsx`.

Aliases closed: `M6-SAFE-001`.
