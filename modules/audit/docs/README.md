# Audit module

Append-only **AuditEvent** log. Other Lambdas ingest; `reports` and HQ settings query.

## Projects

- UI: `@namma-medmate/audit-ui`
- API: `@namma-medmate/audit-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Persistence is `@namma-medmate/db-services`.
