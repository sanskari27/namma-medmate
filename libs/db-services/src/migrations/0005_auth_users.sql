create table if not exists users (
  user_id uuid primary key,
  tenant_id uuid not null references pharmacies (tenant_id),
  location_id uuid not null references locations (location_id),
  login_id varchar(64) not null unique,
  password_hash text,
  password_enabled boolean not null,
  otp_enabled boolean not null,
  otp_mobile varchar(20),
  pin_hash text,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  otp_resend_available_at timestamptz,
  role text not null check (role in ('owner', 'manager', 'pharmacist', 'cashier')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists otp_challenges (
  challenge_id uuid primary key,
  user_id uuid not null references users (user_id),
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  session_id uuid primary key,
  user_id uuid not null references users (user_id),
  tenant_id uuid not null references pharmacies (tenant_id),
  location_id uuid not null references locations (location_id),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists saved_devices (
  device_id uuid primary key,
  user_id uuid not null references users (user_id),
  tenant_id uuid not null references pharmacies (tenant_id),
  location_id uuid not null references locations (location_id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  user_agent varchar(256)
);

create table if not exists kiosk_pin_attempts (
  kiosk_session_id varchar(128) not null,
  user_id uuid not null references users (user_id),
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  primary key (kiosk_session_id, user_id)
);

create table if not exists pin_verifications (
  verification_id uuid primary key,
  user_id uuid not null references users (user_id),
  purpose text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
