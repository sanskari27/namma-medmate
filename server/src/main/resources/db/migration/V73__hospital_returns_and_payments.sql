CREATE TABLE hospital_return (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    issue_id UUID NOT NULL REFERENCES hospital_issue(id),
    ward_id UUID NOT NULL REFERENCES hospital_ward(id),
    credit_paise BIGINT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(80) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_return_credit CHECK (credit_paise >= 0)
);

CREATE UNIQUE INDEX uq_hospital_return_tenant_idempotency
    ON hospital_return (tenant_id, idempotency_key);

CREATE INDEX idx_hospital_return_issue
    ON hospital_return (tenant_id, branch_id, issue_id);

CREATE TABLE hospital_return_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    return_id UUID NOT NULL REFERENCES hospital_return(id),
    issue_line_id UUID NOT NULL REFERENCES hospital_issue_line(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_id UUID REFERENCES stock_batch(id),
    quantity NUMERIC(19, 6) NOT NULL,
    credit_price_paise BIGINT NOT NULL,
    amount_paise BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_return_line_qty CHECK (quantity > 0)
);

CREATE INDEX idx_hospital_return_line_return
    ON hospital_return_line (return_id);

ALTER TABLE hospital_ledger_entry
    ADD COLUMN return_id UUID REFERENCES hospital_return(id),
    ADD COLUMN payment_mode VARCHAR(64),
    ADD COLUMN payment_reference VARCHAR(80),
    ADD COLUMN particulars VARCHAR(240);
