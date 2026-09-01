---
id: M9-S03
epic: M9
title: Period comparison and trend analytics
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER, authorized role]
depends_on: [M9-S01, M6-S05, M4-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-9-reporting--analytics--dashboards
  - docs/product/m9-reports.md
---

# M9-S03 — Period comparison and trend analytics

## User story

As **OWNER or authorized role**, I want to **compare periods and analyze sales, products, stock movement, and customer frequency** so that **give each role actionable dashboards, comparisons, exports, and plan-appropriate analytics.**

## Scope

### In

- Week-over-week and month-over-month comparisons use equivalent periods.
- Charts include sales trend, top sellers, slow/dead stock, and customer frequency.
- No predictive forecasting is introduced.
- Analytics obey branch assignment and plan access.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M9-S03-AC01 — Week-over-week and month-over-month comparisons use equivalent periods

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They compare periods and analyze sales, products, stock movement, and customer frequency | Week-over-week and month-over-month comparisons use equivalent periods. |

### M9-S03-AC02 — Charts include sales trend, top sellers, slow/dead stock, and customer frequency

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They compare periods and analyze sales, products, stock movement, and customer frequency | Charts include sales trend, top sellers, slow/dead stock, and customer frequency. |

### M9-S03-AC03 — No predictive forecasting is introduced

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They compare periods and analyze sales, products, stock movement, and customer frequency | No predictive forecasting is introduced. |

### M9-S03-AC04 — Analytics obey branch assignment and plan access

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They compare periods and analyze sales, products, stock movement, and customer frequency | Analytics obey branch assignment and plan access. |

### M9-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The compare periods and analyze sales, products, stock movement, and customer frequency operation is attempted | Non-equivalent ranges, excessive cardinality, denied plan, or cross-tenant request fails clearly. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Analytics queries use /api/v1/analytics with bounded ranges.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary charts have textual summaries, accessible labels, and empty states.
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
