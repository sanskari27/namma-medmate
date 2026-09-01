---
id: M11-S02
epic: M11
title: Resend transactional email
phase: 1
priority: P1
apps: [server]
personas: [system]
depends_on: []
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-11-integrations
  - docs/product/m11-integrations.md
---

# M11-S02 — Resend transactional email

## User story

As the **system**, I want a **typed transactional-email adapter backed by
Resend** so that owning workflows can deliver email without coupling business
rules to the provider.

## Scope

### In

- The adapter accepts an allowlisted template key, validated recipient, typed
  variables, tenant-branding context where applicable, and idempotency key.
- Password-reset, invoice, and onboarding rules remain in their owning stories;
  this adapter only renders approved templates and delivers their requests.
- Provider results normalize queued, sent, transient failure, and permanent failure.
- Provider secrets and personal data are never logged.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M11-S02-AC01 — Typed provider boundary

| Given | When | Then |
|---|---|---|
| An owning application service submits an allowlisted template, recipient, typed variables, branding context, and idempotency key | The adapter validates the request | Invalid or unknown fields fail before any provider call; a valid request is rendered deterministically |

### M11-S02-AC02 — Resend delivery and normalized result

| Given | When | Then |
|---|---|---|
| A valid transactional-email request is rendered | The adapter calls Resend | Provider-specific responses become queued, sent, transient failure, or permanent failure without changing the owning business transaction |

### M11-S02-AC03 — Idempotent retry

| Given | When | Then |
|---|---|---|
| The same idempotency key is retried after timeout or transient failure | Delivery is requested again | At most one logical message is accepted and the owning service receives the existing or reconciled result |

### M11-S02-AC04 — Secret and personal-data safety

| Given | When | Then |
|---|---|---|
| Delivery succeeds or fails | Logs, metrics, and errors are emitted | Provider secrets, message body, reset tokens, and personal recipient data are absent or appropriately redacted |

### M11-S02-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| The request is invalid, cross-tenant, duplicated, or the provider fails | Delivery is attempted | The adapter returns a safe normalized result with no unauthorized disclosure or duplicate business mutation |

## Implementation contract

### Server

- An infrastructure email adapter is invoked by auth, onboarding, and invoice services; provider callbacks are isolated.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server**.
- No direct UI target; apps show queued/sent-safe status returned by owning workflow.
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
