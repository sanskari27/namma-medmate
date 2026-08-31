# Event contract

Domain log (ids only, no snapshots):

- `AuditEventRecorded` — `{ audit_event_id, tenant_id, location_id, action, target_type, target_id, occurred_at }`

UI bus: none required. `reports` and `admin-platform-settings` mount the tables later.
