-- M3-S01: tenant-wide customer profiles with phone deduplication

CREATE TABLE customer (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(32),
    address VARCHAR(500),
    blood_group VARCHAR(16),
    allergies TEXT,
    chronic_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_customer_tenant_phone
    ON customer (tenant_id, phone)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_customer_tenant_name
    ON customer (tenant_id, lower(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_customer_tenant_phone
    ON customer (tenant_id, phone)
    WHERE deleted_at IS NULL;
