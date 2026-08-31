---
name: review-module
description: Orchestrate contract, boundaries, security, and test review into one PASS/FAIL report. Use before merge or /review-module.
---

# Review module

Delegate in order:

1. Agent `contract-guardian` + skill `api-contract-tester`
2. Agent `boundary-guardian`
3. Agent `security-reviewer` + `owasp-security` / `auth-patterns` / `security-review-medmate`
4. Agent `test-engineer` (TDD, e2e-kit, 100% coverage, `verify-gates`)
5. Skills `clean-code` + `code-reviewer` (BLOCK a shadcn copy in a module/app)

```
## Module review: NN-slug
Overall: PASS | FAIL

### Contract
…

### Boundaries
…

### Security
…

### Tests
…

### Required fixes before merge
- [ ] …
```

Done when no BLOCK findings remain.
