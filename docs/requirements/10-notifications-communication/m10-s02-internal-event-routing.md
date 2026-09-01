---
id: M10-S02
epic: M10
title: Internal event routing
phase: 1
priority: P1
apps: [server, dispensary, admin]
personas: [system, staff roles]
depends_on: [M10-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-10-notifications--communication
  - docs/product/m10-notifications.md
---

# M10-S02 — Internal event routing

## User story

As **system or staff roles**, I want to **route product events to the exact roles defined by Module 10** so that **deliver actionable internal notifications and compliant tenant-namespaced whatsapp communication.**

## Scope

### In

- Routes cover low stock, expiry, transfers, approvals, supplier dues, licenses, staff licenses, credit due, account creation, KYC, plan limits, and subscription expiry.
- Recipients are resolved at event time from active roles and branches.
- Delivery is idempotent per event and recipient.
- Source record and tenant/branch context are retained.

The required routing matrix is:

| Trigger | Recipients |
|---|---|
| Low stock / reorder | Branch Inventory role and OWNER |
| Item expiring soon | Branch Inventory role and Pharmacist |
| Pull transfer requested | Sending branch Inventory role and OWNER |
| Transfer awaiting receipt | Receiving branch Inventory role and OWNER |
| Approval requested | Configured approver role |
| Supplier payment due | Accountant and OWNER |
| Tenant or branch license expiry | OWNER and MASTER |
| Staff license expiry | OWNER and affected staff member |
| Customer credit due | Accountant and OWNER internally; customer through WhatsApp |
| New user account | New user through the configured credential-delivery channel |
| KYC approved or rejected | OWNER |
| Plan limit reached | OWNER |
| Subscription expiring | OWNER and MASTER |

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M10-S02-AC01 — Routes cover low stock, expiry, transfers, approvals, supplier dues, licenses, staff lic

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / staff roles with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They route product events to the exact roles defined by Module 10 | Routes cover low stock, expiry, transfers, approvals, supplier dues, licenses, staff licenses, credit due, account creation, KYC, plan limits, and subscription expiry. |

### M10-S02-AC02 — Recipients are resolved at event time from active roles and branches

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / staff roles with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They route product events to the exact roles defined by Module 10 | Recipients are resolved at event time from active roles and branches. |

### M10-S02-AC03 — Delivery is idempotent per event and recipient

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / staff roles with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They route product events to the exact roles defined by Module 10 | Delivery is idempotent per event and recipient. |

### M10-S02-AC04 — Source record and tenant/branch context are retained

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / staff roles with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They route product events to the exact roles defined by Module 10 | Source record and tenant/branch context are retained. |

### M10-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The route product events to the exact roles defined by Module 10 operation is attempted | Duplicate event, removed role, inactive user, deleted source, or retry cannot create misleading duplicates. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Domain events create notification records through an internal notification service; no controller bypasses source authorization.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Target apps show context-appropriate notification content and destination.
- Handle loading, empty, validation, denied, conflict, failure, and success states with labels, keyboard access, visible focus, and focus restoration.
- UI guards improve UX only; the server remains the authorization boundary.

## Data and state

- Use UUID identifiers, UTC persistence, IST display, and INR minor units where money applies.
- Add schema only through a new Flyway migration; never edit an existing migration.
- Preserve historical transaction snapshots when referenced master data later changes.

## Required tests

- Unit tests for each business branch and validator.
- Spring integration tests for persistence, authorization, transaction rollback, tenant isolation, and branch isolation where applicable.
- Component/integration tests in every targeted React app.
- End-to-end happy path and at least one failure path for the complete cross-app workflow.
- Regression tests for every bug found while implementing this story.

## Definition of done

- [ ] Every acceptance criterion has automated evidence.
- [ ] Every dependency is `done` and linked decisions are closed.
- [ ] Tests were observed failing before runtime implementation and now pass.
- [ ] Target-specific format, lint, test, build, and compose gates pass.
- [ ] The independent story verifier returns `PASS`.
- [ ] The implementation tracker contains evidence and is the only changed status source.
