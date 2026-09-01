# Spring TDD matrix

Write failing JUnit 5 tests before runtime code. Prefer existing test style in
`server/src/test/java`. Add ArchUnit cases only when package layers move.

## Required cases

| Kind | What to prove |
|---|---|
| Happy path | Story operation returns `ApiResponse` envelope and persisted facts |
| Validation | Invalid shape → 400; business rule → 422 |
| Authn / authz | Unauthenticated → 401; missing permission → 403 |
| Isolation | Cross-tenant (and cross-branch when data is branch-owned) is denied and undisclosed |
| Persistence | Repository/query includes `tenant_id` / `branch_id` on every path |
| Transaction | Failure rolls back; no partial write remains |
| Idempotency / concurrency | Retry or stale version does not double-apply; conflict → 409 when specified |
| Negative product | Deferred auth modes, lockouts, or Phase 2 flags stay absent |

## Placement

- HTTP + security: MockMvc (or existing slice test) against the feature controller.
- Application/domain branches: unit tests on the application service.
- Persistence + isolation: Spring integration tests with tenant/branch fixtures.
- Layers: existing `LayeredArchitectureTest` must still pass.

Name tests after the AC or rule they prove. A passing health check is not
evidence for a new endpoint.
