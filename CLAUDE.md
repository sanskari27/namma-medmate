# Namma MedMate project brief

Namma MedMate is a multi-tenant Indian pharmacy ERP and platform SaaS.

- `server/`: Java 17, Spring Boot 3.4.4, Maven, PostgreSQL/Flyway, Redis.
- `dispensary/`: React 19 + TypeScript + Vite + Redux Toolkit for pharmacy staff.
- `admin/`: the same independent frontend stack for MASTER/platform staff.
- Local orchestration uses Docker Compose; production uses EC2, RDS,
  ElastiCache, and Terraform.

The applications use their own committed build files and dependency managers.
Follow [`docs/architecture/README.md`](docs/architecture/README.md).

## Product and implementation sources

- Product intent: [`docs/product/`](docs/product/).
- Module epics and vertical stories: [`docs/requirements/`](docs/requirements/).
- Only status source:
  [`docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`](docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md).
- Unresolved product choices:
  [`docs/requirements/DECISIONS.md`](docs/requirements/DECISIONS.md).

Implement one dependency-ready story across every app named in its frontmatter.
Write failing tests first. Never implement a blocked/deferred story, silently
answer an open decision, or mark `done` without independent verification.

## Invariants

- Backend flow is `feature → application → persistence + domain`.
- Controllers never call repositories; writes are transactional.
- Every pharmacy query includes `tenant_id`; branch-owned data also includes
  `branch_id`.
- APIs use `/api/v1` and `ApiResponse<T>`.
- Money is integer paise; persisted time is UTC and displayed in IST.
- Add a new immutable Flyway migration for schema changes.
- Frontends use their configured axios service; server authorization remains
  authoritative.

## Commands

```text
/implement-next-story
/implement-story M1-S01
/verify-story M1-S01
/requirements-status
```

Local stack: `make up` (API 8080, dispensary 5173, admin 5174). Never point the
local Spring profile at RDS. Local login accounts:
[`docs/local-accounts.md`](docs/local-accounts.md).
