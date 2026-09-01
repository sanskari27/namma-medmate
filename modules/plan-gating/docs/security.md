# Security

- Never trust client-sent `tenant_id` or role. Session JWT claims win; query/body `location_id` must match.
- HQ principals cannot call `/plan-gating/entitlements`. They may read `/plans` and `/role-defaults`.
- `LOCATION_TENANT_MISMATCH` does not leak another shop’s identity.
- Billing read failure fail-closes paid modules (Free map) and fail-opens always-reachable + Free packaging so a chemist can still bill.
