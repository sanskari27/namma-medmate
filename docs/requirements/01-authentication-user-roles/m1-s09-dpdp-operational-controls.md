---
id: M1-S09
epic: M1
title: DPDP operational controls
phase: 1
priority: P0
apps: [server, dispensary, admin]
personas: [MASTER, OWNER, data principal]
depends_on: [M1-S07, M3-S01]
blocked_by: [D-013]
sources:
  - docs/product/product-compiled.md#module-1-authentication--user-roles
  - docs/product/m1-authentication.md
---

# M1-S09 — DPDP operational controls

## User story

As **MASTER or OWNER**, I want approved India DPDP operational controls so that
personal data is handled consistently rather than through implementation-time
legal assumptions.

## Scope

- D-013 defines data inventory/classification, purpose and minimization rules,
  notice/consent where applicable, access/export, correction, erasure,
  retention exceptions, grievance handling, breach response, and accountable roles.
- Requests are identity-verified, tenant-scoped, auditable, and time-bounded by
  the approved policy.
- Erasure never silently corrupts legally retained invoice, finance, stock,
  controlled-drug, or audit facts; D-013 defines anonymization or retention behavior.
- Logs, exports, notifications, support access, and provider payloads follow the
  same approved minimization rules.

## Acceptance criteria

### M1-S09-AC01 — Approved control matrix

| Given | When | Then |
|---|---|---|
| D-013 is closed | An implementation agent starts work | Every personal-data category has an approved purpose, access role, retention/erasure rule, export rule, and accountable owner |

### M1-S09-AC02 — Verified data-principal request

| Given | When | Then |
|---|---|---|
| A data principal makes an access, correction, export, or erasure request | The request is identity-verified and accepted | Only that principal’s in-scope tenant data is processed, with status, deadline, decision, and evidence retained |

### M1-S09-AC03 — Legal-record preservation

| Given | When | Then |
|---|---|---|
| Erasure conflicts with an approved legal retention obligation | The request is decided | Data is retained, minimized, or anonymized exactly as D-013 defines, and the reason is visible without altering immutable business facts |

### M1-S09-AC04 — Cross-channel minimization

| Given | When | Then |
|---|---|---|
| Personal data would enter a log, export, notification, impersonation session, or external provider payload | The operation runs | Only D-013-approved fields are included and secrets/credentials are always excluded |

### M1-S09-AC05 — Decision safety

| Given | When | Then |
|---|---|---|
| D-013 remains open | An agent selects this story | No consent, erasure, retention-exception, grievance, or breach policy is invented |

## Definition of done

- [ ] D-013 is closed and represented exactly.
- [ ] Access, correction, export, erasure, retention, audit, isolation, and
  minimization tests pass in every target app.
- [ ] Independent verification returns `PASS`.
