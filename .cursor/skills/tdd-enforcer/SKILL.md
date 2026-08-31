---
name: tdd-enforcer
description: Write failing Vitest and e2e specs from each AC before production code. Use during /implement-module. Forbids code-first then tests-later.
---

# TDD enforcer

For each acceptance criterion:

1. Write a failing unit test (and e2e spec skeleton for screens/routes).
2. Implement the minimum to pass.
3. Refactor under Ponytail. Keep 100% coverage.

Do not change runtime files with no matching failing test. Complements `tests-required.mdc`.
