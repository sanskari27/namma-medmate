---
id: M10-S01
epic: M10
title: In-app notification center
phase: 1
priority: P1
apps: [server, dispensary, admin]
personas: [authenticated user]
depends_on: [M1-S01]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-10-notifications--communication
  - docs/product/m10-notifications.md
---

# M10-S01 — In-app notification center

## User story

As **authenticated user**, I want to **receive persistent internal notifications and navigate to their source record** so that **deliver actionable internal notifications and compliant tenant-namespaced whatsapp communication.**

## Scope

### In

- The bell lists read and unread items.
- Read state is per recipient and persistent.
- Click-through validates current authorization before opening a record.
- Phase 1 has no per-user mute or preference controls.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M10-S01-AC01 — The bell lists read and unread items

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They receive persistent internal notifications and navigate to their source record | The bell lists read and unread items. |

### M10-S01-AC02 — Read state is per recipient and persistent

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They receive persistent internal notifications and navigate to their source record | Read state is per recipient and persistent. |

### M10-S01-AC03 — Click-through validates current authorization before opening a record

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They receive persistent internal notifications and navigate to their source record | Click-through validates current authorization before opening a record. |

### M10-S01-AC04 — Phase 1 has no per-user mute or preference controls

| Given | When | Then |
|---|---|---|
| A request or event initiated by authenticated user with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They receive persistent internal notifications and navigate to their source record | Phase 1 has no per-user mute or preference controls. |

### M10-S01-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The receive persistent internal notifications and navigate to their source record operation is attempted | A user cannot read, mark, or infer another recipient’s notification. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Notification list, unread count, and read commands use /api/v1/notifications.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Both app shells provide accessible bell, list, mark-read, pagination, and denied/deleted targets.
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
