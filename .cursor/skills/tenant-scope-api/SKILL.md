---
name: tenant-scope-api
description: Require tenant_id and location_id on pharmacy APIs; reject HQ vs pharmacy confusion. Use when implementing pharmacy-scoped endpoints.
---

# Tenant-scope API

- Every pharmacy-scoped read/write requires `tenant_id` + `location_id`.
- Query/body `location_id` must match the session or fail `403 LOCATION_TENANT_MISMATCH`.
- Omit `location_id` → `400 LOCATION_ID_REQUIRED`.
- HQ principals never receive pharmacy session context. HQ uses HQ-authorised routes only.
- Do not trust client-sent role or tenant alone.

See `docs/requirements/01-tenancy.md` §7 as the contract pattern.
