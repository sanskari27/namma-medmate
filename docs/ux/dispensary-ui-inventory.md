# Dispensary UI inventory

Read-only snapshot of the pharmacy-staff SPA (`dispensary/`) as it exists today.
**No redesign or refactor in this document.** Use it as the punch list for later
work: pick one surface, then redesign/reorganize that surface.

Source of truth for this inventory: `dispensary/src/router/index.tsx`,
`dispensary/src/libs/constants/routes.const.ts`, and the screen / overlay files
they mount. Copy below is the live chemist-facing language, not a proposed rewrite.

---

## How to use this later

Suggested order when we start (not doing any of this now):

1. Shell chrome (sidebar, header, global overlays) — every screen sits in it.
2. Highest-traffic floor surfaces: Sales (POS), Inventory workspaces, Customers.
3. Remaining routed screens, one nav item at a time.
4. Shared templates (customer/credit/doctor dialogs) once their host screens settle.

Each numbered item in the catalogs below is a discrete redesign unit.

---

## Snapshot

| Kind | Count | Notes |
| --- | ---: | --- |
| Routed screens | 36 | 5 auth + 31 behind `ProtectedRoute` / `DashboardLayout` |
| Sidebar nav items | 31 | Dashboard + 4 sections; some items hide by role/module |
| Named dialogs | 26 | 20 screen-private + 5 shared templates + 1 chrome Profile |
| Full-screen overlays | 5 mounted | Password change, PIN enroll, PIN lock (idle), POS offline, kiosk customer mode |
| Drawers / sheets | 2 | Mobile nav drawer; alert-bell floor sheet (mobile) |
| Dropdown menus | 3 | Outlet switch, account menu, staff row actions |
| Inventory in-route workspaces | 9 | Tabs on `/inventory`, not separate routes |
| Dashboard desks | 4 | Owner / cashier / inventory / accountant |
| Shared templates | 6 | 5 dialogs + `ProductUnitSelect` |
| Overlay primitives | 3 | `DialogContent`, `DrawerContent`, `FloorSheetContent` |

Atoms in use: Button, Card, Input, Label, Reveal, Tooltip. Overlay chrome lives in
molecules (`dialog`, `dropdown-menu`, `popover`), not atoms.

---

## 1. Shell and global chrome

These wrap every authenticated screen.

### 1.1 Layouts

| ID | File | What it is |
| --- | --- | --- |
| L1 | `layouts/AuthLayout.tsx` | Pass-through `<Outlet />` only. Auth screens own their own split layout. |
| L2 | `layouts/DashboardLayout.tsx` | Full-height shop shell: skip link, left rail (desktop) or drawer (mobile), 44px header, scrollable main, tenant-status banners, blocking overlays. |
| L3 | `components/organisms/protected-route/ProtectedRoute.tsx` | Redirects to `/login` when there is no session. |

### 1.2 Counter rail (sidebar)

`components/organisms/app-sidebar/AppSidebar.tsx`

- Dark ink rail, 4px brand stripe, wordmark **MedMate**.
- Collapsed `4.25rem` / expanded `16.5rem`.
- Outlet switcher (dropdown): owner can pick **All outlets**; others pick a branch.
- Nav: Dashboard, then four collapsible sections (see §2).
- Footer account menu (dropdown): **Profile**, **Account settings**, **Sign out**.
- Mobile: same rail inside `DrawerContent` from `DashboardLayout`.
- Header companion: `ShellHeader` (page title from `MODULE_NAV_ITEMS` + collapse / hamburger).

**Nav icon gaps:** `/returns`, `/branches`, `/controlled-register` have no `NAV_ICONS` entry and fall back to a generic `Contact` icon.

### 1.3 Header trailing chrome

Mounted from `DashboardLayout` into `ShellHeader`:

| ID | Component | What it is |
| --- | --- | --- |
| C1 | `CounterAlertBell` | Unread inbox. Desktop: `Popover`. Mobile: bottom `FloorSheetContent`. Opens destination routes (khata, purchases, licences, subscription, account, inventory). |
| C2 | Display name tooltip | “Signed in at this counter”. |
| C3 | Sign out button | Header (sm+) plus sidebar account menu. Idle opens PIN lock (see C7). |

### 1.4 Global overlays and banners

| ID | Surface | Mount | Blocking? | Status |
| --- | --- | --- | --- | --- |
| C4 | `CounterPasswordChange` | `DashboardLayout` when `mustChangePassword` | Yes, full viewport | Mounted |
| C5 | `CounterPinEnroll` | `DashboardLayout` when PIN not set (after password change) | Yes, full viewport | Mounted |
| C6 | Profile dialog | `AppSidebar` account menu | Modal | Mounted — name + current outlet only |
| C7 | `CounterPinLock` | `DashboardLayout` after 5 min idle (PIN enrolled) | Full-viewport PIN unlock; session kept | Mounted (D-015 revised 2026-09-09) |
| C8 | Mobile module drawer | `DashboardLayout` `< md` | Drawer | Mounted |
| C9 | Tenant status banners | Main, above `<Outlet />` | No | `VERIFICATION_REQUIRED`, `SUSPENDED`, `EXPIRED`, `TERMINATED` |

Login PIN keypad (`CounterPinSignIn`) is a **login-screen mode**, not a layout overlay. See A1.

---

## 2. Information architecture (sidebar)

Four sections from `NAV_SECTIONS`. Items still load if the URL is hit even when the
sidebar hides them.

### Billing / POS

| Nav label | Path | Screen |
| --- | --- | --- |
| Sales | `/pos` | PosScreen |
| Returns | `/returns` | ReturnsScreen |
| Prescriptions | `/prescriptions` | PrescriptionsScreen |
| Customers | `/customers` | CustomersScreen |
| Tag broadcasts | `/campaigns` | CampaignsScreen — hidden without campaign access |
| Credit / Khata | `/credit` | CreditScreen |

### Catalogue

| Nav label | Path | Screen |
| --- | --- | --- |
| Inventory | `/inventory` | InventoryScreen (9 workspaces) |
| Purchases | `/purchases` | PurchasesScreen |
| Distributors | `/distributors` | DistributorsScreen |
| Offers | `/offers` | OffersScreen |
| Self-Order Kiosk | `/kiosk` | KioskScreen |

### Business

| Nav label | Path | Screen |
| --- | --- | --- |
| Compare weeks | `/reports` | TrendsScreen — reporting access |
| Build a report | `/custom-reports` | CustomReportsScreen — reporting access |
| Expenses | `/expenses` | ExpensesScreen — finance access |
| Khata dues | `/aging` | AgingScreen — finance access |
| Shop books | `/books` | ShopBooksScreen — finance access |
| CA / Accountant | `/accountant` | CaPackScreen — finance access |

Finance access = owner or accountant desk. Reporting = owner or `REPORTING` module.
Campaigns = owner or `CAMPAIGNS` module.

### Account

| Nav label | Path | Screen |
| --- | --- | --- |
| Account | `/account` | AccountScreen (KYC) |
| Licences | `/licenses` | LicensesScreen |
| WhatsApp slots | `/whatsapp-templates` | WhatsappTemplatesScreen |
| WhatsApp sends | `/whatsapp-sends` | WhatsappSendsScreen — campaign access |
| Register book | `/registers` | RegistersScreen |
| NDPS sale book | `/controlled-register` | ControlledRegisterScreen |
| Staff accounts | `/users` | StaffAccountsScreen |
| Floor roles | `/roles` | CounterRolesScreen |
| Sign-off rules | `/approvals` | SignOffRulesScreen |
| Waiting for sign-off | `/approvals/pending` | WaitingSignOffScreen |
| Floor activity | `/activity` | FloorActivityScreen |
| Outlets | `/branches` | BranchesScreen |
| Subscription | `/subscription` | SubscriptionScreen |

Plus **Dashboard** at `/` (not inside a section).

Auth routes (no sidebar): `/login`, `/forgot-password`, `/reset-password`, `/register`, `/verify-email`.

Catch-all `*` → Dashboard.

---

## 3. Screen catalog

Each row is one redesign unit unless noted (Inventory and Dashboard have nested units).

### 3.1 Auth (no dashboard chrome)

| ID | Screen | Route | Layout | Modes / overlays | Gating |
| --- | --- | --- | --- | --- | --- |
| A1 | Login | `/login` | Feature slider + form rail | **Picker** (saved till people) → **PIN keypad** (`CounterPinSignIn`) → **email/password**. Empty/failed saved list forces password. | Pharmacy roles only; non-pharmacy denied |
| A2 | Forgot password | `/forgot-password` | Auth form | — | Owner-email reset; staff reset lives under Staff accounts |
| A3 | Reset password | `/reset-password` | Auth form | Token from email | Owner |
| A4 | Register | `/register` | Auth form | — | New pharmacy owner |
| A5 | Verify email | `/verify-email` | Auth status/form | — | Owner email confirm |

### 3.2 Dashboard

| ID | Screen | Route | Layout | Nested units | Gating |
| --- | --- | --- | --- | --- | --- |
| D1 | Dashboard | `/` | Desk switch + widgets | **D1a** Shop glance (owner): sales, stock, waiting, books, movers, compliance strips. **D1b** Till today (cashier). **D1c** Stock desk (inventory). **D1d** Khata and spend (accountant). Owner outlet scope filter. | Desks from role/modules |

### 3.3 Billing / POS screens

| ID | Screen | Route | Layout | Nested / overlays | Gating |
| --- | --- | --- | --- | --- | --- |
| B1 | Sales (POS) | `/pos` | Two-column till workspace | See §5 POS regions. Dialog: Tax override. Overlay: Till is offline. | `SALES`; loyalty needs `LOYALTY` |
| B2 | Returns | `/returns` | Locator → line picker → decision form → refund summary + history | No dialogs | `SALES` |
| B3 | Prescriptions | `/prescriptions` | Filter + list + detail | Modes: Active / Archived | Owner or pharmacist desk |
| B4 | Customers | `/customers` | List + profile | Due-refills strip. Profile sections: contact, health, credit, loyalty, refills, tags, purchase history, doctor, family, family credit, family history. Dialogs: create, merge, family, doctor, settle, loyalty adjust. | `CRM`; credit limit / loyalty adjust owner |
| B5 | Tag broadcasts | `/campaigns` | List + form + preview | No dialogs | Campaign access |
| B6 | Credit / Khata | `/credit` | List + detail | Dialog: settle | `CRM` |

### 3.4 Catalogue screens

| ID | Screen | Route | Layout | Nested / overlays | Gating |
| --- | --- | --- | --- | --- | --- |
| K1 | Inventory | `/inventory` | Header tabs + workspace | **Nine in-route workspaces** — see §4. Six create/confirm dialogs. | `INVENTORY`; start count = owner |
| K2 | Purchases | `/purchases` | List + order panel | Pro strip (bulk indent + stockist spend). Dialogs: reorder draft, record delivery. | `PROCUREMENT` |
| K3 | Distributors | `/distributors` | List + form + ledger | Due strip. Dialog: record payment. | `PROCUREMENT` or `FINANCE` |
| K4 | Offers | `/offers` | List + form | BOGO / seasonal / bundle | `SALES` |
| K5 | Self-Order Kiosk | `/kiosk` | Staff console **or** full-viewport customer mode | Waiting tickets; open/close session | `KIOSK` + Pro + branch type Kiosk |

### 3.5 Business / books screens

| ID | Screen | Route | Layout | Nested | Gating |
| --- | --- | --- | --- | --- | --- |
| F1 | Compare weeks | `/reports` | Filters + summary + charts | Sales chart, top sellers, slow/dead, frequency | Reporting; Growth plan gate |
| F2 | Build a report | `/custom-reports` | Dataset → columns → filters → dates/outlet → preview | CSV / PDF | Reporting; Growth plan gate |
| F3 | Expenses | `/expenses` | Filters + totals + list + form | Add-category fields in form | Finance |
| F4 | Khata dues | `/aging` | Filters + bucket strip + dual party lists | Receivables vs payables | Finance; Growth plan gate |
| F5 | Shop books | `/books` | Book picker + filters + totals + table | Books: Day book, Sales, Stockist buys, Shop spend, Shop P&L, GSTR-1, GSTR-3B, Outlet P&L. Upgrade panel when not entitled. | Finance; plan gate per book |
| F6 | CA / Accountant | `/accountant` | Filters + section list | Categorized figures for the CA | Finance |

### 3.6 Account / ops screens

| ID | Screen | Route | Layout | Nested / overlays | Gating |
| --- | --- | --- | --- | --- | --- |
| S1 | Account (KYC) | `/account` | Status + KYC form | **Monolith** (no private components). Legal name, licence, PAN, address, phone, file uploads. | Owner |
| S2 | Licences | `/licenses` | List + form + due strip | Drug, GST, FSSAI, pharmacist papers | Owner |
| S3 | WhatsApp slots | `/whatsapp-templates` | Catalogue + variables + preview | Locked approved slots | Owner |
| S4 | WhatsApp sends | `/whatsapp-sends` | List + detail | Kind filter (all / refill due / credit due / …) | Campaign access |
| S5 | Register book | `/registers` | Book list + filters + table | H1 / stock / licence / purchase books; CSV or PDF; upgrade panel | `COMPLIANCE`; plan gate per book |
| S6 | NDPS sale book | `/controlled-register` | Filters + list | Read-only Schedule sales | Owner or pharmacist desk |
| S7 | Staff accounts | `/users` | Staff list + row menu | Dialogs: add staff, reset password, roles, outlets, remove access | Owner |
| S8 | Floor roles | `/roles` | Role cards | Dialog: add role | Owner |
| S9 | Sign-off rules | `/approvals` | Form + rules table | **Monolith** | Owner or `APPROVALS` |
| S10 | Waiting for sign-off | `/approvals/pending` | Request list, inline approve/reject | **Monolith** | Approver (API 403 → denied) |
| S11 | Floor activity | `/activity` | Activity table | **Monolith** | Owner or `APPROVALS` |
| S12 | Outlets | `/branches` | Table + create/edit form | **Monolith**. Address, drug licence, till pricing, Kiosk type. | Owner; quota → plan upgrade |
| S13 | Subscription | `/subscription` | Plan board + usage + stall strip | Monthly rate / upgrade | Owner |

### Screens that are still large / unsplit

These orchestrate markup in the screen file instead of private `components/`:

- Account (KYC)
- Outlets
- Sign-off rules
- Waiting for sign-off
- Floor activity
- Self-Order Kiosk
- Floor roles (only the add dialog is extracted)
- Login (PIN extracted; picker + password still in the screen)

CustomersScreen is split into sections but the screen file itself is still a large orchestrator (~870 lines).

---

## 4. Inventory workspaces (one route, nine units)

`/inventory` is the densest screen. Treat each tab as its own redesign unit later.

| ID | Tab | Workspace | Dialogs | Purpose (live copy) |
| --- | --- | --- | --- | --- |
| I1 | Floor stock | `FloorStockWorkspace` | Receive stock | Batch, expiry, qty on the active outlet |
| I2 | Catalogue | `CatalogueWorkspace` | Add SKU (inline form, not a dialog) | Tenant product master; search name / SKU / barcode |
| I3 | Transfers | `TransferWorkspace` | Start outlet transfer | Push/pull between outlets; receiving till confirms |
| I4 | Adjustments | `AdjustmentWorkspace` | Record stock write-off | Damage, expiry, theft, count correction, sample |
| I5 | Guidance | `GuidanceWorkspace` | — | Near-expiry, low-stock hints, reorder CSV, valuation |
| I6 | Physical count | `StockTakeWorkspace` | Start physical count | Owner starts; staff count; post variances. Includes inline `StockTakeCountSheet` (not a modal) |
| I7 | Schedule register | `ControlledStockWorkspace` | — | H, H1, X, NDPS movements; inspector export |
| I8 | Quality check | `QualityCheckWorkspace` | Accept onto floor? | Inspect GRN before it hits the shelf |
| I9 | Returns | `PurchaseReturnWorkspace` | Send back to stockist | Confirmed return cuts floor stock + debit note |

Header primary actions change with the tab (Add SKU, Receive, Transfer, Write-off, Start count, Send back).

Related but **separate routes**: sales returns (`/returns`), NDPS **sale** book (`/controlled-register`), register books (`/registers`). Those overlap conceptually with I7–I9.

---

## 5. POS regions (one route, many panels)

`/pos` — “Till bill”. Two columns plus footer. Treat as one screen with these regions:

**Left**

- Customer picker (search / select / walk-in)
- Prescription panel (when Rx draft): doctor, prescribed qty, verified flag, controlled gate
- Draft lines: product search, batch, unit, qty, MRP, selling, line discount, tax override

**Right**

- Held bills
- Offers
- GST breakdown
- Bill discount / bill type / customer GSTIN
- Loyalty redeem (named customer, entitled)
- Tender / collect
- Invoice output (print / email after collect)
- Medication safety warnings

**Chrome**

- Discount-approval status banner
- Ack footer: evaluate / save / hold / complete + reason when required
- Tax override dialog
- Offline overlay (`PosConnectivityOverlay`) — Escape trapped; collect blocked

`PosBillTotals` exists as a component but is not used by `PosScreen`.

POS does **not** open `CustomerCreateDialog`; new patients are created on Customers.

---

## 6. Dialog catalog

### 6.1 Shared templates (`src/components/templates`)

| ID | Dialog | Title (live) | Used from |
| --- | --- | --- | --- |
| T1 | `CustomerCreateDialog` | New customer | Customers |
| T2 | `CustomerMergeDialog` | Merge customers | Customers |
| T3 | `CustomerFamilyDialog` | Family | Customers |
| T4 | `DoctorReferenceDialog` | Doctor | Customers |
| T5 | `CreditSettleDialog` | Settle khata | Customers, Credit |

Also a non-dialog template: `ProductUnitSelect` (POS draft lines).

### 6.2 Screen-private dialogs

| ID | Dialog | Title (live) | Host |
| --- | --- | --- | --- |
| P1 | `PosTaxAdjustDialog` | Tax override | POS |
| P2 | `CustomerLoyaltyAdjustDialog` | Loyalty adjust | Customers |
| P3 | `StockReceiveDialog` | Receive stock | Inventory / floor |
| P4 | `TransferCreateDialog` | Start outlet transfer | Inventory / transfers |
| P5 | `AdjustmentCreateDialog` | Record stock write-off | Inventory / adjustments |
| P6 | `StockTakeStartDialog` | Start physical count | Inventory / stock take |
| P7 | `QualityCheckConfirmDialog` | Accept onto floor? | Inventory / QC |
| P8 | `PurchaseReturnCreateDialog` | Send back to stockist | Inventory / returns |
| P9 | `ReorderDraftDialog` | Draft from reorder | Purchases |
| P10 | `GoodsReceiptDialog` | Record delivery | Purchases |
| P11 | `DistributorPaymentDialog` | Record payment | Distributors |
| P12 | `AddTillLoginDialog` | Add staff | Staff accounts |
| P13 | `TillPasswordDialog` | Reset password | Staff accounts |
| P14 | `RolesDialog` | Roles | Staff accounts |
| P15 | `BranchesDialog` | Outlets | Staff accounts (assign branches to a login) |
| P16 | `OffboardTillDialog` | Remove staff access? | Staff accounts |
| P17 | `FloorRoleDialog` | Add role | Floor roles |
| P18 | Profile (inline in sidebar) | Profile | AppSidebar |

### 6.3 Other overlays (not `DialogContent`)

| ID | Surface | Primitive | Host |
| --- | --- | --- | --- |
| O1 | Mobile module rail | `DrawerContent` | DashboardLayout |
| O2 | Counter alerts (desktop) | `Popover` | CounterAlertBell |
| O3 | Counter alerts (mobile) | `FloorSheetContent` | CounterAlertBell |
| O4 | Till is offline | Custom `alertdialog` | POS |
| O5 | Kiosk customer walk-up | `fixed inset-0` panel | Kiosk |
| O6 | Forced password change | Full-viewport organism | DashboardLayout |
| O7 | Forced PIN enroll | Full-viewport organism | DashboardLayout |
| O8 | Outlet switch | `DropdownMenu` radio | AppSidebar |
| O9 | Account menu | `DropdownMenu` | AppSidebar |
| O10 | Staff row actions | `DropdownMenu` (`TillRowMenu`) | Staff accounts |

No `*Modal.tsx` files. No AlertDialog primitive. Confirmations use the same `Dialog`.

---

## 7. Dropdown / popover / drawer actions

| Host | Trigger | Items |
| --- | --- | --- |
| Sidebar header | Outlet chip | All outlets (owner) + each branch |
| Sidebar footer | Staff initials | Profile · Account settings · Sign out |
| Staff list row | ⋯ | Reset password · Roles · Outlets · Remove access |
| Header bell | Bell | Inbox list → navigate to destination module |
| Header (mobile) | Hamburger | Opens module drawer |

---

## 8. Component layers (shared, not screens)

Useful when we later restyle primitives vs. rewrite screens.

### Atoms

Button, Card, Input, Label, Reveal, Tooltip.

### Molecules

Dialog (`DialogContent`, `DrawerContent`, `FloorSheetContent`), Dropdown menu, Popover, Counter feature slider (login), Area/bar metric charts + live variants.

### Organisms

App sidebar + shell header, Counter alert bell, Counter password change, Counter PIN enroll, Counter PIN lock (idle), Protected route.

### Templates

Customer create / merge / family, Doctor reference, Credit settle, Product unit select.

---

## 9. Access and plan gates (UI)

Server remains authoritative. UI only hides or shows.

| Gate | Effect |
| --- | --- |
| No session | Auth layout only |
| `mustChangePassword` / `!pinSet` | Blocking overlays; floor not usable until done |
| Tenant `VERIFICATION_REQUIRED` / `SUSPENDED` / `EXPIRED` / `TERMINATED` | Banner; floor modules stay closed (copy says so) |
| Module `SALES` | POS, returns, offers |
| Module `CRM` | Customers, credit |
| Module `INVENTORY` | Inventory |
| Module `PROCUREMENT` | Purchases; distributors (or finance) |
| Module `CAMPAIGNS` | Campaigns, WhatsApp sends (nav + screen) |
| Module `REPORTING` | Trends, custom reports (nav + screen) |
| Module `COMPLIANCE` | Register book |
| Module `APPROVALS` | Sign-off rules, floor activity |
| Module `KIOSK` + Pro + kiosk branch | Kiosk |
| Module `LOYALTY` | Loyalty sections / POS redeem |
| Owner only | KYC, licences, WhatsApp slots, staff, roles, outlets, subscription, start stock take, some credit/loyalty edits |
| Owner or pharmacist | Prescriptions, NDPS sale book |
| Finance (owner or accountant desk) | Expenses, aging, shop books, CA pack; distributors if no procurement |
| Plan gates | Aging, trends, custom reports, some register/shop books, kiosk, branch quota |

---

## 10. Observations for later (not work now)

Facts only — do not treat as a redesign spec.

1. **One route does many jobs.** Inventory (9 tabs) and POS (full till) are the two largest “apps inside a page”. Dashboard is four desks on one route.
2. **Overlapping “returns” and “registers”.** Sales returns (`/returns`), purchase returns (Inventory tab), NDPS sale book (`/controlled-register`), Schedule register (Inventory tab), and Register book (`/registers`) are five surfaces around returns/compliance.
3. **Account section is long.** Thirteen items under Account, including staff, approvals, WhatsApp, registers, outlets, and KYC.
4. **Idle PIN lock** is mounted (`CounterPinLock`); hard idle logout was revoked by D-015 revision.
5. **Auth layout is empty.** Login already has a feature slider; other auth screens do not share it via `AuthLayout`.
6. **Profile dialog is a stub.** Name + outlet; Account settings goes to KYC, not a personal profile.
7. **Monolith screens** listed in §3.6 will be harder to restyle in isolation.
8. **Missing nav icons** for Returns, Outlets, NDPS sale book.
9. **Kiosk customer mode** leaves the dashboard chrome by covering the viewport; it is not a separate route.
10. **No command palette, no global search, no breadcrumbs.** Navigation is sidebar + in-page tabs only.
11. **Shared customer dialogs** are already templates; POS cannot create a customer without leaving the till.

---

## 11. Suggested redesign sequence (when we start)

Pick one ID per pass. Do not start until we agree the first ID.

| Pass | IDs | Why first |
| --- | --- | --- |
| 0 — Shell | L2, sidebar, C1–C9 | Every later screen sits in this chrome |
| 1 — Auth | A1–A5 | Separate from the floor; small surface |
| 2 — Till | B1 + POS regions + P1 + O4 | Highest-frequency floor job |
| 3 — Inventory | K1 / I1–I9 + P3–P8 | Second densest; decide tabs vs routes |
| 4 — People | B4, B6 + T1–T5 + P2 | Shared templates; CRM |
| 5 — Buy side | K2, K3 + P9–P11 | Purchases / distributors |
| 6 — Rest of billing | B2, B3, B5, K4, K5 | Returns, Rx, campaigns, offers, kiosk |
| 7 — Books | D1, F1–F6 | Dashboard + finance/reporting |
| 8 — Account/ops | S1–S13 + P12–P18 | Long Account nav; staff dialogs |

Stop here until we pick a first pass.
