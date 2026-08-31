# Tenancy module

Tenancy is the identity root for a neighbourhood retail chemist. It owns Pharmacy + one Location (`location_id` on every pharmacy query).

## Projects

- UI: `@namma-medmate/tenancy-ui`
- API: `@namma-medmate/tenancy-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Persistence is `@namma-medmate/db-services`.
