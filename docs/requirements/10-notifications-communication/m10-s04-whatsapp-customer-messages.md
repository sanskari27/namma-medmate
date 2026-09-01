---
id: M10-S04
epic: M10
title: WhatsApp customer messages
phase: 1
priority: P1
apps: [server, dispensary]
personas: [system, authorized campaign role]
depends_on: [M10-S03, M3-S05, M3-S06, M3-S07]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-10-notifications--communication
  - docs/product/m10-notifications.md
---

# M10-S04 — WhatsApp customer messages

## User story

As **system or authorized campaign role**, I want to **send refill, credit, and campaign messages with auditable outcomes** so that **deliver actionable internal notifications and compliant tenant-namespaced whatsapp communication.**

## Scope

### In

- WhatsApp is the only Phase 1 customer messaging channel; no SMS fallback.
- Refill due and customer credit due use approved templates.
- Credit due also notifies Accountant/OWNER internally.
- A `READY_FOR_DELIVERY` M3-S07 campaign sends only its frozen, deduplicated
  tenant audience through the selected approved template.
- Retries are idempotent and provider outcomes are retained.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M10-S04-AC01 — WhatsApp is the only Phase 1 customer messaging channel

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They send refill, credit, and campaign messages with auditable outcomes | WhatsApp is the only Phase 1 customer messaging channel; no SMS fallback. |

### M10-S04-AC02 — Refill due and customer credit due use approved templates

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They send refill, credit, and campaign messages with auditable outcomes | Refill due and customer credit due use approved templates. |

### M10-S04-AC03 — Credit due also notifies Accountant/OWNER internally

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They send refill, credit, and campaign messages with auditable outcomes | Credit due also notifies Accountant/OWNER internally. |

### M10-S04-AC04 — Campaign delivery

| Given | When | Then |
|---|---|---|
| An authorized campaign role submits a READY_FOR_DELIVERY M3-S07 campaign | Delivery starts | Only the frozen deduplicated tenant audience is queued with the selected approved template, and per-recipient outcomes are linked to the campaign |

### M10-S04-AC05 — Retries are idempotent and provider outcomes are retained

| Given | When | Then |
|---|---|---|
| A request or event initiated by system / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They send refill, credit, and campaign messages with auditable outcomes | Retries are idempotent and provider outcomes are retained. |

### M10-S04-AC06 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The send refill, credit, and campaign messages with auditable outcomes operation is attempted | Invalid phone, missing consent policy if later required, unapproved template, provider outage, or replay is explicit and safe. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Message jobs and delivery status use /api/v1/communications/whatsapp/messages.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary shows preview, queued/sent/failed outcome, and safe retry.
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
