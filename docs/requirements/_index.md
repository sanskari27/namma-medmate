# Namma MedMate requirements index

The 12 epics mirror the 12 modules in `docs/product/product-compiled.md`.
Stories are vertical implementation contracts, not backend-only tasks.

| Epic | Product module | Stories | Delivery |
|---|---|---:|---|
| M1 | [Authentication & User Roles](01-authentication-user-roles/_index.md) | 10 | Phase 1 |
| M2 | [Organization, Tenant & Branch Structure](02-organization-tenant-branches/_index.md) | 7 | Phase 1 |
| M3 | [CRM — Customer & Patient Management](03-customer-patient-crm/_index.md) | 10 | Phase 1 |
| M4 | [ERP — Inventory & Stock Management](04-inventory-stock-management/_index.md) | 7 | Phase 1 |
| M5 | [ERP — Procurement & Vendor Management](05-procurement-vendor-management/_index.md) | 6 | Phase 1 |
| M6 | [ERP — Sales, POS & Billing](06-sales-pos-billing/_index.md) | 8 | Phase 1 |
| M7 | [Prescription & Regulatory Compliance](07-prescription-regulatory-compliance/_index.md) | 5 | Phase 1 + deferred |
| M8 | [Finance & Accounting](08-finance-accounting/_index.md) | 5 | Phase 1 |
| M9 | [Reporting, Analytics & Dashboards](09-reporting-analytics/_index.md) | 5 | Phase 1 |
| M10 | [Notifications & Communication](10-notifications-communication/_index.md) | 4 | Phase 1 |
| M11 | [Integrations](11-integrations/_index.md) | 3 | Phase 1 + deferred |
| M12 | [Deferred Non-Functional Requirements](12-deferred-non-functional/_index.md) | 1 | deferred |

## Product-source coverage map

Every compiled module capability below maps to one or more story IDs. Repeated
cross-module behavior is implemented by the owning story and referenced through
dependencies rather than duplicated.

### Module 1: Authentication & User Roles

- **Tenancy and hierarchy:** M1-S04, M1-S05, M1-S06
- **Staff onboarding:** M1-S03, M1-S04
- **Authentication and session security:** M1-S01, M1-S02, M1-S03, M1-S10
- **Permissions and approvals:** M1-S05, M1-S07
- **Audit and compliance:** M1-S07, M1-S08, M1-S09

### Module 2: Organization, Tenant & Branch Structure

- **Tenant registration and KYC:** M2-S01, M2-S02
- **Tenant lifecycle:** M2-S03
- **Branch master:** M2-S04
- **Plan limits and subscription administration:** M2-S05
- **Inter-branch transfer:** M2-S06
- **Kiosk scope:** M2-S07

### Module 3: CRM — Customer & Patient Management

- **Customer identity:** M3-S01, M3-S02
- **Family and history:** M3-S03, M3-S04, M3-S10
- **Safety warnings:** M3-S08
- **Credit and loyalty:** M3-S05, M3-S09, M3-S10
- **Segmentation and communication:** M3-S06, M3-S07
- **CA sharing:** M3-S07, M8-S05

### Module 4: ERP — Inventory & Stock Management

- **Product master:** M4-S01, M4-S02
- **Batch and expiry:** M4-S03, M4-S04
- **Stock levels and reorder:** M4-S03, M4-S04
- **Adjustments and stock take:** M4-S05, M4-S06
- **Controlled substances:** M4-S07

### Module 5: ERP — Procurement & Vendor Management

- **Supplier master:** M5-S01
- **Purchase orders:** M5-S02, M5-S03
- **Goods receipt and QC:** M5-S04, M5-S05
- **Returns and debit notes:** M5-S06
- **Supplier payables:** M5-S06

### Module 6: ERP — Sales, POS & Billing

- **Invoice lifecycle:** M6-S01, M6-S05
- **Pricing and GST:** M6-S02, M6-S06
- **Payment and credit:** M6-S03
- **Prescription sale:** M6-S04
- **Returns and refunds:** M6-S07
- **Invoice output:** M6-S08
- **Connectivity:** M6-S08

### Module 7: Prescription & Regulatory Compliance

- **License expiry:** M7-S01
- **Controlled registers:** M7-S02
- **Compliance dashboard:** M7-S03
- **Prescription reference archive:** M7-S04
- **Deferred regulatory workflows:** M7-S05

### Module 8: Finance & Accounting

- **Expenses:** M8-S01, M8-S02
- **AR/AP:** M8-S03
- **Financial reports:** M8-S04
- **GST preparation:** M8-S04
- **Authorization and scope:** M8-S05

### Module 9: Reporting, Analytics & Dashboards

- **Role dashboards:** M9-S01
- **Owner overview:** M9-S02
- **Comparison and analytics:** M9-S03
- **Custom reporting and export:** M9-S04
- **Plan gating:** M9-S05

### Module 10: Notifications & Communication

- **Notification center:** M10-S01
- **Internal trigger routing:** M10-S02
- **WhatsApp templates:** M10-S03
- **Customer and lifecycle messages:** M10-S04

### Module 11: Integrations

- **Cashfree subscription billing:** M11-S01
- **Resend transactional email:** M11-S02
- **Deferred integration boundaries:** M11-S03

### Module 12: Deferred Non-Functional Requirements

- **Hosting and residency:** M12-S01
- **Client platforms and POS hardware:** M12-S01
- **Scale and performance:** M12-S01
- **Backup and disaster recovery:** M12-S01
- **Retention and portability:** M12-S01
- **Localization and environments:** M12-S01

## Explicit exclusions

- B2B/HQ lead pipeline and support-ticket workflow have no product requirement.
- Customer and doctor portals, standalone prescription repository, advanced
  regulatory workflows, ecommerce, customer POS gateway, GST/GSP filing, and
  government integrations are Phase 2 or later.
- Module 12 is a deferred decision backlog, not implementation authorization.
