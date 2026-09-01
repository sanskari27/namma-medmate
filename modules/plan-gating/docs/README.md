# Plan gating

Read-only gate for Pharmacy Partner Console plans, paywalls, seats, and default role maps.

## Projects

- UI: `@namma-medmate/plan-gating-ui`
- API: `@namma-medmate/plan-gating-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Catalogue and role defaults are code constants. `SaasSubscription` and HQ overrides are injected readers until `saas-billing` and `admin-saas-crm` exist.
