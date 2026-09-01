# Namma MedMate — Feature Requirements Index

> Pharmacy ERP (`dispensary/`) + platform CRM (`admin/`) backed by `server/`.  
> Specs use `{DOMAIN}-R{nn}` rule IDs. Implementation docs: `*.implementation.md`.

## How to use

1. Pick a feature from the registry below.
2. Write or read spec using [_template.md](_template.md).
3. Run `/feature-verifier <feature>` or `/orchestrate-features`.
4. Gap reports: `reports/<feature>-gap-analysis.md`.

## Agent pipeline

`/orchestrate-features` — see [context-data/README.md](../../context-data/README.md)

Default scope: **server/** backend. UI (`dispensary/`, `admin/`) only when requested.

---

## Feature registry

Status: `⬜ not started` · `📝 draft` · `✅ approved`

### P0 — Foundation

| # | Feature | Folder | Priority | Status | App |
|---|---------|--------|----------|--------|-----|
| 01 | Tenancy | [tenancy/](tenancy/) | P0 | ⬜ | server |
| 02 | Auth | [auth/](auth/) | P0 | ⬜ | server |
| 03 | RBAC | [rbac/](rbac/) | P0 | ⬜ | server |

### P0 — Dispensary ERP

| # | Feature | Folder | Priority | Status | App |
|---|---------|--------|----------|--------|-----|
| 04 | Catalogue | [catalogue/](catalogue/) | P0 | ⬜ | server + dispensary |
| 05 | Inventory | [inventory/](inventory/) | P0 | ⬜ | server + dispensary |
| 06 | POS | [pos/](pos/) | P0 | ⬜ | server + dispensary |
| 07 | Invoices & GST | [invoices-gst/](invoices-gst/) | P0 | ⬜ | server + dispensary |
| 08 | Customers (Khata) | [customers-khata/](customers-khata/) | P0 | ⬜ | server + dispensary |
| 09 | Procurement | [procurement/](procurement/) | P0 | ⬜ | server + dispensary |
| 10 | Prescriptions | [prescriptions/](prescriptions/) | P0 | ⬜ | server + dispensary |

### P0 — Admin CRM / SaaS

| # | Feature | Folder | Priority | Status | App |
|---|---------|--------|----------|--------|-----|
| 11 | Pharmacy KYC | [pharmacy-kyc/](pharmacy-kyc/) | P0 | ⬜ | server + admin |
| 12 | SaaS subscriptions | [saas-subscriptions/](saas-subscriptions/) | P0 | ⬜ | server + admin |
| 13 | HQ leads | [hq-leads/](hq-leads/) | P0 | ⬜ | server + admin |

### P1

| # | Feature | Folder | Priority | Status |
|---|---------|--------|----------|--------|
| 14 | Stock take | [stock-take/](stock-take/) | P1 | ⬜ |
| 15 | Reports | [reports/](reports/) | P1 | ⬜ |
| 16 | Support | [support/](support/) | P1 | ⬜ |
| 17 | Notifications | [notifications/](notifications/) | P1 | ⬜ |

### P2 — Not in this repo

| Feature | Notes |
|---------|-------|
| Customer mobile app | Separate MED* repo |
| Rider / marketplace delivery | Separate MED* repo |

---

## Conventions

- API: `/api/v1`, `ApiResponse<T>`, JWT, tenant-scoped queries
- Currency: INR (paise in DB)
- Roles: `pharmacy_owner`, `pharmacy_staff`, `admin_super`
- Flyway only for schema; never edit existing `V*.sql`
