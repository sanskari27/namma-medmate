# Review module

Usage: `/review-module 01-tenancy` (or current PR / changed files)

Structured pre-merge review.

## Order

1. **Contract** — agent `contract-guardian` + `api-contract-tester`
2. **Boundaries** — agent `boundary-guardian`
3. **Security** — agent `security-reviewer` + `owasp-security` / `auth-patterns`
4. **Tests** — agent `test-engineer` + `verify-gates`
5. **Structure** — `code-reviewer` + `clean-code`

Combine into the report template in skill `review-module`. Done when no BLOCK findings remain.
