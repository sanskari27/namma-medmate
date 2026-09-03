-- M3-S03: tenant-scoped customer family groups (at most one family per profile)

CREATE TABLE customer_family (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    label VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_customer_family_tenant
    ON customer_family (tenant_id);

CREATE TABLE customer_family_member (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    family_id UUID NOT NULL REFERENCES customer_family(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer(id),
    relationship VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_customer_family_member_tenant_customer UNIQUE (tenant_id, customer_id)
);

CREATE INDEX idx_customer_family_member_family
    ON customer_family_member (tenant_id, family_id);
