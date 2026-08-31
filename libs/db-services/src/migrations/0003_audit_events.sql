-- ponytail: app role INSERT+SELECT only; split DB REVOKE UPDATE/DELETE waits for a dedicated role.
create table if not exists audit_events (
  audit_event_id uuid primary key,
  idempotency_key varchar(256),
  tenant_id uuid references pharmacies (tenant_id),
  location_id uuid references locations (location_id),
  actor_user_id varchar(128) not null,
  actor_role varchar(64) not null,
  actor_surface varchar(16) not null,
  action varchar(64) not null,
  target_type varchar(64) not null,
  target_id varchar(128) not null,
  money_or_stock boolean not null,
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null,
  client_occurred_at timestamptz,
  request_id varchar(128),
  created_at timestamptz not null
);

create unique index if not exists audit_events_idempotency
  on audit_events (idempotency_key)
  where idempotency_key is not null;

create index if not exists audit_events_tenant_location_occurred
  on audit_events (tenant_id, location_id, occurred_at desc);

create index if not exists audit_events_actor_occurred
  on audit_events (actor_user_id, occurred_at desc);
