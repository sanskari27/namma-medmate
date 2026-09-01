alter table pharmacies
  add column if not exists kyc_status text not null default 'not_submitted',
  add column if not exists kyc_submitted_at timestamptz,
  add column if not exists kyc_decided_at timestamptz,
  add column if not exists kyc_reject_reason text,
  add column if not exists kyc_gstin varchar(15),
  add column if not exists kyc_pan varchar(10),
  add column if not exists kyc_drug_licence_no varchar(64),
  add column if not exists kyc_drug_licence_issue text,
  add column if not exists kyc_drug_licence_expiry text,
  add column if not exists kyc_fssai_no varchar(32),
  add column if not exists kyc_fssai_expiry text,
  add column if not exists kyc_pharmacist_name varchar(160),
  add column if not exists kyc_pharmacist_registration_no varchar(64),
  add column if not exists kyc_pharmacist_registration_expiry text,
  add column if not exists kyc_e_invoicing_enabled boolean not null default false,
  add column if not exists kyc_bank_account_holder varchar(160),
  add column if not exists kyc_bank_account_number_ciphertext text,
  add column if not exists kyc_bank_ifsc varchar(20),
  add column if not exists wizard_status text not null default 'not_started',
  add column if not exists wizard_completed_at timestamptz,
  add column if not exists wizard_progress jsonb not null default '{}'::jsonb,
  add column if not exists kyc_plan varchar(16);

create index if not exists pharmacies_kyc_status_idx on pharmacies (kyc_status);

create table if not exists go_live_kyc_idempotency (
  tenant_id uuid not null,
  location_id uuid not null,
  idempotency_key varchar(128) not null,
  body_hash text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, location_id, idempotency_key)
);
