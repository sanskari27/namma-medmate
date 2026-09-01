---
id: M10-S03
epic: M10
title: Meta WhatsApp templates
phase: 1
priority: P1
apps: [server, dispensary, admin]
personas: [OWNER, MASTER]
depends_on: [M10-S02, M1-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-10-notifications--communication
  - docs/product/m10-notifications.md
---

# M10-S03 — Meta WhatsApp templates

## User story

As **OWNER or MASTER**, I want to **manage tenant-namespaced variables within MASTER-owned approved WhatsApp templates** so that **deliver actionable internal notifications and compliant tenant-namespaced whatsapp communication.**

## Scope

### In

- One MASTER-owned WhatsApp Business number serves tenants.
- Template identity is tenant ID plus unique name.
- OWNER customizes variable content only within Meta-approved structure.
- Free-text structural rewrite is not offered.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M10-S03-AC01 — One MASTER-owned WhatsApp Business number serves tenants

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage tenant-namespaced variables within MASTER-owned approved WhatsApp templates | One MASTER-owned WhatsApp Business number serves tenants. |

### M10-S03-AC02 — Template identity is tenant ID plus unique name

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage tenant-namespaced variables within MASTER-owned approved WhatsApp templates | Template identity is tenant ID plus unique name. |

### M10-S03-AC03 — OWNER customizes variable content only within Meta-approved structure

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage tenant-namespaced variables within MASTER-owned approved WhatsApp templates | OWNER customizes variable content only within Meta-approved structure. |

### M10-S03-AC04 — Free-text structural rewrite is not offered

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / MASTER with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They manage tenant-namespaced variables within MASTER-owned approved WhatsApp templates | Free-text structural rewrite is not offered. |

### M10-S03-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant/branch scope, stale state, duplicate request, or invalid input | The manage tenant-namespaced variables within MASTER-owned approved WhatsApp templates operation is attempted | Unknown variable, unapproved template, namespace collision, secret exposure, or unauthorized tenant access fails. No unauthorized data is disclosed and no partial write remains |

## Implementation contract

### Server

- Template catalogue, tenant variables, preview, and provider status use /api/v1/communications/whatsapp/templates.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary, admin**.
- Dispensary edits tenant variables; admin monitors provider and approved structures.
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
