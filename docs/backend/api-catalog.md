# Planned API catalog

Status: **implemented** in `namma-pharmacy/src/app/api/v1`. Paths are under `/api/v1`.

Money in request and response bodies is integer paise. The POS cart is not an API resource; checkout submits the finished cart.

## Session and setup

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| POST | `/auth/otp/send` | OTP request. Body: phone. | `Onboarding.tsx` |
| POST | `/auth/otp/verify` | `signIn`. Body: phone, code, business type, optional name. Sets the session. | `signIn` |
| POST | `/auth/sign-out` | `signOut` | `signOut` |
| GET | `/session` | One snapshot for dashboard hydration: user, subscription, and the pharmacy collections. Hospital lists are empty unless that plan is open. | `pharmaState.tsx` |
| GET, PATCH | `/pharmacy/profile` | `updateProfile` | `SettingsScreen`, `SetupWizard` |
| POST | `/pharmacy/store-open` | `toggleStoreOpen` | `updateProfile` flow |
| GET, PATCH | `/settings/invoice` | `updateInvoiceSettings` | `InvoiceSettingsScreen` |
| GET, PATCH | `/settings/kiosk` | `updateKiosk` | `KioskScreen` |
| POST | `/setup/complete` | `completeSetup` | `SetupWizard` |
| POST | `/setup/wipe` | `wipeData` | setup flow |
| POST | `/demo/reset` | `resetDemo`. Development only. | `SettingsScreen` |

## Inventory, racks, and scan

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| GET | `/inventory` | Inventory list, including batches | `InventoryScreen`, POS |
| POST | `/inventory/products` | `addProduct` | `addProduct` |
| PATCH | `/inventory/products/:id` | `updateProduct` | `updateProduct` |
| POST | `/inventory/products/:id/batches` | `addBatch` | `addBatch` |
| PATCH | `/inventory/products/:id/batches/:batchNo` | `setBatchQty` | `setBatchQty` |
| POST | `/inventory/products/:id/online` | `toggleOnline` | `OnlineStoreScreen` |
| POST | `/inventory/products/:id/loose` | `toggleLoose` | inventory controls |
| PATCH | `/inventory/products/:id/online-price` | `setOnlinePrice` | `setOnlinePrice` |
| PATCH | `/inventory/products/:id/offer` | `setProductOffer` | `setProductOffer` |
| PATCH | `/inventory/products/:id/supplier` | `setProductSupplier` | `setProductSupplier` |
| PATCH | `/inventory/products/:id/location` | `setProductLocation` | rack assignment |
| POST | `/inventory/location/bulk` | `bulkAssignLocation` | `RackMapScreen` |
| GET | `/inventory/scan?q=` | `findScan` | `scanToPos`, packing scan |
| GET | `/racks` | Rack registry | `racks` |
| POST | `/racks` | `createRack` | `createRack` |
| DELETE | `/racks/:code` | `removeRack` | `removeRack` |

## Purchases and distributors

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| GET | `/purchases` | Purchase list | `PurchasesScreen` |
| POST | `/purchases/receive` | `receivePurchase`, including rows parsed from CSV in the browser | `receivePurchase`, `lib/purchaseCsv.ts` |
| GET, POST | `/suppliers` | Supplier list and `addSupplier` | `DistributorsScreen` |
| PATCH | `/suppliers/:id` | `updateSupplier` | `updateSupplier` |
| DELETE | `/suppliers/:id` | `removeSupplier` and its supply rows | `removeSupplier` |
| GET, POST | `/supply-list` | Supply list and `addSupply` | `addSupply` |
| PATCH | `/supply-list/:id` | `updateSupply` | `updateSupply` |
| DELETE | `/supply-list/:id` | `removeSupply` | `removeSupply` |
| POST | `/supply-list/:id/preferred` | `setPreferredSupply` | `setPreferredSupply` |
| GET, POST | `/purchase-orders` | PO list and `sendPurchaseOrder` | `ReorderScreen` |
| POST | `/purchase-orders/:id/received` | `markPOReceived` | `markPOReceived` |

## Sales, orders, and kiosk

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| GET | `/sales` | Filterable sales and online orders | `SalesScreen`, `OrdersScreen` |
| GET | `/sales/:id` | One invoice | `Invoice.tsx` |
| POST | `/pos/checkout` | `checkoutPos`, stock deduction, and an optional prescription created from the attached image | `checkoutPos` |
| POST | `/sales/:id/mark-paid` | `markPaid` | `markPaid` |
| POST | `/sales/:id/advance` | `advanceOrder` | `advanceOrder` |
| POST | `/sales/:id/cancel` | `cancelOrder` and restock of picked quantity | `cancelOrder` |
| POST | `/sales/:id/packing/start` | `startPacking` | `startPacking` |
| POST | `/sales/:id/packing/scan` | `scanPackLine` | `scanPackLine` |
| POST | `/sales/:id/packing/pick` | `pickPackLine` | `pickPackLine` |
| POST | `/sales/:id/packing/seal` | `sealPacket` | `sealPacket` |
| POST | `/sales/:id/handover` | `handToRider` | `handToRider` |
| POST | `/sales/settle` | `settleBills` | `PatientBillsScreen` |
| POST | `/kiosk/orders` | `placeKioskOrder` | `placeKioskOrder` |
| GET | `/sales/:id/invoice.pdf` | Browser invoice PDF | `lib/pdf.ts` |

## Prescriptions, offers, credit, and CRM

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| GET | `/prescriptions` | Prescription list | `PrescriptionsScreen` |
| POST | `/prescriptions/:id/approve` | `approveRx` | `approveRx` |
| POST | `/prescriptions/:id/reject` | `rejectRx`. Body includes the reason. | `rejectRx` |
| POST | `/prescriptions/:id/dispense` | `dispenseRx`. Returns the lines POS should load. | `dispenseRx` |
| GET, POST | `/offers` | Offer list and `addOffer` | `OffersScreen` |
| POST | `/offers/:id/toggle` | `toggleOffer` | `toggleOffer` |
| DELETE | `/offers/:id` | `removeOffer` | `removeOffer` |
| PUT | `/inventory/products/:id/direct-offer` | `setDirectOffer` | `OnlineStoreScreen` |
| GET | `/credit/ledger` | Derived khata balances | `KhataScreen`, `CustomersScreen` |
| POST | `/credit/payments` | `recordCreditPayment` | `recordCreditPayment` |
| GET | `/customers` | `aggregateCustomers` | `CustomersScreen` |
| GET | `/crm/patients` | `buildPatients` | `CrmScreen` |
| PATCH | `/crm/patients/:key` | `setPatientMeta` | `setPatientMeta` |
| POST | `/crm/campaigns` | `addCampaign`. Stores the campaign; it does not send WhatsApp or SMS. | `addCampaign` |
| POST | `/crm/feedback` | `addFeedback` | `addFeedback` |
| POST | `/crm/reminders` | `logReminder`. Stores the log; it does not send a message. | `logReminder` |
| POST | `/crm/redemptions` | `redeemPoints` | `redeemPoints` |

## Expenses, people, subscription, and reports

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| GET, POST | `/expenses` | Expense list and `addExpense` | `ExpensesScreen` |
| PATCH | `/expenses/:id` | `updateExpense` | `updateExpense` |
| DELETE | `/expenses/:id` | `removeExpense` | `removeExpense` |
| POST | `/expense-categories` | `addExpenseCategory` | `addExpenseCategory` |
| GET, POST | `/employees` | Employee list and `addEmployee` | `EmployeesScreen` |
| PATCH | `/employees/:id` | `updateEmployee` | `updateEmployee` |
| DELETE | `/employees/:id` | `removeEmployee` | `removeEmployee` |
| GET, POST | `/users` | Staff list and `addUser` | `UsersScreen` |
| PATCH | `/users/:id` | `updateUser`, including `toggleUser` through the active flag | `updateUser` |
| DELETE | `/users/:id` | `removeUser` | `removeUser` |
| GET, PATCH | `/subscription` | Read the plan. PATCH changes auto-renew only. A plan, cycle, renewal date, grant, or seat write returns 403. | `SubscriptionScreen` |
| POST | `/subscription/requests` | `requestPlan`. Appends a plan or renewal request. Duplicates stay as separate rows. | `SubscriptionScreen` |
| GET, PUT, DELETE | `/bank-account` | `saveBankAccount`, `removeBankAccount` | `AccountScreen` |
| POST | `/bank-account/verify` | `verifyBankAccount`. Remains a local verification result until a verification provider is chosen. | `verifyBankAccount` |
| GET, POST | `/advisors` | Advisor list and `addAdvisor` | `CAReportScreen` |
| PATCH | `/advisors/:id` | `updateAdvisor` | `updateAdvisor` |
| DELETE | `/advisors/:id` | `removeAdvisor` | `removeAdvisor` |
| POST | `/ca/shares` | `shareWithCA`. Stores the share request; it does not send email. | `shareWithCA` |
| GET | `/reports/catalog` | `REPORT_CATALOG` | `reportCatalog.ts` |
| GET | `/reports/:id?from=&to=` | `runReport` | `runReport` |
| GET | `/reports/:id/export.csv` | Browser CSV export | `reportExport.ts` |

## Hospital

Available only when the session business type is `hospital`.

| Method | Path | Replaces | Source |
|--------|------|----------|--------|
| GET, POST | `/hospital/wards` | Ward list and `addWard` | `WardsScreen` |
| PATCH | `/hospital/wards/:id` | `updateWard` | `updateWard` |
| DELETE | `/hospital/wards/:id` | `removeWard`, rejected while occupied | `removeWard` |
| GET, POST | `/hospital/admissions` | Admissions and `admitPatient` | `admitPatient` |
| PATCH | `/hospital/admissions/:id` | `updateAdmission` and `dischargePatient` | admission mutations |
| GET | `/hospital/indents` | Indent list | `IndentsScreen` |
| PATCH | `/hospital/indents/:id` | `setIndentStatus` | `setIndentStatus` |
| POST | `/hospital/indents/:id/issue` | `issueIndent` | `issueIndent` |
| GET, POST | `/hospital/departments` | Department list and `addDepartment` | `DepartmentsScreen` |
| PATCH | `/hospital/departments/:id` | `updateDepartment` | `updateDepartment` |
| DELETE | `/hospital/departments/:id` | `removeDepartment` | `removeDepartment` |
| GET, POST | `/hospital/doctors` | Doctor list and `addDoctor` | `DoctorsScreen` |
| PATCH | `/hospital/doctors/:id` | `updateDoctor` | `updateDoctor` |
| DELETE | `/hospital/doctors/:id` | `removeDoctor` | `removeDoctor` |
| GET, PATCH | `/hospital/account` | `updateHospitalAccount` | `HospitalBillingScreen` |
| POST | `/hospital/pricing/unlock` | `unlockPricing` | `unlockPricing` |
| PATCH | `/hospital/pricing/rules` | `setUniformDiscount`, `setHospitalPriceRule` | pricing mutations |
| POST | `/hospital/ward-supplies/issue` | `issueWardSupply` | `issueWardSupply` |
| POST | `/hospital/ward-supplies/return` | `returnWardSupply` | `returnWardSupply` |
| POST | `/hospital/payments` | `recordHospitalPayment` | `recordHospitalPayment` |
| GET | `/hospital/patient-bills` | `buildPatientLedger` | `PatientBillsScreen` |
| GET, PATCH | `/hospital/tpa-claims/:id` | `setClaimStatus` | No screen yet. Keep the seeded entity because context already mutates it. |

## Support and referrals

| Method | Path | Current behavior | Planned boundary |
|--------|------|------------------|------------------|
| GET, POST | `/support/tickets` | Tickets are stored on the pharmacy document. FAQ and channel text stay in the client. | FAQ and channel text stay in the client. |
| GET, POST | `/referrals` | Referral list and `addReferral` | Rows exist only after the user adds them. |
| PATCH | `/referrals/:id` | `updateReferral` | Status and reward |
| DELETE | `/referrals/:id` | `removeReferral` | A paid referral cannot be changed or removed by the pharmacy. |

## Master

A master session uses the `namma_master` cookie. It is separate from `namma_session`. Every master route checks the phone allowlist again. No session returns 401. A pharmacy session returns 403. Master responses omit sales, stock, and customers.

| Method | Path | What it does |
|--------|------|----------------|
| POST | `/auth/otp/verify` with `portal: "master"` | Starts a master session when the phone is allowlisted. It does not start a pharmacy session. |
| GET | `/master/session` | The master phone. |
| POST | `/master/sign-out` | Clears the master cookie only. |
| GET | `/master/pharmacies` | Search `q` and filters `plan`, `businessType`, `window` (`7`, `15`, `30`, `expired`). |
| GET | `/master/requests` | Plan and renewal requests, including duplicates and handled rows. |
| GET | `/master/work` | Open tickets and referrals across pharmacies. |
| GET | `/master/audit` | The latest 100 master audit rows. |
| POST | `/consultations` | Public. Saves a name, phone, area, and note from the website. No session. |
| GET | `/master/consultations` | The latest 200 consultation bookings. |
| PATCH | `/master/consultations/:id` | Sets the booking to `open` or `handled`. |
| POST | `/master/pharmacies/:id/impersonate` | Opens that pharmacy as its owner. The pharmacy session records the master phone. Sign-out ends it and writes an audit row. |
| GET | `/master/pharmacies/:id` | Plan, seats, business type, KYC, open tickets, referrals, grants, and requests. |
| PATCH | `/master/pharmacies/:id/plan` | Plan, cycle, and renewal date. Marks that pharmacy's open requests handled. |
| PUT | `/master/pharmacies/:id/grants` | Replaces screen grants. `until` is optional. |
| PATCH | `/master/pharmacies/:id/seats` | Extra seats. Included plus extra cannot exceed 50, except Pro, which stays unlimited and rejects an extra count above 50. |
| PATCH | `/master/pharmacies/:id/business-type` | `pharmacy` or `hospital`. Grants are kept. |
| PATCH | `/master/pharmacies/:id/tickets/:ticketId` | `Open` or `Resolved`. |
| POST | `/master/pharmacies/:id/referrals/:referralId/earn` | Sets the reward to ₹500. |
| POST | `/master/pharmacies/:id/referrals/:referralId/pay` | One payout, with the master phone and time. Refused before the reward is earned. A repeat does not write a second payout. |

Each write that changes something inserts one `master_audit` row in the same transaction: master phone, pharmacy, action, previous value, new value, time, and reason. The row cannot be updated or deleted.

## Not an endpoint

| Client state | Decision |
|--------------|----------|
| POS cart, discount, customer, payment, source, ward, insurer, UHID, and attached image | Submit only through checkout or kiosk order |
| Navigation, filters, toast, and `lastInvoice` | Stay in the browser |
| `buildSalesHistory()` | Unused. Do not expose it. |
| Report, invoice, stock, rack, and customer PDF/CSV formulas | Server exports call the existing `lib` functions |
