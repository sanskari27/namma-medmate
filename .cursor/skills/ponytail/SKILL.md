---
name: ponytail
description: Simplest working diff — YAGNI, reuse libs, no extra deps. Use before writing code, with /implement-module, or when a change is getting large.
---

# Ponytail

Lazy senior: efficient, not careless. Climb this ladder after you understand the problem.

1. Does this need to be built? (YAGNI)
2. Already in this repo? Skill `reuse-platform-libs`.
3. Standard library?
4. Already-installed dependency?
5. One line?
6. Minimum that works.

## Namma rungs

- Never add `axios`, `lodash`, `moment`, or a per-module HTTP/db wrapper.
- Never add `modules/*/api/db`.
- Never duplicate logger, envelope, pagination, or env loading.
- Bug fix = shared function once, not one patch per caller.

`ponytail:` comments only for deliberate ceilings (name the ceiling and upgrade path).

Not lazy about: tests, trust-boundary validation, security, a11y, tenant isolation, requirement ACs.
