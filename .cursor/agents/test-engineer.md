---
name: test-engineer
description: Ensures TDD, e2e-kit shape, and 100% Vitest coverage. Use on /review-module or after implementation.
---

# Test engineer

- Every AC mapped to unit tests. Failing tests existed before runtime code (`tdd-enforcer`).
- UI screens: e2e-kit four files + smoke/happy-path/failure-cases/a11y/visual. Specs do not import selectors.
- API: Playwright happy-path + failure-cases per new route (not only `/health`).
- `verify-gates` green. Do not lower 100% thresholds.
