# Decomposition Plan

Source: `docs/product/namma-medmate-platform-feature-catalogue.md`  
Stack: React + TypeScript Lambdas  
Glossary: `docs/requirements/00-glossary.md`

Implement in the numbered order below. A later module may call contracts listed in an earlier module’s §7; it must not re-own that data.

## Modules

| #   | Slug                      | Module                                             | Depends on                                                                                                                                               |
| --- | ------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `tenancy`                 | Pharmacy tenant & location                         | —                                                                                                                                                        |
| 02  | `whatsapp`                | WhatsApp channel (WABA, templates, inbox)          | `tenancy`                                                                                                                                                |
| 03  | `audit`                   | Append-only audit trail                            | `tenancy`                                                                                                                                                |
| 04  | `master-catalogue`        | Platform medicine master, DPCO, ban, substitutes   | — (platform-scoped)                                                                                                                                      |
| 05  | `plan-gating`             | Plans, paywalls, seats, module permissions         | `tenancy`                                                                                                                                                |
| 06  | `auth`                    | Login, OTP, PIN, saved devices, sessions           | `tenancy`, `whatsapp`, `audit`                                                                                                                           |
| 07  | `manage-users`            | Staff logins, roles, permissions, seat cap         | `auth`, `plan-gating`, `whatsapp`                                                                                                                        |
| 08  | `employees`               | HR directory (not payroll)                         | `tenancy`, `plan-gating`                                                                                                                                 |
| 09  | `go-live-kyc`             | KYC gate + Owner go-live wizard                    | `tenancy`, `plan-gating`, `audit`                                                                                                                        |
| 10  | `account-settings`        | Account, pharmacy profile, invoice settings, help  | `tenancy`, `go-live-kyc`, `plan-gating`                                                                                                                  |
| 11  | `saas-billing`            | Subscription checkout, Cashfree, Refer & Earn      | `tenancy`, `plan-gating`, `whatsapp`                                                                                                                     |
| 12  | `inventory`               | SKUs, batches, FEFO, labels, opening stock CSV     | `tenancy`, `master-catalogue`, `plan-gating`                                                                                                             |
| 13  | `purchases`               | Goods inward / GRN                                 | `inventory`, `plan-gating`                                                                                                                               |
| 14  | `racks`                   | Rack map & locations                               | `inventory`, `plan-gating`                                                                                                                               |
| 15  | `distributors-reorder`    | Distributors, supply list, reorder, POs            | `purchases`, `inventory`, `plan-gating`                                                                                                                  |
| 16  | `customers`               | Named customers & 360                              | `tenancy`, `plan-gating`                                                                                                                                 |
| 17  | `khata`                   | Credit / receivables ledger                        | `customers`, `plan-gating`, `whatsapp`                                                                                                                   |
| 18  | `statutory-registers`     | H1/X legal register, duty, doctors, licence desk   | `employees`, `plan-gating`, `whatsapp`                                                                                                                   |
| 19  | `offers`                  | Coupons                                            | `plan-gating`                                                                                                                                            |
| 20  | `crm`                     | Patient CRM, loyalty lots, campaigns, feedback     | `customers`, `khata`, `offers`, `whatsapp`, `plan-gating`                                                                                                |
| 21  | `pos-billing`             | Staff POS cart → charge & invoice                  | `auth`, `inventory`, `customers`, `khata`, `statutory-registers`, `offers`, `crm`, `account-settings`, `go-live-kyc`, `plan-gating`, `audit`, `whatsapp` |
| 22  | `orders`                  | 7-day bill board + holds                           | `pos-billing`, `plan-gating`                                                                                                                             |
| 23  | `sales-ledger`            | Full sales ledger (Growth)                         | `pos-billing`, `plan-gating`                                                                                                                             |
| 24  | `returns`                 | Customer credit notes                              | `pos-billing`, `inventory`, `khata`, `crm`, `statutory-registers`                                                                                        |
| 25  | `purchase-returns`        | Purchase & expiry returns to distributor           | `purchases`, `inventory`, `distributors-reorder`                                                                                                         |
| 26  | `prescriptions`           | Staff-uploaded Rx queue                            | `customers`, `inventory`, `statutory-registers`, `pos-billing`, `whatsapp`, `plan-gating`                                                                |
| 27  | `kiosk`                   | OTC self-order kiosk (Pro)                         | `pos-billing`, `inventory`, `customers`, `auth`, `plan-gating`                                                                                           |
| 28  | `stock-take`              | Physical count & variance post                     | `inventory`, `books-gst` (period lock), `plan-gating`                                                                                                    |
| 29  | `books-gst`               | COA, journals, IRN, GSTR prepare, period/FY lock   | `pos-billing`, `purchases`, `returns`, `khata`, `crm`, `inventory`                                                                                       |
| 30  | `expenses`                | Shop expenses (not payroll)                        | `books-gst`, `plan-gating`                                                                                                                               |
| 31  | `reports`                 | Report catalogue + analytics                       | `books-gst`, `pos-billing`, `inventory`, `plan-gating`                                                                                                   |
| 32  | `ca-sharing`              | No-login CA pack                                   | `reports`, `books-gst`, `plan-gating`                                                                                                                    |
| 33  | `dashboard`               | Pharmacy home KPIs                                 | `pos-billing`, `inventory`, `prescriptions`, `khata`, `plan-gating`                                                                                      |
| 34  | `admin-tenants`           | HQ command center + pharmacy tenants               | `tenancy`, `go-live-kyc`, `saas-billing`                                                                                                                 |
| 35  | `admin-saas-crm`          | HQ CRM Software (SaaS you sell)                    | `saas-billing`, `plan-gating`, `admin-tenants`                                                                                                           |
| 36  | `admin-rx-compliance`     | HQ Rx audit copy, doctors, Schedule-X flags        | `statutory-registers`, `prescriptions`, `pos-billing`                                                                                                    |
| 37  | `admin-finance`           | Namma SaaS GST/ledger                              | `saas-billing`                                                                                                                                           |
| 38  | `admin-marketing`         | WhatsApp campaigns to chemist accounts             | `whatsapp`, `admin-tenants`                                                                                                                              |
| 39  | `admin-analytics`         | SaaS analytics & scheduled CSV                     | `admin-saas-crm`                                                                                                                                         |
| 40  | `admin-support`           | Tickets, agents, SLA, KB                           | `admin-tenants`                                                                                                                                          |
| 41  | `admin-automation`        | Rules, kill-switch, seed workflows                 | `admin-saas-crm`, `admin-support`, `admin-rx-compliance`, `whatsapp`                                                                                     |
| 42  | `admin-platform-settings` | HQ RBAC, feature flags, WABA, Cashfree keys, audit | `auth`, `whatsapp`, `audit`                                                                                                                              |

## Dependency notes

- **`pos-billing` is the hub.** One posted Bill must write stock, GST invoice, H1/X register (if scheduled), khata (if credit), and loyalty lots. Downstream books/reports read those postings; they do not re-compute GMV.
- **`books-gst` owns the journal.** POS/purchases/returns/expenses emit domain events; books posts the journal. Period lock is enforced at post time in both the source module and books.
- **`plan-gating` is a read-only gate** for every console route. It does not own feature data.
- **`whatsapp` is the only outbound channel.** Other modules request a send; they do not talk to Meta directly.
- **`audit` is append-only.** Money/stock/credential/admin actions emit an AuditEvent.
- **`kiosk` never posts a Bill.** It creates a HeldCart + pickup token; staff POS posts Cash against that token.
- **HQ vs pharmacy registers:** `statutory-registers` is the legal record. `admin-rx-compliance` is read-only audit/flag/verify.
- **Refer & Earn ₹500** lives in `saas-billing` (pharmacy UI) and `admin-saas-crm` (HQ programme). Same credit, not shop khata.
- **Patient referral ₹100 via khata** lives in `crm`, posting through `khata`.

## Explicitly not modules (folded in)

| Concern                           | Where it lives                                                     |
| --------------------------------- | ------------------------------------------------------------------ |
| i18n-ready English                | NFR on every UI module; no language-pack product in v1             |
| Thermal printer / barcode scanner | `pos-billing` + `account-settings` (invoice/label templates)       |
| Hardware kiosk OS lock            | Ops note in `kiosk`; not a product module                          |
| Shop-floor UPI/Card               | Out of v1; feature flag in `admin-platform-settings` stays **off** |
| TDS/TCS auto-withhold             | Profile flags in `account-settings`; stub reports in `reports`     |
