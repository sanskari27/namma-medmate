---
name: debug-quality-gate
description: Fix a red format, lint, typecheck, coverage, or Playwright gate with the smallest change. Use when verify-gates fails.
---

# Debug quality gate

1. Read the full error. Do not disable the rule or lower coverage.
2. Smallest fix (Ponytail). Re-run **from the failed step**, then the rest of `verify-gates`.
3. Coverage fail → add tests, do not widen `coverage.exclude`.
4. Boundary fail → fix imports, do not weaken ESLint tags.
5. Playwright fail → fix product or e2e-kit layers, not `test.skip` without reason.

Tracker stays `in_progress` until green.
