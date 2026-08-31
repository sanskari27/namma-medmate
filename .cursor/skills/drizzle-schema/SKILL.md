---
name: drizzle-schema
description: Add Drizzle tables only in libs/db-services. Use when a requirement §6 needs persistence. Never create modules/*/api/db.
---

# Drizzle schema

All Postgres: `libs/db-services/src/schema`, repositories, services.

- UUID PKs. Pharmacy rows: `tenant_id` + `location_id`.
- Module APIs import `@namma-medmate/db-services` only.
- Unit-test new queries in `libs/db-services/tests/unit/`.

No string-concat SQL. No `modules/*/api/db/`.
