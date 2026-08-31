create table if not exists pharmacies (
  tenant_id uuid primary key,
  gst_dealer_type text not null check (gst_dealer_type = 'regular'),
  business_type text not null check (business_type = 'retail'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists locations (
  location_id uuid primary key,
  tenant_id uuid not null unique references pharmacies (tenant_id),
  display_name varchar(120) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
