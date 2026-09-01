# Namma MedMate architecture

This document describes the repository that exists today. Agent rules and
skills must follow it instead of assuming Nx, Python, or a shared frontend
package system.

## Runtime topology

```text
admin/ ----------\
                  >--- HTTP /api/v1 ---> server/ ---> PostgreSQL 16
dispensary/ -----/                         |
                                            +----> Redis 7
                                            +----> Cashfree / Resend / Meta
```

- `server/`: Java 17, Spring Boot 3.4.x, Maven.
- `dispensary/`: React 19, TypeScript, Vite, Redux Toolkit.
- `admin/`: React 19, TypeScript, Vite, Redux Toolkit.
- UIs use `VITE_API_BASE_URL`; they never import Java or server internals.

## Backend boundaries

Root package: `com.nammamedmate.server`.

```text
feature/         REST controllers and web request/response boundary
    |
application/     use cases, transactions, DTOs
   / \
domain/  persistence/
    \     /
infrastructure/  security, configuration, external adapters
shared/          API envelope and shared exceptions
```

- Controllers call application services, never repositories.
- Application write methods own transaction boundaries.
- Repositories operate on JPA entities and must encode tenant/branch scope.
- Request and response DTOs are Java records.
- Controllers use `ApiResponse<T>` and `ApiException`.
- New schema uses the next immutable Flyway `V*.sql` migration.

## Tenant and branch isolation

Pharmacy data uses a shared database with row-level application scoping.

- Every pharmacy-owned row has `tenant_id`.
- Branch-owned operational data also has `branch_id`.
- IDs supplied by a client are never looked up without the authenticated tenant
  and applicable branch constraints.
- MASTER operations require explicit platform permissions and must not reuse
  tenant endpoints by bypassing scope checks.
- Exports, counts, search suggestions, errors, logs, and notifications are data
  access and follow the same isolation rules.

## API conventions

- Base path: `/api/v1`.
- JSON responses use the existing `ApiResponse<T>` envelope.
- Validate at the HTTP boundary and enforce invariants in application/domain
  code.
- Use stable HTTP semantics: 400 validation, 401 unauthenticated, 403 denied,
  404 inaccessible/missing resource, 409 state conflict, 422 valid request that
  violates a business rule.
- Persist currency as integer paise. Persist timestamps in UTC; display IST.
- Financial, stock, lifecycle, and webhook mutations must be idempotent or use
  optimistic concurrency where retries can duplicate work.

## Frontend boundaries

- Function components and hooks only.
- Redux Toolkit owns authenticated and server-derived state; local component
  state owns temporary presentation state.
- API calls go through `src/services/axios.ts` or a feature service built on
  that configured client.
- Reuse patterns across the two SPAs intentionally, but do not introduce a
  package workspace until the repository adopts one.
- Every screen provides keyboard operation, labels, visible focus, loading,
  empty, validation, error, and permission-denied states.

## Environments

- Local: `compose.yaml`; PostgreSQL `localhost:25432`, Redis
  `localhost:16379`.
- Production: `compose.prod.yaml` on EC2 with private RDS and ElastiCache.
- The Spring `local` profile must never target an `rds.amazonaws.com` host.
- Secrets come from environment variables and are never committed or logged.

## Quality gates

Run gates for every targeted app:

```sh
cd server && ./mvnw spotless:check test
cd dispensary && npm run lint && npm run build
cd admin && npm run lint && npm run build
make compose-config
```

Add and run React tests when a story changes frontend behavior. A missing test
runner is setup work for the first UI story, not permission to skip tests.
