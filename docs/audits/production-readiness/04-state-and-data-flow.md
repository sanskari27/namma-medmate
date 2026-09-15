# State and data flow

**Date:** 2026-09-15

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
- **OWNER All outlets:** `activeBranchId=null`. Stock looks empty (`OWN-NAV-003`); Transfers `return null` (`OWN-NAV-004`); expense create uses `branches[0]` (`OWN-EXP-001`).
- **Impersonation exit:** `sessionStarted(restored)`. Key `Outlet` on `userId+tenantId` or navigate `/support`.

---

## Job / scanner → notification → href

| Job | Tenant scoped? | Inbox href | Correct screen? |
|---|---|---|---|
| License due | yes (then one TX all tenants) | `/licenses` / `/licence-expiry` | staff 403 on Licences `M7-LIC-001` |
| Refill due | yes | WhatsApp only | Graph broken |
| Credit due | yes | `/credit` | every positive balance daily `M10-WA-004` |
| Rx archive | yes | none | OK |
| Low stock | on issue | `/inventory` | once-per-SKU `M10-ROUTE-005`; floor not Guidance |
| Approval | on create | `/inventory` | **wrong** `/approvals/pending` |
| KYC decide | yes | `/account` OWNER | MASTER not a recipient |

Staff roster `notification_role_assignment` is **never written** (`M10-ROUTE-001`). Five matrix triggers have no producer (`M10-ROUTE-002`).
