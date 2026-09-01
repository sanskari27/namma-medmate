create table if not exists employees (
  employee_id uuid primary key,
  tenant_id uuid not null references pharmacies (tenant_id),
  location_id uuid not null references locations (location_id),
  employee_code varchar(32) not null,
  full_name varchar(160) not null,
  phone varchar(20) not null,
  email varchar(160),
  date_of_birth text,
  gender text,
  address text,
  photo_object_key text,
  position text not null,
  position_label varchar(80),
  status text not null,
  join_date text,
  user_id uuid,
  pan_ciphertext text,
  aadhaar_ciphertext text,
  pharmacist_registration_no varchar(64),
  pharmacist_registration_expiry text,
  bank_account_holder varchar(160),
  bank_account_number_ciphertext text,
  bank_ifsc varchar(20),
  bank_upi_id varchar(80),
  emergency_name varchar(160),
  emergency_phone varchar(20),
  emergency_relation varchar(80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employees_tenant_code_uidx
  on employees (tenant_id, employee_code);

create unique index if not exists employees_tenant_user_uidx
  on employees (tenant_id, user_id)
  where user_id is not null;

create table if not exists employee_documents (
  document_id uuid primary key,
  employee_id uuid not null references employees (employee_id),
  type text not null,
  object_key text not null,
  file_name varchar(255) not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists employees_idempotency (
  tenant_id uuid not null,
  idempotency_key varchar(128) not null,
  body_hash text not null,
  employee_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, idempotency_key)
);
