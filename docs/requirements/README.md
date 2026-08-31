# Namma MedMate v1 — Requirement docs

Standalone specs for an implementing agent. Source of truth for product behaviour remains `docs/product/namma-medmate-platform-feature-catalogue.md`. These docs decompose that file so one module can be built without re-reading the catalogue.

## How to use

1. Read [`00-glossary.md`](./00-glossary.md) for locked entity names and v1 invariants.
2. Read [`00-decomposition-plan.md`](./00-decomposition-plan.md) for module order and dependencies.
3. Implement **one** numbered file. Use that file’s §3 and §7 for cross-module contracts. Do not re-own entities listed as owned elsewhere.
4. A module is done when its FRs and the source failure-catalogue rows that apply to it pass.

Stack: React (Pharmacy Partner Console + Platform Admin HQ) + TypeScript AWS Lambdas. Layout: `modules/{slug}/{ui,api,docs}`.

## Implementation order

Build in file-number order **except**: implement `29-books-gst.md` period-lock + `postJournal` / `isPeriodLocked` **before** posting from `28-stock-take.md` (stock-take depends on the lock API). POS (`21`) is the hub and should not start until its §3 dependencies exist at least as stubs that honour the listed contracts.

## Index

| File                                                             | Slug                      | Plan gate                      |
| ---------------------------------------------------------------- | ------------------------- | ------------------------------ |
| [01-tenancy.md](./01-tenancy.md)                                 | `tenancy`                 | —                              |
| [02-whatsapp.md](./02-whatsapp.md)                               | `whatsapp`                | always (channel)               |
| [03-audit.md](./03-audit.md)                                     | `audit`                   | —                              |
| [04-master-catalogue.md](./04-master-catalogue.md)               | `master-catalogue`        | HQ                             |
| [05-plan-gating.md](./05-plan-gating.md)                         | `plan-gating`             | —                              |
| [06-auth.md](./06-auth.md)                                       | `auth`                    | —                              |
| [07-manage-users.md](./07-manage-users.md)                       | `manage-users`            | Free (seat-capped)             |
| [08-employees.md](./08-employees.md)                             | `employees`               | Starter                        |
| [09-go-live-kyc.md](./09-go-live-kyc.md)                         | `go-live-kyc`             | always (gate)                  |
| [10-account-settings.md](./10-account-settings.md)               | `account-settings`        | always / Free invoice settings |
| [11-saas-billing.md](./11-saas-billing.md)                       | `saas-billing`            | always                         |
| [12-inventory.md](./12-inventory.md)                             | `inventory`               | Free                           |
| [13-purchases.md](./13-purchases.md)                             | `purchases`               | Free                           |
| [14-racks.md](./14-racks.md)                                     | `racks`                   | Growth                         |
| [15-distributors-reorder.md](./15-distributors-reorder.md)       | `distributors-reorder`    | Growth                         |
| [16-customers.md](./16-customers.md)                             | `customers`               | Starter                        |
| [17-khata.md](./17-khata.md)                                     | `khata`                   | Starter                        |
| [18-statutory-registers.md](./18-statutory-registers.md)         | `statutory-registers`     | Starter                        |
| [19-offers.md](./19-offers.md)                                   | `offers`                  | Growth                         |
| [20-crm.md](./20-crm.md)                                         | `crm`                     | Growth                         |
| [21-pos-billing.md](./21-pos-billing.md)                         | `pos-billing`             | Free (hub)                     |
| [22-orders.md](./22-orders.md)                                   | `orders`                  | Free (7-day)                   |
| [23-sales-ledger.md](./23-sales-ledger.md)                       | `sales-ledger`            | Growth                         |
| [24-returns.md](./24-returns.md)                                 | `returns`                 | Free                           |
| [25-purchase-returns.md](./25-purchase-returns.md)               | `purchase-returns`        | Free                           |
| [26-prescriptions.md](./26-prescriptions.md)                     | `prescriptions`           | Starter                        |
| [27-kiosk.md](./27-kiosk.md)                                     | `kiosk`                   | Pro                            |
| [28-stock-take.md](./28-stock-take.md)                           | `stock-take`              | Growth                         |
| [29-books-gst.md](./29-books-gst.md)                             | `books-gst`               | Growth                         |
| [30-expenses.md](./30-expenses.md)                               | `expenses`                | Growth                         |
| [31-reports.md](./31-reports.md)                                 | `reports`                 | Growth                         |
| [32-ca-sharing.md](./32-ca-sharing.md)                           | `ca-sharing`              | Growth                         |
| [33-dashboard.md](./33-dashboard.md)                             | `dashboard`               | always                         |
| [34-admin-tenants.md](./34-admin-tenants.md)                     | `admin-tenants`           | HQ                             |
| [35-admin-saas-crm.md](./35-admin-saas-crm.md)                   | `admin-saas-crm`          | HQ                             |
| [36-admin-rx-compliance.md](./36-admin-rx-compliance.md)         | `admin-rx-compliance`     | HQ                             |
| [37-admin-finance.md](./37-admin-finance.md)                     | `admin-finance`           | HQ                             |
| [38-admin-marketing.md](./38-admin-marketing.md)                 | `admin-marketing`         | HQ                             |
| [39-admin-analytics.md](./39-admin-analytics.md)                 | `admin-analytics`         | HQ                             |
| [40-admin-support.md](./40-admin-support.md)                     | `admin-support`           | HQ                             |
| [41-admin-automation.md](./41-admin-automation.md)               | `admin-automation`        | HQ                             |
| [42-admin-platform-settings.md](./42-admin-platform-settings.md) | `admin-platform-settings` | HQ                             |
