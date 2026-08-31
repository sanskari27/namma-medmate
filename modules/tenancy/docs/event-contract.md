# Events

Domain events (structured logs until `audit` exists):

- `PharmacyCreated` — `{ tenant_id, location_id }`
- `LocationDisplayNameUpdated` — `{ tenant_id, location_id, actor_user_id }`

UI event-bus: `tenancy.context.changed`.
