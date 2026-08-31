# @namma-medmate/* catalog

Do not add a new lib for something already here. Package names match `libs/{name}` unless noted.

| Need | Package |
|------|---------|
| Typed SDK (only UI→API path) | `@namma-medmate/api-client` |
| JWKS RS256, bearer extraction | `@namma-medmate/auth-utils` |
| In-memory + Redis port | `@namma-medmate/cache` |
| HTTP/error codes, regexes | `@namma-medmate/constants` |
| AsyncLocalStorage + React provider | `@namma-medmate/context-propagation` |
| ISO date helpers | `@namma-medmate/date-time-utils` |
| PostgreSQL / Drizzle (only DB access) | `@namma-medmate/db-services` |
| Playwright primitives | `@namma-medmate/e2e-kit` |
| Hashing / KMS port | `@namma-medmate/encryption-utils` |
| Zod env + SSM helpers | `@namma-medmate/env-config` |
| AppError + React ErrorBoundary | `@namma-medmate/error-handling` |
| Cross-UI typed pub/sub | `@namma-medmate/event-bus` |
| OpenFeature / AppConfig port | `@namma-medmate/feature-flags` |
| Fetch wrapper (API modules; UI still uses api-client) | `@namma-medmate/http-client` |
| Message lookup | `@namma-medmate/i18n` |
| UUIDs | `@namma-medmate/id-generator` |
| Express factory + Lambda handler | `@namma-medmate/lambda-bootstrap` |
| Structured JSON logger | `@namma-medmate/logger` |
| OTel / CloudWatch ports | `@namma-medmate/monitoring` |
| SES/SMS/push ports | `@namma-medmate/notification-client` |
| Offset/next-page helpers | `@namma-medmate/pagination-utils` |
| SQS/SNS ports | `@namma-medmate/queue-client` |
| Token bucket | `@namma-medmate/rate-limiter` |
| Success/error/pagination builders | `@namma-medmate/response-envelope` |
| Generated OpenAPI + hand types | `@namma-medmate/shared-types` |
| Cross-cutting UI primitives | `@namma-medmate/shared-ui` |
| Tiny shared helpers | `@namma-medmate/shared-utils` |
| S3 port | `@namma-medmate/storage-client` |
| Test doubles, RTL wrappers | `@namma-medmate/testing-utils` |
| Shared Zod schemas | `@namma-medmate/validation-schemas` |

Module packages: `@namma-medmate/{slug}-ui`, `@namma-medmate/{slug}-api`. App: `@namma-medmate/dispensary-app-web`.
