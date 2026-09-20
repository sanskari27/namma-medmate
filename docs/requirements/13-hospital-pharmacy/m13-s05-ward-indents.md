---
id: M13-S05
epic: M13
title: Ward indents
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, Pharmacist, Inventory]
depends_on: [M13-S02, M4-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-13-hospital-pharmacy
  - docs/product/m13-hospital.md#g-ward-indents-requisitions
---

# M13-S05 — Ward indents

## User story

As **OWNER, Pharmacist, or Inventory**, I want to **record, approve, reject, and track ward medicine requisitions** so that **floor requests become issuable work without a HIS feed.**

## Scope

### In

- Indent header: IND number, ward, bed, patient or note, requested-by, requested-at.
- Lines: product + requested qty; issued qty after a later ward issue.
- Status PENDING → APPROVED or REJECTED; APPROVED → ISSUED only when M13-S06 posts an issue linked to the indent.
- Pending shows Approve/Reject; Approved shows Issue & bill to hospital (navigation/contract to M13-S06).
- Counts: pending, approved, issued today, total.

### Out

- Stock movement and hospital AR (M13-S06), HIS messaging.

## Acceptance criteria

### M13-S05-AC01 — An indent records ward, bed, requester, and medicine lines

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL | They create an indent | IND numbering is tenant+branch sequential; ward, optional bed/patient, requested-by, and product lines persist |

### M13-S05-AC02 — Pending indents can be approved or rejected

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL and a PENDING indent | They approve or reject | APPROVED is issuable; REJECTED cannot be issued; replay is idempotent |

### M13-S05-AC03 — Issued qty and hospital invoice ref appear only after a linked ward issue

| Given | When | Then |
|---|---|---|
| An APPROVED indent exists and M13-S06 has not posted | Staff view the indent | Status stays APPROVED, issued qty is 0, and no WS invoice is shown |

### M13-S05-AC04 — Dashboard counts pending, approved, issued today, and total

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / Pharmacist / Inventory with HOSPITAL | They open Ward Indents | Counts match branch-scoped statuses; another branch is empty/404 |

### M13-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The indent operation is attempted | Unknown product, foreign ward, approve of REJECTED, or cashier-without-HOSPITAL fails atomically |

## Implementation contract

### Server

- Indent resources use `/api/v1/hospital/indents`.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary Ward Indents board with status filters and Approve/Reject.
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
