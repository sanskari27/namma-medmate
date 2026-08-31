# API contract

See `modules/tenancy/api/contract/swagger.yaml`.

- HQ: `POST/GET /tenancy/pharmacies`, `GET /tenancy/pharmacies/{tenant_id}`, `POST .../locations` (409 in v1)
- Pharmacy: `GET/PATCH /tenancy/current?location_id=`
- Internal: `GET /tenancy/locations/{location_id}?tenant_id=`

Error catalogue: `VALIDATION_FAILED`, `LOCATION_ID_REQUIRED`, `PHARMACY_NOT_FOUND`, `LOCATION_NOT_FOUND`, `LOCATION_TENANT_MISMATCH`, `LOCATION_LIMIT_V1`, `FORBIDDEN_ROLE`, `HQ_ONLY`, `PHARMACY_SESSION_REQUIRED`.
