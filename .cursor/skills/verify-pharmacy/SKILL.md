---
name: verify-pharmacy
description: Review one implemented Namma Pharmacy backend slice against the MVP catalog, API catalog, tenant and stock constraints, and recorded gate output. Use for an independent PASS or FAIL of a B-slice. Do not repair code during review.
---

# Verify pharmacy slice

Review only. Do not edit code or roadmap status.

1. Read the slice, its dependencies, the three product/backend docs, and the implementation diff.
2. Fail when a documented screen behavior is missing, a new behavior was invented, pharmacy scope can be chosen by the client, money is a float at the boundary, or a stock write is not idempotent.
3. Cite the implementer's gate output. If it is missing, stale against the diff, or failed, return `FAIL`. Do not run the listed full gates again.
4. Return exactly `PASS` or `FAIL`. On `FAIL`, name the slice rule and the minimum correction.
