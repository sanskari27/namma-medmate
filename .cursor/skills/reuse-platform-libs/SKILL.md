---
name: reuse-platform-libs
description: Lookup which @namma-medmate/* package to import instead of writing a new helper. Use when adding HTTP, DB, logging, envelopes, events, e2e, or any shared concern.
---

# Reuse platform libs

If the job matches a lib, **import it**. Do not open a new `libs/` package unless the user asks.

See [reference.md](reference.md) for the full catalog.

## Fast path

| Need                             | Package                                               |
| -------------------------------- | ----------------------------------------------------- |
| HTTP from UI                     | `@namma-medmate/api-client` only                      |
| JWT / bearer                     | `@namma-medmate/auth-utils`                           |
| Postgres / Drizzle               | `@namma-medmate/db-services`                          |
| Lambda Express + `/health`       | `@namma-medmate/lambda-bootstrap`                     |
| `{ data }` / `{ error }`         | `@namma-medmate/response-envelope`                    |
| AppError + ErrorBoundary         | `@namma-medmate/error-handling`                       |
| Zod env / SSM                    | `@namma-medmate/env-config`                           |
| JSON logs                        | `@namma-medmate/logger`                               |
| Playwright kit                   | `@namma-medmate/e2e-kit`                              |
| Cross-UI events                  | `@namma-medmate/event-bus`                            |
| Buttons, inputs, dialogs, tokens | `@namma-medmate/shared-ui` (skill `shadcn-shared-ui`) |
