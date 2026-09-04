-- M3-S06: per-customer refill schedules + tenant-defined tags

CREATE TABLE customer_refill_schedule (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    medicine_name VARCHAR(200) NOT NULL,
    interval_days INT NOT NULL,
    next_due_on DATE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_customer_refill_interval_positive CHECK (interval_days > 0)
);

CREATE UNIQUE INDEX uq_customer_refill_tenant_customer_medicine
    ON customer_refill_schedule (tenant_id, customer_id, lower(medicine_name));

CREATE INDEX idx_customer_refill_tenant_due
    ON customer_refill_schedule (tenant_id, next_due_on);

CREATE INDEX idx_customer_refill_customer
    ON customer_refill_schedule (tenant_id, customer_id, next_due_on);

CREATE TABLE customer_tag (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_customer_tag_tenant_name
    ON customer_tag (tenant_id, lower(name));

CREATE INDEX idx_customer_tag_tenant
    ON customer_tag (tenant_id, name);

CREATE TABLE customer_tag_assignment (
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    tag_id UUID NOT NULL REFERENCES customer_tag(id),
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, customer_id, tag_id)
);

CREATE INDEX idx_customer_tag_assignment_tag
    ON customer_tag_assignment (tenant_id, tag_id);

CREATE INDEX idx_customer_tag_assignment_customer
    ON customer_tag_assignment (tenant_id, customer_id);
