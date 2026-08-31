# Namma MedMate — Shared Glossary & Conventions

**Status:** v1 — terminology lock for all requirement docs in this folder.  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md`  
**Stack:** React (Pharmacy Partner Console + Platform Admin HQ) + TypeScript AWS Lambdas.  
**Module layout:** `modules/{slug}/{ui,api,docs}`. UI talks to API only via `@namma-medmate/api-client`. APIs never import UI. Persistence only through `libs/db-services`.

Use these names exactly. Do not rename entities across requirement docs.

---

## Surfaces

| Surface | Who | Notes |
|---|---|---|
| **Pharmacy Partner Console** | Chemist staff | English UI. One shop. |
| **Platform Admin HQ** | Namma Super admin / Ops / Finance / Support / Compliance | Sell and run SaaS. |
| **Kiosk mode** | Kiosk shopper | Fullscreen OTC self-order on the same browser/tablet as POS. Not a separate app. |
| **CA share link** | CA | Time-bounded, report-scoped, no-login. Not a console login. |

All WhatsApp (alerts, campaigns, OTP) sends from **one Namma MedMate WABA**. The chemist does not connect their own WhatsApp number. Shop name appears in the template body.

## Personas (pharmacy)

- **Owner** — everything; role/access cannot be reduced; pays SaaS; KYC; GSTN credentials; period lock; go-live wizard.
- **Manager** — bills, stock, purchases, reports, CRM; not user-admin/settings unless granted.
- **Pharmacist** — POS, Rx queue, inventory, duty clock-in.
- **Cashier** — POS, khata collect.
- **Kiosk shopper** — OTC self-order; cannot reach the console.
- **CA** — no-login share link; files GSTN outside Namma.

## Tenancy

- One **Pharmacy** tenant = one **Location** (`location_id` on every query; UI is one shop).
- Branches are **not** a sold feature. Pro = unlimited **seats**, not branches.
- All stock, bills, customers, khata, registers, books, GSTN credentials belong to that tenant.
- Staff logins are tenant-scoped. A Namma admin is **not** a pharmacy user.

## Plans (pharmacy console)

| Plan | Monthly | Annual | Seats | Unlocks |
|---|---|---|---|---|
| **Free** | ₹0 | — | 2 | Billing/POS & GST invoices, Orders (today + last 7 days), Inventory, Purchases, Returns, Opening stock CSV, Invoice Settings, Manage Users (2 seats) |
| **Starter** | ₹699 + 18% GST | ~5% off | 2 | + Prescriptions, Customers, Credit/Khata, H1/X registers, pharmacist-on-duty, licence alerts, Employees |
| **Growth** | ₹1,499 + 18% GST | ~15% off | 5 | + Sales ledger, Reports, CRM, CA sharing, full books + GSTN prepare + IRN, stock take, Reorder, Distributors, Offers, Expenses, Rack map |
| **Pro** | ₹2,999 + 18% GST | ~20% off | Unlimited | + locked Self-Order Kiosk, unlimited seats |

Expired paid plan behaves like Free. Data is retained. Seats and modules come **only from the plan**. No attachable add-on SKUs in v1.

Always reachable on Free: Dashboard, Orders (7-day), Account, Subscription, Settings, Help & Support, Refer & Earn, Manage Users (seat-capped).

## Money (v1)

- Shop-floor GMV tender: **Cash** or **Credit (khata)** only. One tender per bill. No split. No UPI, no card, no Cashfree on the shop floor.
- **SaaS invoices** (chemist paying Namma): GST 18% SAC 9983, collected via **Cashfree**.
- MRP is GST-inclusive. Tax recomputed on discounted selling price.
- Regular GST dealers only. Chemist **prepares** GSTR; **CA files** on GSTN.

## Clinical / legal (not plan-based)

- SKU schedule tags: **OTC, H, H1, X**.
- Scheduled staff-POS sale requires **prescribing doctor (name + registration number)** and **registered pharmacist on duty**.
- Kiosk sells **OTC only**.
- Pharmacy H1/X printout is the **legal register**. HQ is a read-only **audit copy**.
- DPCO price ceiling on platform master. Banned SKUs un-mapped everywhere.

## Canonical entities

| Entity | Identity | Owner module slug |
|---|---|---|
| Pharmacy / Location | tenant + `location_id` | `tenancy` |
| User (login) | `user_id` | `auth`, `manage-users` |
| Employee (HR) | `employee_id` | `employees` |
| PlatformMasterSku | platform | `master-catalogue` |
| SKU | `sku_id` (mapped to platform master) | `inventory` |
| Batch | sku + batch no | `inventory` |
| Bill | invoice no + FY | `pos-billing` |
| HeldCart | `hold_id` | `pos-billing` |
| CreditNote | CN no + FY | `returns` |
| GRN | `grn_id` | `purchases` |
| StockTake | `take_id` | `stock-take` |
| PurchaseReturn / ExpiryReturn | debit note no | `purchase-returns` |
| Customer | phone unique per tenant when named | `customers` |
| LoyaltyLot | customer + earn bill | `crm` |
| KhataLedger | customer | `khata` |
| Doctor (shop list) | reg. no. | `statutory-registers` |
| DutyShift | pharmacist + start | `statutory-registers` |
| Journal / ChartOfAccount | `account_id` | `books-gst` |
| Gstr2bMatch | 2B row + GRN | `books-gst` |
| Payment | `payment_id` | `pos-billing` (GMV), `saas-billing` (SaaS) |
| SaasSubscription | pharmacy | `saas-billing` / `admin-saas-crm` |
| WhatsAppMessage | `message_id` | `whatsapp` |
| Offer | coupon code | `offers` |
| PurchaseOrder | PO id | `distributors-reorder` |
| Expense | expense id | `expenses` |
| CaShareLink | token | `ca-sharing` |
| AuditEvent | append-only | `audit` |
| Ticket | ticket id | `admin-support` |
| AutomationRule | rule id | `admin-automation` |

## Cross-cutting invariants

1. `qty` on Batch ≥ 0. No negative stock.
2. Bill lines reference a living Batch.
3. H1/X sale implies duty + doctor registration number.
4. Banned SKU cannot be billed.
5. List price cannot exceed DPCO ceiling.
6. One tender per posted Bill.
7. HeldCart never decrements stock.
8. Locked period has no in-period edits.
9. Walk-in cannot take khata.
10. Loyalty redeem ≤ 20% of payable.
11. v1 GMV tender ∈ `{cash, khata}`.
12. Charge, GRN post, repayment, IRN request, Cashfree webhook are **idempotent**.
13. Charge uses `client_charge_id`.
14. English ships; UI and WhatsApp templates are i18n-ready.

## Out of v1 (never implement)

Hospital/IPD, wholesale, diagnostics, insurance/TPA, Jan Aushadhi, extra branches as a product, attachable add-ons, shop-floor UPI/Card/Cashfree GMV, SMS fallback, offline queue, Tally XML, payroll run, customer debit notes, chemist-owned WhatsApp number.
