# Security

- Never trust client-sent `tenant_id` or role. Session JWT claims win; query/body `location_id` must match.
- HQ principals cannot call `/tenancy/current`. Pharmacy users cannot call HQ create/list.
- `LOCATION_TENANT_MISMATCH` does not leak the other shop’s `display_name`.
- Create is logged with `tenant_id` / `location_id` only (no secrets). Audit table writes wait for `03-audit`.
