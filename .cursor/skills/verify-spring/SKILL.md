---
name: verify-spring
description: Review-only verification of a Namma MedMate server story slice against Spring layering, isolation, Flyway, API envelope, and Maven gates. Use when verifying a story whose apps list includes server.
---

# Verify Spring slice

Review only. Do not edit code or tracker status.

Skip this skill when `server` is not in the story `apps` list.

## Must hold

1. Every server-facing AC and in-scope rule has a cited automated test.
2. Controllers do not call repositories. Writes are transactional.
3. `ApiResponse<T>` and architecture status codes are used.
4. Pharmacy queries include `tenant_id`; branch-owned also `branch_id`.
5. Cross-tenant and (where applicable) cross-branch denial is tested.
6. Authorization, validation, rollback, idempotency, and concurrency match
   the story. Client claims are untrusted.
7. Schema change is a new Flyway migration; applied migrations are untouched.
8. Money is paise; timestamps are UTC. Secrets are not logged.
9. `cd server && ./mvnw spotless:check test` passed; output is in evidence.
10. Diff has no React work, other-app imports, or unlisted server behavior.

## Verdict input

Return `PASS` for this stack only when every item holds with file/test cites.
Otherwise `FAIL` with the AC/rule, the missing evidence, and the minimum fix.
Do not pass the story overall if this stack fails.
