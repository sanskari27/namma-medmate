-- M3-S04: doctor references + immutable customer purchase/prescription history facts

CREATE TABLE doctor (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(64),
    phone VARCHAR(32),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_doctor_tenant_name
    ON doctor (tenant_id, lower(name))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_doctor_tenant_registration
    ON doctor (tenant_id, registration_number)
    WHERE deleted_at IS NULL AND registration_number IS NOT NULL;

CREATE TABLE customer_history_fact (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    branch_id UUID,
    type VARCHAR(32) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    prescription_reference VARCHAR(200),
    doctor_id UUID REFERENCES doctor(id),
    invoice_id UUID,
    amount_paise BIGINT,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_customer_history_fact_type
        CHECK (type IN ('PURCHASE', 'PRESCRIPTION'))
);

CREATE INDEX idx_customer_history_fact_customer
    ON customer_history_fact (tenant_id, customer_id, occurred_at DESC);

CREATE INDEX idx_customer_history_fact_doctor
    ON customer_history_fact (tenant_id, doctor_id)
    WHERE doctor_id IS NOT NULL;

CREATE UNIQUE INDEX uq_customer_history_fact_invoice_type
    ON customer_history_fact (tenant_id, invoice_id, type)
    WHERE invoice_id IS NOT NULL;
