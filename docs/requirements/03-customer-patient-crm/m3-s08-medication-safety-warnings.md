---
id: M3-S08
epic: M3
title: Medication safety warnings
phase: 1
priority: P0
apps: [server, dispensary]
personas: [Pharmacist, Cashier]
depends_on: [M3-S01, M4-S01]
blocked_by: [D-011]
sources:
  - docs/product/product-compiled.md#module-3-crm--customerpatient-management
  - docs/product/m3-crm.md
---

# M3-S08 — Medication safety warnings

## User story

As **Pharmacist or Cashier**, I want **allergy and drug-interaction warnings
while billing** so that a qualified staff member can review risk before sale.

## Scope

- Match customer allergy data against the dispensed medicine.
- Evaluate drug interactions using the approved clinical source and rules from D-011.
- Show warnings before completion without silently deleting invoice lines.
- Define severity, unavailable-data behavior, override authority, reason, and audit evidence through D-011.

## Acceptance criteria

### M3-S08-AC01 — Allergy warning

| Given | When | Then |
|---|---|---|
| A linked customer has an allergy matching a draft medicine | Staff adds or completes that medicine | POS identifies the customer, medicine, matched allergen, severity if available, and required review before completion |

### M3-S08-AC02 — Drug-interaction warning

| Given | When | Then |
|---|---|---|
| Draft or relevant medication history matches an approved D-011 interaction rule | POS evaluates the invoice | The exact interaction and required action are shown from the approved source without inventing clinical advice |

### M3-S08-AC03 — Safe unavailable-data behavior

| Given | When | Then |
|---|---|---|
| The approved clinical dataset is unavailable, stale, or has no mapping | POS evaluates the invoice | Behavior follows D-011, is visible to staff, and never represents “not checked” as “safe” |

### M3-S08-AC04 — Authorization and isolation

| Given | When | Then |
|---|---|---|
| An unauthorized override, unlinked customer, or cross-tenant profile/product is supplied | Completion is attempted | The override or foreign reference is rejected without data disclosure or partial sale completion |

## Implementation contract

- Server-side safety evaluation is part of invoice validation; the client cannot
  assert that checks passed.
- POS displays warnings accessibly and records any permitted review/override.
- Tests cover mappings, severity, stale/unavailable sources, authorization,
  tenant isolation, and completion rollback.

## Definition of done

- [ ] D-011 is closed and represented exactly.
- [ ] Every criterion has automated evidence and target gates pass.
- [ ] Independent verification returns `PASS`.
