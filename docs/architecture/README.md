# Namma MedMate architecture

This is the architecture contract for the repository that exists today. Build
files and source code win if this document becomes stale.

## Repository topology

```text
dispensary/ --\
               +-- HTTP /api/v1 --> server/ --> PostgreSQL 16
admin/ --------/                       |
                                       +--> Redis 7
                                       +--> external adapters
```

- `server/`: Java 17, Spring Boot 3.4.4, Maven.
- `dispensary/`: independent React 19 + TypeScript + Vite 6 npm app for pharmacy staff.
- `admin/`: independent React 19 + TypeScript + Vite 6 npm app for MASTER/platform staff.
- `infra/terraform/`: AWS production infrastructure.
- Each application uses only its committed build files and dependency manager;
  no shared package workspace or generated client workspace exists.

The SPAs communicate only through HTTP using `VITE_API_BASE_URL` and their own
`src/services/axios.ts`. They never import server source or each other.

## Backend boundaries

Root package: `com.nammamedmate.server`.

```text
feature --> application --> persistence
                    \-----> domain
infrastructure --> security, configuration, external adapters
shared ---------> API envelope, exceptions, common web behavior
```

The existing ArchUnit test enforces layer access. Controllers call application
services, never repositories. Application writes own transaction boundaries.
Repositories encode tenant and branch scope. HTTP DTOs are records and responses
use `ApiResponse<T>`. New schema always uses the next immutable Flyway migration.

## Security and isolation

- The shared database isolates pharmacy data by `tenant_id`; branch-owned data
  also uses `branch_id`.
- Every lookup, existence check, count, export, notification, search suggestion,
  background job, and error path follows the same scope.
- MASTER/platform endpoints require explicit platform authorization and never
  bypass tenant endpoints.
- Client-provided role, tenant, branch, price, total, or entitlement claims are
  untrusted.
- Secrets and personal/medical data are not logged.

Spring Security, BCrypt, JJWT dependencies, PostgreSQL, Redis, Flyway, and the
base tenancy migration exist. JWT issuance/filtering, tenant context, and product
features are still implementation work; agents must not describe scaffolding as
complete.

## API and data conventions

- Base path: `/api/v1`; JSON uses the existing `ApiResponse<T>` envelope.
- Validate transport shape at the controller and business invariants in the
  application/domain layers.
- Use 400 for invalid shape, 401 for unauthenticated, 403 for denied, 404 for
  missing/inaccessible, 409 for stale/conflicting state, and 422 for a valid
  request that violates a business rule.
- Persist currency as integer paise and timestamps in UTC; display IST.
- Webhooks and financial, stock, lifecycle, and notification mutations are
  idempotent and concurrency-safe.

## Frontend conventions

- React function components and hooks; strict TypeScript.
- Each SPA uses the same folder contract independently. Do not add a shared
  UI package. Placement: `.cursor/rules/react-folder-structure.mdc`.

```text
src/
  components/atoms|molecules|organisms|templates
  screens/<name>/          # isolated; router imports the screen entry only
  layouts/ store/ libs/ hooks/ services/ router/
```

- Import direction: `atoms → molecules → organisms → templates → screens`.
  Prefer named aliases `@atoms`, `@molecules`, `@organisms`, `@templates`
  (each layer has an `index.ts` barrel).
- Redux Toolkit owns authenticated/server-derived **shared** state in
  `src/store`. A payload two or more screens read stays there. Screen-only
  shared state lives in `screens/<name>/store/` and is registered on the same
  root store (nested react-redux Providers hide the outer store). Temporary
  presentation state stays local.
- Keep authorization, tenant, branch, and plan enforcement on the server.
- Every screen covers loading, empty, validation, denied, conflict, failure, and
  success states with semantic labels, keyboard access, visible focus, and focus
  restoration.
- Each SPA owns its Tailwind `@theme` tokens, restyled Radix primitives in
  `src/components/atoms`, Lucide icons, Motion micro-interactions, and Recharts
  helpers in `src/components/molecules`. Do not add a shared UI package, GSAP,
  Lenis, or extra chart kits. Visual identity lives in
  `.cursor/skills/react-story/dispensary.md` and `admin.md`.
- Templates (`src/components/templates`) are shared application/domain blocks
  (for example a customer details popup). Keep `templates/index.ts`; add the
  first real cross-screen domain component there, do not invent placeholders.

## Environments and gates

- Local: `compose.yaml`, PostgreSQL `localhost:25432`, Redis `localhost:16379`.
- Production: `compose.prod.yaml` on EC2 with private RDS and ElastiCache.
- The Spring `local` profile must never target RDS or ElastiCache.

Run every gate for each story target:

```sh
cd server && ./mvnw spotless:check test
cd dispensary && npm run lint && npm run test -- --run && npm run build
cd admin && npm run lint && npm run test -- --run && npm run build
make compose-config
```
