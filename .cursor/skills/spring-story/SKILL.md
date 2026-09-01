---
name: spring-story
description: Implement a Namma MedMate server story slice with Java 17 Spring Boot TDD, layering, tenant/branch isolation, Flyway, and Maven gates. Use when the story apps list includes server, or when changing server/** Java, tests, or migrations.
---

# Spring story slice

Use only when the selected story lists `server` in `apps`. Do not use this
skill to implement React screens.

Read [tdd.md](tdd.md) before writing tests.

## TDD

1. Map every server-facing AC and business rule to an explicit JUnit 5 case.
2. Write failing tests first. Observe the expected missing behavior.
3. Implement the smallest slice that makes those tests pass.
4. Do not add Phase 2 behavior, adjacent cleanup, or speculative layers.

## Shape

```text
feature (controller, record DTOs)
  → application (@Transactional writes)
    → persistence (tenant/branch-scoped queries)
    → domain
infrastructure → security, config, external adapters
```

- Root package: `com.nammamedmate.server`.
- Controllers never call repositories. Constructor injection only.
- HTTP DTOs are records. Responses use `ApiResponse<T>` and `ApiException`.
- Status codes: 400 shape, 401 unauthenticated, 403 denied, 404 missing or
  inaccessible, 409 stale/conflict, 422 valid request / business rule.

## Protect

- Every pharmacy-owned query includes `tenant_id`. Branch-owned queries also
  include `branch_id` — counts, exports, existence checks, jobs, notifications.
- Client-supplied role, tenant, branch, price, total, or entitlement is untrusted.
- Writes are transactional. Mutations that need it are idempotent and
  concurrency-safe. Failed writes leave no partial state.
- Schema changes: next immutable Flyway migration only. Never edit applied SQL.
- Money is integer paise. Timestamps persist UTC.
- Do not log secrets or personal/medical data.

## Gate

```sh
cd server && ./mvnw spotless:check test
```

Return server files, failing-then-passing test names, isolation evidence, and
this exact command output. Skip this skill entirely when `server` is not listed.
