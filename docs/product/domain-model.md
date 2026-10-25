# Domain model

Source of truth: `namma-pharmacy/src/app/data.ts`, `src/app/lib/*`, and the `PharmaProvider` state in `src/app/pharmaState.tsx`.

Money fields are JavaScript numbers in rupees. Dates on documents are strings or epoch milliseconds as shown. This is current MVP behavior.

## Persistence

Hydration loads the pharmacy document from Postgres through `/api/v1`.

Persisted: inventory, racks, sales, prescriptions, offers, purchases, profile, users, subscription, invoice settings, kiosk, advisors, CA shares, purchase orders, suppliers, supply list, expenses, expense categories, employees, credit payments, CRM, bank account, setup flag, signed-in flag, business type, ward indents, TPA claims, doctors, wards, admissions, hospital account, hospital price rules, ward supplies, hospital payments, and the document sequences listed below.

Memory only: POS cart and its customer, discount, payment, source, ward, insurer, patient, and prescription image; `lastInvoice`; `pricingUnlocked`; `billIndentTarget`; current route and back stack; inventory and report navigation targets; toast; hydration flag.

Sequences in the blob: `invSeq`, `grnSeq`, `prodSeq`, `poSeq`, `caSeq`, `userSeq`, `advSeq`, `supplierSeq`, `supplySeq`, `expSeq`, `empSeq`, `creditSeq`, `crmSeq`, `docSeq`, `wardSeq`, `admSeq`, `wsSeq`, `wrSeq`, `hpSeq`.

`wipeData()` clears inventory, sales, prescriptions, purchases, purchase orders, offers, CA shares, and the supply list. The dashboard does not call it during setup. Outside production, `POST /api/v1/demo/reset` replaces the document with the sample store. Production load replaces a document that still matches that sample with an empty store and keeps the owner phone.

## Catalogue

| Entity | Fields that drive behavior | Mutations |
|--------|----------------------------|-----------|
| `InvProduct` | Identity, composition, manufacturer, form, pack, category, HSN, GST percent, schedule (`OTC`, `H`, `H1`, `X`), racks, reorder level, online listing and price, offer, supplier, loose-sale flag and loose units, batches | `addProduct`, `updateProduct`, `toggleOnline`, `toggleLoose`, `setOnlinePrice`, `setProductOffer`, `setProductSupplier`, `setProductLocation` |
| `Batch` | Batch number, `YYYY-MM` expiry, quantity, MRP, PTR | `addBatch`, `setBatchQty`; also changed by sales, purchases, packing, cancellation, and ward movement |
| Rack registry | List of normalized location codes | `createRack`, `removeRack`, `bulkAssignLocation` |
| `Supplier` | Name, GSTIN, phone, contact, address, drug licence, payment terms, outstanding, active | `addSupplier`, `updateSupplier`, `removeSupplier` |
| `SupplyEntry` | Product, supplier, purchase price, preferred flag | `addSupply`, `updateSupply`, `removeSupply`, `setPreferredSupply`. Removing a supplier removes its supply rows. |
| `Purchase` | Supplier, invoice number and date, line items | `receivePurchase` adds a GRN and increases matching or new product stock |
| `PurchaseOrder` | Supplier, items, note, received flag | `sendPurchaseOrder`, `markPOReceived` |

`findScan()` matches a product barcode or batch code for POS and packing. `earliestBatch()` selects the earliest expiry. Loose sale is available for tablets and capsules whose pack contains more than one unit when `looseAllowed` is not false.

Categories: `fever`, `cold`, `diabetes`, `heart`, `stomach`, `vitamins`, `skin`, `baby`, `devices`, `personal`, `ayush`, `firstaid`.

## Sales and prescriptions

| Entity | Fields that drive behavior | Mutations |
|--------|----------------------------|-----------|
| `Sale` | Invoice id, `online` or `offline`, order status, customer, items, flat discount, payment mode, prescription link, paid and reception flags, ward, source, insurer, UHID, fulfillment | `checkoutPos`, `placeKioskOrder`, `advanceOrder`, `cancelOrder`, `markPaid`, packing mutations, `settleBills` |
| `SaleItem` | Product, quantity, batch, loose flag, captured price and tax inputs used by `computeInvoice` | Created by checkout and kiosk |
| `Fulfillment` | Pack lines with scanned quantity, seal, and rider | `startPacking`, `scanPackLine`, `pickPackLine`, `sealPacket`, `handToRider` |
| `Prescription` | Patient, phone, doctor, channel, status, verified product ids, uploaded or digital kind, image or structured medicines, review timestamps and reason | `approveRx`, `rejectRx`, `dispenseRx`. Checkout can also create one from a POS prescription photo. |
| `Offer` | Percentage or flat value; scope all, category, or product; active flag | `addOffer`, `toggleOffer`, `removeOffer`, `setDirectOffer` |
| `CreditPayment` | Customer key, name, phone, amount, mode, note | `recordCreditPayment` |

Order statuses are `new`, `accepted`, `packed`, `out`, `delivered`, `completed`, and `cancelled`. Online progression uses `ONLINE_FLOW`: new, accepted, packed, out, delivered. Offline checkout completes immediately.

Payment modes: `cash`, `upi`, `card`, `cod`, `credit`, `insurance`. The first four count as settled. Credit remains due until a khata payment. Insurance records an insurer string.

Hospital sale sources: `opd`, `counter`, `ward`, `emergency`, `online`.

Stock side effects:

- Checkout and kiosk sale deduct the selected batch, or the earliest batch when none is selected.
- Cancelling an order restores quantity that packing had already picked.
- Packing scan and pick consume packed quantity.
- `receivePurchase` increases batch quantity and can create a product.
- Ward issue and return move stock through `issueWardSupply` and `returnWardSupply`.

## Customers and CRM

Customers and patients are derived, not stored as their own list.

- `aggregateCustomers()` in `lib/customerExport.ts` groups sales for the customer screen and CSV/PDF.
- `buildPatients()` in `lib/crm.ts` groups non-cancelled, named sales. It excludes `Walk-in` and `Kiosk (self-order)`. It calculates spend, points, tier, RFM, segments, churn, and refill.
- Points are `floor(spent / 100)`. Tiers: New, Silver from 12, Gold from 50, Platinum from 120.
- Segments: chronic, high-value, lapsed, new, credit, regular. Chronic categories are `diabetes` and `heart`.

Persisted `CrmData`: patient `meta`, `campaigns`, `feedbacks`, `reminders`, and `redemptions`.

| Mutation | Effect |
|----------|--------|
| `setPatientMeta` | Saves conditions, allergies, consent, note, age, gender, blood group, address, or date of birth |
| `addCampaign` | Stores a WhatsApp or SMS campaign and a local reach count. It does not send a message. |
| `addFeedback` | Stores rating, optional NPS, and comment |
| `logReminder` | Stores refill, adherence, follow-up, or win-back contact |
| `redeemPoints` | Stores a redemption. It does not change historical sales. |

Khata balance is derived from credit sales through `creditSalesOf()` minus `creditPayments`. There is no stored balance field.

## People, money, and settings

| Entity | Mutations | Demo limit |
|--------|-----------|------------|
| `PharmacyProfile` | `updateProfile`, `toggleStoreOpen` | Includes GSTIN, PAN, drug licence, FSSAI, TDS/TCS flags, logo, and signature data URLs |
| `InvoiceSettings` | `updateInvoiceSettings` | Controls prefix, template, terms, footer, and logo display |
| `KioskConfig` | `updateKiosk` | Local kiosk configuration |
| `Subscription` | `requestPlan`, `toggleAutoRenew` | The pharmacy submits a plan or renewal request. A master assigns the plan, cycle, and renewal date. The screen does not collect a payment. Plans: Free, Starter ₹699, Growth ₹1499, Pro ₹2999 per month, with annual discounts of 0%, 5%, 15%, and 20%. SaaS GST rate is 18%. |
| `BankAccount` | `saveBankAccount`, `verifyBankAccount`, `removeBankAccount` | Verification flips a local flag. IFSC is checked with `isValidIfsc`. |
| `Advisor`, `CAShare` | Advisor CRUD, `shareWithCA` | Share appends a local record and shows a toast |
| `Expense`, categories | Expense CRUD, `addExpenseCategory` | No approval workflow |
| `Employee` | Employee CRUD | Documents are data URLs |
| `StaffUser` | `addUser`, `updateUser`, `toggleUser`, `removeUser` | Role and permission fields are stored only |

`businessType` is `pharmacy` or `hospital`, set by `signIn` and changeable by a master. `signOut` clears the pharmacy session and resets navigation. It does not clear a master session.

## Hospital

| Entity | Mutations | Notes |
|--------|-----------|-------|
| `Ward` | `addWard`, `updateWard`, `removeWard` | Removal is blocked while occupied |
| `Admission` | `admitPatient`, `updateAdmission`, `dischargePatient`, `startWardBilling` | Billing opens POS with the admission context |
| `WardIndent` | `setIndentStatus`, `openIndentBilling`, `issueIndent`, `clearBillIndentTarget` | `issueIndent` calls ward supply when it can issue directly |
| `Department` | `addDepartment`, `updateDepartment`, `removeDepartment` | Stored on the pharmacy. A new account starts with none. Renaming updates doctors that use that name. |
| `DoctorProfile` | `addDoctor`, `updateDoctor`, `removeDoctor` | Department is the department name string |
| `TpaClaim` | `setClaimStatus` | No screen |
| `HospitalAccount` | `updateHospitalAccount` | Credit terms: On demand, NET 15, NET 30, NET 45 |
| `PriceRule` | `setUniformDiscount`, `setHospitalPriceRule` | Requires `unlockPricing` for the current tab. Outside production, `123456` is accepted. |
| `WardSupply` | `issueWardSupply`, `returnWardSupply` | Issues reduce pharmacy stock; returns add it back |
| `HospitalPayment` | `recordHospitalPayment` | Reduces hospital outstanding |

`buildPatientLedger()` derives the active inpatient bill view. `hospitalOutstanding()` is supplies minus returns minus payments. `settleBills()` marks selected sales paid.

## Calculations kept for the API

These functions are current behavior and should be reused by route handlers rather than rewritten:

- `computeInvoice`, `sellPrice`, `stockOf`, `findScan`, `isLowStock`, `isExpiringSoon`
- `runReport`
- `buildPatients`, `aggregateCustomers`
- `creditPriceOf`, `buildStatement`, `hospitalAging`, `wardOnHand`

`buildSalesHistory()` is unused and is not part of the contract.
