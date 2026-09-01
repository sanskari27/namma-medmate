---
id: M9-S05
epic: M9
title: Plan-tier report access
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, authorized role]
depends_on: [M9-S04, M2-S05]
blocked_by: [D-005]
sources:
  - docs/product/product-compiled.md#module-9-reporting--analytics--dashboards
  - docs/product/m9-reports.md
---

# M9-S05 — Plan-tier report access

## User story

As **OWNER or authorized role**, I want to **expose reporting depth according to the resolved plan matrix** so that **give each role actionable dashboards, comparisons, exports, and plan-appropriate analytics.**

## Scope

### In

- Free includes Day Book, Sales Summary, and Purchase Summary.
- Starter, Growth, and Pro additions follow D-005.
- Denied reports show an upgrade explanation without leaking results.
- Downgrade preserves historical data but removes gated access.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M9-S05-AC01 — Free includes Day Book, Sales Summary, and Purchase Summary

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They expose reporting depth according to the resolved plan matrix | Free includes Day Book, Sales Summary, and Purchase Summary. |

### M9-S05-AC02 — Starter, Growth, and Pro additions follow D-005

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They expose reporting depth according to the resolved plan matrix | Starter, Growth, and Pro additions follow D-005. |

### M9-S05-AC03 — Denied reports show an upgrade explanation without leaking results

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They expose reporting depth according to the resolved plan matrix | Denied reports show an upgrade explanation without leaking results. |

### M9-S05-AC04 — Downgrade preserves historical data but removes gated access

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They expose reporting depth according to the resolved plan matrix | Downgrade preserves historical data but removes gated access. |

### M9-S05-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The expose reporting depth according to the resolved plan matrix operation is attempted | Forged UI access, expired plan, stale entitlement cache, or direct export request is denied. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Report authorization consults subscription entitlements on every query/export.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary labels gated reports and links OWNER to upgrade.
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
