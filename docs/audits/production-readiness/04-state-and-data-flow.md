# State and data flow

**Date:** 2026-09-15  
**Validated:** 2026-09-20 — implementable rows in this file are **FIXED** in [`10-fix-progress.md`](10-fix-progress.md). Original tables below are the 2026-09-15 snapshot.

---

## Global store vs what should be global

### Dispensary (`dispensary/src/store/index.ts`)

| Slice | Belongs? | Notes |
|---|---|---|
| `auth` | **yes** | session, branches, modules, tenantStatus |
| `notifications` | **yes** | unread + page |
| Screen slices on **same** root store | **yes** (folder contract) | pos, orders, customers, inventory, … |
| `campaigns` | no slice | page-local hook — acceptable for one route |

**Defect:** POS slice is global and **survives** route changes. `newSale` is never dispatched. Header “+ New sale” is a Link. After Charge, leaving and returning `/pos` shows the completed bill (`UX-POS-005`).

Production `Provider`: only `main.tsx`. Nested Providers only in tests.

### Admin

| Slice | Belongs? |
|---|---|
| `auth` + `inbox` | **yes** |
| HQ lists | local/page hooks — correct until impersonation exit (stale screen state) |

---

## Stale-data matrix

| Writer | Readers | Forget to invalidate |
|---|---|---|
| `branchSwitched` | POS catalogue (reloads) | Customers, Credit, Offers, Distributors, WaitingSignOff, Expenses, Aging — load once |
| `branchSwitched` | POS **draft** | **kept** (`STATE-POS-001`) |
| Invoice complete | stock, khata, loyalty, NDPS, history | Inventory overview if already mounted; Credit if open |
| QC accept | floor stock | Purchases list pending; dashboard pendingGrn unused |
| KYC approve | tenant ACTIVE | dispensary Redux `tenantStatus` until `/me` |
| MASTER suspend | tenant status | dispensary banners stale (`M2-LIFE-002`) |
| Exit impersonation | auth Redux | HQ screen local fetches (`IMPERSON-002`) |
| Mark notification read | badge | recomputed from **current page** (`M10-INBOX-001`) |
| Cashfree SUCCESS | subscription | parallel `loadSubscription` can wipe success banner (`M11-CF-004`) |

---

## Branch-switch and impersonation-exit

- **Expanded rail:** `POST /session/branch` + `branchSwitched`. Collapsed MapPin: dead.
- **OWNER All outlets:** `activeBranchId=null`. Stock GET `/inventory/overview` sums tenant branches (`OWN-NAV-003`); Transfers ask to pick an outlet (`OWN-NAV-004`); expense create requires outlet pick (`OWN-EXP-001`).
- **Impersonation exit:** `sessionStarted(restored)`. Key `Outlet` on `userId+tenantId` or navigate `/support`.

---

## Job / scanner → notification → href

| Job | Tenant scoped? | Inbox href | Correct screen? |
|---|---|---|---|
| License due | yes (then one TX all tenants) | `/account` (staff) / `/licenses` | pharmacist STAFF read-only; OWNER files |
| Refill due | yes | WhatsApp only | Graph broken |
| Credit due | yes | `/credit` | every positive balance daily `M10-WA-004` |
| Rx archive | yes | none | OK |
| Low stock | on issue | `/inventory` | once-per-SKU `M10-ROUTE-005`; floor not Guidance |
| Approval | on create | `/approvals/pending` | **FIXED** `M10-ROUTE-003` |
| KYC decide | yes | `/account` OWNER | MASTER not a recipient |

**Status:** `M10-ROUTE-001` **FIXED** — `NotificationRoleSync` writes `notification_role_assignment`. `M10-ROUTE-002` **FIXED** with producers. Refill Graph and licence scan TX residuals closed in `10-fix-progress.md`.
