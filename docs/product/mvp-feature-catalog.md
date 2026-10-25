# MVP feature catalog

Status of every item below: **current**. The dashboard reads and writes a Postgres pharmacy document through `/api/v1`. The browser keeps the cart, the current screen, and the toast.

The public URL is `/`. `Shell.tsx` switches screens from the `Route` value in `pharmaState.tsx`.

## Access model

Sign-in is the OTP screen in `Onboarding.tsx`. The hinted demo code is `123456`, and any six digits signs in. The user chooses `pharmacy` or `hospital`. That choice is `businessType`.

A nine-step setup wizard in `SetupWizard.tsx` can run before the shell. `setupComplete` remembers that it finished.

### Plan gate

`routeLocked()` in `data.ts` is the only navigation gate.

- Free routes, always open: Billing / POS, Inventory, Purchases, Invoice Settings.
- Shell routes, always open: Dashboard, Account, Subscription, Settings, Help & Support, Refer & Earn, plus the unused `notifications` and `menu` keys.
- Every other route is locked while the plan is `Free` or the subscription status is `expired`.
- Any active `Starter`, `Growth`, or `Pro` plan opens every route. `planForRoute()` supplies upsell copy only. The code does not enforce the Starter, Growth, and Pro feature split shown on the plan cards.

Hospital routes are additionally hidden unless `businessType` is `hospital`.

### Staff permissions

`UsersScreen` edits a permission list on `StaffUser`. The shell hides a nav item when that list does not include the matching module. The owner sees every item. Sales, customers, kiosk, hospital screens, account, subscription, refer, and support have no permission key and stay available when the plan allows them. Server checks on expenses, employees, and users stay. Older mutations are not permission-checked yet.

## Onboarding and shell

| Surface | File | What it does now |
|---------|------|------------------|
| OTP sign-in | `components/Onboarding.tsx` | Accepts any six-digit code and stores business type |
| Setup wizard | `components/SetupWizard.tsx` | Collects the store profile locally |
| Shell | `components/Shell.tsx` | Sidebar, plan paywall, and screen switch |

`notifications` and `menu` exist on the `Route` type and have page titles. No sidebar item selects them. The screen switch falls through to the dashboard.

## Retail screens

| Route | Screen | Plan copy | Current behavior |
|-------|--------|-----------|------------------|
| `dashboard` | `DashboardScreen.tsx` | Always open | Today and month figures, alerts, quick actions. Hospital mode adds hospital blocks. Figures come from in-memory sales. |
| `pos` | `PosScreen.tsx` | Free | Counter bill, barcode scan, loose quantity, discount, payment mode, credit, insurance, prescription photo, and hospital source/ward/UHID. Checkout writes a sale and reduces stock. |
| `orders` | `OrdersScreen.tsx` | Growth copy | Online orders: accept, cancel, pack, scan, seal, rider handover, and mark paid. |
| `sales` | `SalesScreen.tsx` | Growth copy | Sales ledger, filters, invoice view, and share. |
| `prescriptions` | `PrescriptionsScreen.tsx` | Starter copy | Pending, approved, dispensed, and rejected prescriptions. Approve, reject, or dispense into POS. |
| `customers` | `CustomersScreen.tsx` | Starter copy | Customer list derived from sales, with history and a credit-repayment shortcut. |
| `khata` | `KhataScreen.tsx` | Starter copy | Credit sales minus recorded repayments. |
| `crm` | `CrmScreen.tsx` | Growth copy | Segments, RFM, campaigns, feedback, reminders, loyalty redemption, and patient notes. Campaigns update local counters only. |
| `inventory` | `InventoryScreen.tsx` | Free | Create and edit products and batches. Filter low stock and near expiry. |
| `rackmap` | `RackMapScreen.tsx` | Growth copy | Rack registry, assignment, label print, and rack CSV. |
| `purchases` | `PurchasesScreen.tsx` | Free | Goods receipt, including CSV import, then stock increase. |
| `reorder` | `ReorderScreen.tsx` | Growth copy | Low-stock purchase order to a distributor. |
| `distributors` | `DistributorsScreen.tsx` | Growth copy | Supplier records, supply prices, and preferred supplier. |
| `online` | `OnlineStoreScreen.tsx` | Growth copy | Per-product online listing, online price, and direct offer. |
| `offers` | `OffersScreen.tsx` | Growth copy | Percentage or flat offers by all items, category, or product. |
| `kiosk` | `KioskScreen.tsx` | Pro copy | Kiosk settings and a local self-order checkout. |
| `reports` | `ReportsScreen.tsx` | Growth copy | 31 calculated reports, CSV/PDF download in the browser. |
| `expenses` | `ExpensesScreen.tsx` | Growth copy | Expense entries and custom categories. |
| `ca` | `CAReportScreen.tsx` | Growth copy | Advisor records and a share action. Share shows a toast; it does not send email. |
| `account` | `AccountScreen.tsx` | Always open | Profile summary, plan, bank account, and shortcuts. |
| `employees` | `EmployeesScreen.tsx` | Growth copy | Employee records and document data URLs. |
| `users` | `UsersScreen.tsx` | Growth copy | Staff profiles, roles, and permissions. The shell hides screens the signed-in user cannot open. Seed records contain demo passwords. |
| `invoicing` | `InvoiceSettingsScreen.tsx` | Free | Invoice prefix, template, terms, and logo. Templates include thermal. |
| `subscription` | `SubscriptionScreen.tsx` | Always open | Plan and billing-cycle change with a mock checkout. |
| `refer` | `ReferScreen.tsx` | Always open | Static referral rows and a generated code. No referral records are stored. |
| `settings` | `SettingsScreen.tsx` | Always open | Profile, licences, custom fields, loose-sale default, and demo reset. |
| `support` | `SupportScreen.tsx` | Always open | Static FAQ and channels. Tickets stay in component state, including seed ticket `TKT-8841`. |

## Hospital screens

Shown only for `businessType: "hospital"`. Plan copy says Pro. The current gate opens them for every active paid plan.

| Route | Screen | Current behavior |
|-------|--------|------------------|
| `wards` | `WardsScreen.tsx` | Ward records, admit, discharge, bed map, and start a POS bill for an admission. Occupied wards cannot be removed. |
| `hospbill` | `HospitalBillingScreen.tsx` | Hospital credit account, ward issue and return, pricing changes after OTP `123456`, payments, and indent billing. |
| `ptbills` | `PatientBillsScreen.tsx` | Active inpatient bills and batch settlement. |
| `salesreg` | `SalesRegisterScreen.tsx` | Sales filtered by source, payment mode, and insurer. |
| `indents` | `IndentsScreen.tsx` | Approve, reject, or issue a ward indent. Issue moves stock and opens hospital billing when needed. |
| `departments` | `DepartmentsScreen.tsx` | Read-only seeded departments and doctors. No mutation exists. |
| `doctors` | `DoctorsScreen.tsx` | Create, edit, and remove doctor profiles. |

## Declared data without a screen

| Data | Current behavior |
|------|------------------|
| `tpaClaims` and `setClaimStatus` | Seeded and mutable in context. No screen reads or edits claims. |
| `buildSalesHistory()` | Defined in `data.ts` and unused. Charts use the smaller seed sales. |

## Report catalog

`lib/reportCatalog.ts` calculates these IDs from sales, purchases, inventory, and expenses:

`balance-sheet`, `gstr1`, `pnl`, `sales-summary`, `gstr2`, `gstr3b`, `gst-purchase-hsn`, `gst-sales-hsn`, `hsn-sales-summary`, `tds-payable`, `tds-receivable`, `tcs-payable`, `tcs-receivable`, `audit-trail`, `bill-wise-profit`, `cash-bank`, `daybook`, `expense-category`, `expense-transaction`, `purchase-summary`, `item-by-party`, `item-sales-purchase`, `low-stock`, `rate-list`, `stock-detail`, `stock-summary`, `receivable-ageing`, `party-by-item`, `party-ledger`, `party-outstanding`, `sales-category-wise`.

Exports are generated in the browser by `lib/reportExport.ts`, `lib/stockExport.ts`, `lib/customerExport.ts`, and `lib/pdf.ts`.

## Explicit demo boundaries

- No SMS, WhatsApp, email, payment gateway, penny drop, e-invoice, or rider network is connected.
- Prescription images, logos, signatures, product photos, and employee documents are stored and returned as `/api/v1/files/<id>`.
- GST totals on screen are JavaScript rupees. The API converts money fields to integer paise at the boundary.
- Stock writes that move quantity require an `Idempotency-Key`. The same key returns the original result and does not move stock twice.
- Settings → Reset asks for confirmation, then loads the sample store. A sample mobile that already belongs to another pharmacy stays visible on the user list and still signs into the pharmacy that owns it.
