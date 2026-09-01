---
id: M7-S04
epic: M7
title: Prescription-reference archive
phase: 1
priority: P1
apps: [server, dispensary]
personas: [Pharmacist, OWNER]
depends_on: [M6-S04]
blocked_by: [D-003]
sources:
  - docs/product/product-compiled.md#module-7-prescription--regulatory-compliance-phase-1-scope
  - docs/product/m7-prescriptions.md
---

# M7-S04 — Prescription-reference archive

## User story

As **Pharmacist or OWNER**, I want to **archive fulfilled or expired Phase 1 prescription references after the resolved period** so that **track licenses and expose reliable phase 1 pharmacy registers and regulatory exports.**

## Scope

### In

- Only sale-time references are covered; a standalone repository is Phase 2.
- Archival never deletes invoice or controlled-register facts.
- Validity and archive timing follow D-003.
- Authorized users can distinguish active and archived references.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M7-S04-AC01 — Only sale-time references are covered

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They archive fulfilled or expired Phase 1 prescription references after the resolved period | Only sale-time references are covered; a standalone repository is Phase 2. |

### M7-S04-AC02 — Archival never deletes invoice or controlled-register facts

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They archive fulfilled or expired Phase 1 prescription references after the resolved period | Archival never deletes invoice or controlled-register facts. |

### M7-S04-AC03 — Validity and archive timing follow D-003

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They archive fulfilled or expired Phase 1 prescription references after the resolved period | Validity and archive timing follow D-003. |

### M7-S04-AC04 — Authorized users can distinguish active and archived references

| Given | When | Then |
|---|---|---|
| A request or event initiated by Pharmacist / OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They archive fulfilled or expired Phase 1 prescription references after the resolved period | Authorized users can distinguish active and archived references. |

### M7-S04-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The archive fulfilled or expired Phase 1 prescription references after the resolved period operation is attempted | Premature archive, reactivation without authority, or cross-tenant processing is rejected. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Reference queries and archive processing use /api/v1/prescription-references.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary history shows lifecycle and source invoices.
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
