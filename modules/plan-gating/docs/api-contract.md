# API contract

See `modules/plan-gating/api/contract/swagger.yaml`.

- `GET /plan-gating/entitlements?location_id=` — pharmacy session
- `GET /plan-gating/plans` — pharmacy or HQ
- `GET /plan-gating/paywall?module_key=&location_id=` — pharmacy session
- `GET /plan-gating/role-defaults` — pharmacy or HQ
- `POST /plan-gating/evaluate` — pharmacy session; tenant from JWT, not the body

Error catalogue: `LOCATION_ID_REQUIRED`, `LOCATION_TENANT_MISMATCH`, `UNKNOWN_MODULE`, `PHARMACY_SESSION_REQUIRED`, `VALIDATION_FAILED`.
