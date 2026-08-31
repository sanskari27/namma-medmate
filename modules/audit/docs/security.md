# Security

- Ingest is service-token only. Browser sessions cannot POST arbitrary actions.
- Pharmacy query uses session `tenant_id` + matching `location_id`. Other tenants return `404`.
- Snapshots reject keys containing `password`, `pin`, `otp`, `gstn_password`, `irp_secret`, `waba_token`, or `cashfree_secret`.
- Logs never include before/after JSON.
- ponytail: app role INSERT+SELECT only; split DB `REVOKE UPDATE/DELETE` waits for a dedicated role.
