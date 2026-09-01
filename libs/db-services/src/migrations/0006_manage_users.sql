create table if not exists manage_users_idempotency (
  tenant_id uuid not null,
  idempotency_key varchar(128) not null,
  body_hash text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, idempotency_key)
);

alter table users add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table users add column if not exists employee_id uuid;
alter table users add column if not exists temp_password_pending boolean not null default false;
alter table users add column if not exists temp_password_ciphertext text;
alter table users add column if not exists removed_at timestamptz;

alter table users drop constraint if exists users_login_id_key;
drop index if exists users_login_id_key;

create unique index if not exists users_live_login_uidx
  on users (lower(login_id))
  where removed_at is null;
