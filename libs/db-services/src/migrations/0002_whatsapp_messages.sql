create table if not exists whatsapp_messages (
  message_id uuid primary key,
  tenant_id uuid not null references pharmacies (tenant_id),
  location_id uuid not null references locations (location_id),
  template_key varchar(64) not null,
  to_e164 varchar(20) not null,
  purpose varchar(32) not null,
  status varchar(16) not null,
  bill_id varchar(64),
  campaign_id varchar(64),
  idempotency_key varchar(128) not null,
  mandatory boolean not null,
  acknowledged_at timestamptz,
  acknowledged_by_user_id varchar(128),
  retry_count integer not null,
  meta_message_id varchar(256),
  last_error_code varchar(64),
  params_redacted jsonb not null,
  lease_expires_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_attempt_at timestamptz
);

create unique index if not exists whatsapp_messages_bill_dedupe
  on whatsapp_messages (template_key, to_e164, bill_id)
  where bill_id is not null;

create unique index if not exists whatsapp_messages_idem_dedupe
  on whatsapp_messages (template_key, to_e164, idempotency_key);

create index if not exists whatsapp_messages_inbox
  on whatsapp_messages (tenant_id, location_id, created_at desc);
