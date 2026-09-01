---
id: M3-S07
epic: M3
title: Campaigns and CA sharing
phase: 1
priority: P0
apps: [server, dispensary]
personas: [OWNER, authorized campaign role]
depends_on: [M3-S06, M10-S03, M8-S05]
blocked_by: []
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S07 — Campaigns and CA sharing

## User story

As **OWNER or authorized campaign role**, I want to **prepare tag-based campaign audiences and access the finance-owned CA export** so that **CRM segmentation can feed approved communication and reporting workflows.**

## Scope

### In

- Campaign drafts target saved tenant segments and use approved WhatsApp templates.
- Campaign permission is explicitly assignable.
- Recipient preview is a point-in-time tenant-scoped snapshot.
- A campaign draft can become `READY_FOR_DELIVERY` but makes no provider call;
  delivery is owned by M10-S04 and CA PDF generation by M8-S05.

### Out

- Behavior explicitly deferred by the product source or a linked decision.
- Adjacent module behavior not named in this story.

## Acceptance criteria

### M3-S07-AC01 — Campaign drafts target saved tenant segments and approved templates

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They prepare a campaign draft | The audience resolves only matching tenant customers and the selected template is approved for that tenant namespace |

### M3-S07-AC02 — Campaign permission is explicitly assignable

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They create or preview a campaign | Campaign permission is explicitly assignable and enforced by the server |

### M3-S07-AC03 — Point-in-time recipient preview

| Given | When | Then |
|---|---|---|
| A request or event initiated by OWNER / authorized campaign role with the story-required role, completed dependencies, and valid platform or tenant/branch context as applicable | They preview a campaign | The preview records its segment criteria and shows the current deduplicated recipient count without sending |

### M3-S07-AC04 — No message delivery

| Given | When | Then |
|---|---|---|
| A valid audience and template preview is approved | The campaign becomes READY_FOR_DELIVERY | The audience snapshot is available to M10-S04 and this story makes no WhatsApp provider call |

### M3-S07-AC05 — Isolation and failure safety

| Given | When | Then |
|---|---|---|
| Missing permission, invalid tenant scope, empty audience, or invalid template variables | Draft or preview is attempted | The request fails without sending, exporting, disclosing recipients, or persisting a partial campaign |

## Implementation contract

### Server

- Campaign draft and preview use `/api/v1/campaigns`; no endpoint in this story sends a message.
- Follow `feature → application → persistence + domain`; controllers never access repositories.
- Pharmacy-owned queries require `tenant_id`; branch-owned queries also require `branch_id`.
- Validate authorization, idempotency, transaction boundaries, concurrency, and immutable audit facts at the server.

### Dispensary / Admin

- Target apps: **server, dispensary**.
- Dispensary provides segment/template selection, recipient preview, and
  readiness status; M8-S05 separately provides CA export access.
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
