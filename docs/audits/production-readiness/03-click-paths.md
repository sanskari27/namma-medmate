# Click paths — primary CTAs

**Date:** 2026-09-15 (Wave 5 + epic traces)  
Full POS table: [`m6.md`](m6.md). Cashier journey: this file + cashier agent. OWNER/MASTER journeys below.

Verdict key: **OK** | **partial** | **broken** | **missing** | **dead** (control exists, does nothing useful).

---

## Dispensary layout chrome

| Surface | Control | Handler | API | State write | Refresh | States | Verdict |
|---|---|---|---|---|---|---|---|
| Header | Sign out | `leaveCounter` | `POST /auth/logout` | `logout` | → `/login` | — | **OK** (header untested) |
| Header | + New sale | `<Link to=/pos>` | none | **no** `newSale` | none | — | **broken** `UX-POS-005` |
| Header | Search | `readOnly` | none | none | — | — | **dead** `UX-DISP-04` |
| Header | Alert bell Open | `openNotification` | POST open | mark read | `navigate(href)` | loading/empty | **partial** approval → `/inventory` |
| Rail | Outlet (expanded) | `selectOutlet` | `POST /session/branch` | `branchSwitched` | POS catalogue only | failure | **partial** lists stale |
| Rail | Outlet (collapsed) | MapPin button | none | none | — | — | **broken** `UX-DISP-01` |
| Overlay | PIN unlock | `unlockPin` | `POST /auth/pin/unlock` | keep session | — | denied ×3 revoke | **OK** runtime |
| Overlay | PIN enroll | `setPin` | `POST /auth/pin` | `pinEnrolled` | — | validation | **copy WRONG** D-015 |
| Banner | KYC / lock | Link `/account` | — | — | Outlet still mounts | — | **copy vs UI** `M2-LIFE-003` |

---

## Dispensary till (`/pos`) — cashier happy path

| Step | Control | API | Outcome | Verdict |
|---|---|---|---|---|
| Login PIN | keypad | `POST /auth/pin/login` | session + `/` | **OK** staff home is default desk `M9-DASH-001` FIXED |
| Add pack | catalogue tap | units + batches | FEFO preselect | **partial** `M4-FEFO-001` |
| Select customer | dialog | `GET /customers` | no credit load | **broken** `M3-CREDIT-001` |
| Safety | Review reason on payment, then Charge | `POST /medication-safety/evaluate` on Proceed; `POST …/complete` with keys+reason (`assertCleared`) | warn-only ack; Charge cannot skip | **OK** `M3-SAFE-001` FIXED |
| Proceed to bill | save+pricing | POST/PATCH + pricing | payment step | **this is Save** |
| Apply scheme | Apply scheme / Proceed | `POST /invoices/{id}/offers` after pricing and before Charge | eligible list + snapshot | **OK** `M6-OFFER-001` FIXED |
| Charge | complete + `assertCleared` | `POST …/complete` after `POST …/offers` | stock+khata after safety+schemes | **OK schemes** `M6-OFFER-001` FIXED |
| Print | Print this bill / Send bill copy after Charge | `GET` PDF / `POST` email | A4 copy; walk-in has no Send | **OK** `M6-PDF-001` FIXED |
| Next customer | New sale on till after Charge | none | `newSale` clears cart | **OK** `UX-POS-001` FIXED |

Broken / inconvenient in detail: [`m6.md`](m6.md) click table; cashier Wave 5 journey in the audit transcript.

---

## Dispensary other primary CTAs (rollup)

| Surface | Control | Verdict | ID |
|---|---|---|---|
| Customers | Add / edit / repay khata | **OK** | — |
| Customers | Merge / family / refill / tags / loyalty | **missing** | `M3-CRM-001` |
| Credit | Record repayment | **OK** | buckets vs aging `M3-CREDIT-002` |
| Inventory Stock | Add stock via purchase | **wrong default** | `M4-SKU-001` |
| Inventory Stock | Receive / batch detail | **unmounted** | `M4-RCV-001` |
| Inventory QC | Accept onto floor | **OK** server; **403** for inventory staff | `M5-QC-001` |
| Purchases | Save & receive goods | **3 HTTP; retry dup** | `M5-PO-002` |
| Purchases | New indent / Record delivery | **gone** | `M5-PO-001` |
| Distributors | Record payment | **no confirm** | `M5-KHATA-003` |
| Offers | New scheme | **OK** configure; **till apply OK** | `M6-OFFER-001` FIXED |
| Returns | Confirm take-back | **OK** | — |
| Orders | Continue / Print / Share | **OK** (hold inbox lives here) | `M6-HOLD-001` |
| Expenses | Save / row X | **delete posted no confirm** | `M8-EXP-001` |
| Aging | Excel | **wrong buckets** | `M8-AGE-001` |
| Shop books | Open / export | **OK** + D-005 | `M8-BOOK-001` P&L basis |
| CA pack | Share with {name} | **download only** | `M8-CA-001` |
| Subscription | Upgrade to {plan} | **OK** checkout; **PENDING double-pay** | `M11-CF-002` |
| Kiosk | Place order | **no stock; two tokens** | `M2-KIOSK-001/002` |
| Login | Forgot / verify-email mail links | **OK HTTPS in prod defaults + SSM seed** | `OPS-EMAIL-URL` FIXED |
| Campaigns | Send this list | **busy-gated; Graph name+components OK** | `M10-WA-001` FIXED |
| WhatsApp sends | Send again | **OK UI; Graph name+components OK** | `M10-WA-001` FIXED |

---

## Admin chrome + MASTER path

| Surface | Control | Verdict | ID |
|---|---|---|---|
| Header Sign out | `leaveHq` | **OK** | — |
| Inbox Open | `navigate(href)` | **dump to dashboard** on staff hrefs | `M10-ROUTE-004` |
| Banner Exit support | `exitImpersonation` | auth OK; screens stale | `IMPERSON-002` |
| PIN enroll | copy “sign out” | **WRONG** D-015 | `UX-ADM-001` |
| Idle lock during support | PIN overlay; banner kept | **FIXED** | `AUTH-ADM-001` |
| Dashboard KPIs | em-dash | **dead** | `UX-ADM-DASH-001` |
| KYC Approve | decide API | **OK**; evidence raw URL | `M2-KYC-002` |
| Pharmacies Suspend | status + reason | **OK**; KYC-pending no transition | `M2-LIFE-004` |
| Support Enter | impersonation | **D-001 unlogged**; HQ chrome MASTER | `M1-IMPERSON-002` |
| Licence Rescan | GET /due | **write scan** | `M7-LIC-003` |
| Subscriptions override | MASTER | **OK**; expiry ≠ tenant lock | `M2-LIFE-001` |
| Checkout exceptions | display only | **no HQ reconcile** | `M11-CF-008` |
| WABA Rescan | Graph ping | **does not pull templates** | `M10-WA-007` |
| Workflow desks Store | platform rule | **never applied to POS** | `M1-WF-001` |

---

## OWNER day path (compressed)

Home (OWNER OK) → Restock **lands on Stock not Guidance** (`OWN-NAV-001`) → no reorder draft (`M5-REO-001`) → Transfers blank on All outlets (`OWN-NAV-004`) → Approvals href **correct** → Expenses All-outlets posts to `branches[0]` (`OWN-EXP-001`) → Aging FIFO hidden (`M8-AGE-001`) → Books D-005 OK → CA silent drop of GST (`OWN-CA-002`) → Plan card “Monthly billing” on Free (`OWN-SUB-001`).
