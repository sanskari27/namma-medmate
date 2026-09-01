# Master catalogue module

Platform-wide **PlatformMasterSku** list. HQ maintains medicines, DPCO ceilings, substitutes, and bans. Pharmacies read by id for mapping/POS.

## Projects

- UI: `@namma-medmate/master-catalogue-ui`
- API: `@namma-medmate/master-catalogue-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Persistence is `@namma-medmate/db-services`.
