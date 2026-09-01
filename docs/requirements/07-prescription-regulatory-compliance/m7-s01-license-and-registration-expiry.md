---
id: M7-S01
epic: M7
title: License and registration expiry
phase: 1
priority: P1
apps: [server, dispensary, admin]
personas: [OWNER, MASTER, staff]
depends_on: [M2-S04, M1-S04]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-7-prescription--regulatory-compliance-phase-1-scope
  - docs/product/m7-prescriptions.md
---

# M7-S01 — License and registration expiry

## User story

As **OWNER or MASTER or staff**, I want to **track tenant, branch, and staff regulatory documents and alert before expiry** so that **track licenses and expose reliable phase 1 pharmacy registers and regulatory exports.**

## Scope

### In

- Tracked documents include drug license, GST, FSSAI, and Pharmacist registration.
- Tenant/branch expiry notifies OWNER and MASTER.
- Staff expiry notifies OWNER and the staff member.
- Renewal retains prior evidence and dates.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M7-S01-AC01 — Tracked documents include drug license, GST, FSSAI, and Pharmacist registration

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track tenant, branch, and staff regulatory documents and alert before expiry | Tracked documents include drug license, GST, FSSAI, and Pharmacist registration. |

### M7-S01-AC02 — Tenant/branch expiry notifies OWNER and MASTER

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track tenant, branch, and staff regulatory documents and alert before expiry | Tenant/branch expiry notifies OWNER and MASTER. |

### M7-S01-AC03 — Staff expiry notifies OWNER and the staff member

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track tenant, branch, and staff regulatory documents and alert before expiry | Staff expiry notifies OWNER and the staff member. |

### M7-S01-AC04 — Renewal retains prior evidence and dates

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER / staff with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They track tenant, branch, and staff regulatory documents and alert before expiry | Renewal retains prior evidence and dates. |

### M7-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The track tenant, branch, and staff regulatory documents and alert before expiry operation is attempted | Invalid date range, missing evidence, unauthorized renewal, or cross-tenant read fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Compliance document CRUD and due queries use /api/v1/compliance/licenses.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary manages tenant/staff documents; admin monitors platform-wide tenant expiries.
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
