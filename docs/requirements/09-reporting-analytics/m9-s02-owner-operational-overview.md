---
id: M9-S02
epic: M9
title: Owner operational overview
phase: 1
priority: P1
apps: [server, dispensary]
personas: [OWNER]
depends_on: [M9-S01, M1-S07, M2-S06, M4-S04, M5-S05, M6-S05, M7-S01, M8-S03]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-9-reporting--analytics--dashboards
  - docs/product/m9-reports.md
---

# M9-S02 — Owner operational overview

## User story

As **OWNER**, I want to **monitor the confirmed owner dashboard indicators** so that **give each role actionable dashboards, comparisons, exports, and plan-appropriate analytics.**

## Scope

### In

- Widgets cover today sales by branch/total, low stock, expiry, approvals, AR/AP, top products, transfers, KYC/licenses, and open POs.
- Every value shares a visible as-of timestamp.
- OWNER can drill into branch-filtered source records.
- Partial source failure is shown per widget.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M9-S02-AC01 — Widgets cover today sales by branch/total, low stock, expiry, approvals, AR/AP, top prod

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They monitor the confirmed owner dashboard indicators | Widgets cover today sales by branch/total, low stock, expiry, approvals, AR/AP, top products, transfers, KYC/licenses, and open POs. |

### M9-S02-AC02 — Every value shares a visible as-of timestamp

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They monitor the confirmed owner dashboard indicators | Every value shares a visible as-of timestamp. |

### M9-S02-AC03 — OWNER can drill into branch-filtered source records

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They monitor the confirmed owner dashboard indicators | OWNER can drill into branch-filtered source records. |

### M9-S02-AC04 — Partial source failure is shown per widget

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They monitor the confirmed owner dashboard indicators | Partial source failure is shown per widget. |

### M9-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The monitor the confirmed owner dashboard indicators operation is attempted | Timeout or unavailable dependency cannot display stale data as current without labeling. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Owner dashboard aggregation uses /api/v1/dashboards/owner.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides accessible cards, trends, filters, and drill-down links.
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
