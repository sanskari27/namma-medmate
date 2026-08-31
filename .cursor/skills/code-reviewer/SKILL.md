---
name: code-reviewer
description: Pre-merge structural review of the current diff — correctness, tests, coverage, clean-code. Use with /code-review or /review-module.
---

# Code reviewer

Inspect the current diff. Output BLOCK/WARN.

- Correctness vs the requirement ACs
- `clean-code` list (N+1, missing await, pass-through layers)
- Tests present (TDD); coverage still 100%
- Boundaries, envelopes, tenant checks
- UI primitives live in `@namma-medmate/shared-ui` (BLOCK a copied shadcn tree in a module or app)

```
## Code review
Verdict: PASS | FAIL
- [BLOCK] …
- [WARN] …
```
