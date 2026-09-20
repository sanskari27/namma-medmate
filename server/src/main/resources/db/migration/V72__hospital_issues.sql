-- M13-S06: ward issues, WS tax invoices, ward-held qty, hospital AR ledger

CREATE TABLE hospital_ws_invoice_sequence (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    financial_year VARCHAR(8) NOT NULL,
    next_value INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_hospital_ws_invoice_sequence_positive CHECK (next_value >= 1)
);

CREATE UNIQUE INDEX uq_hospital_ws_invoice_sequence_scope
    ON hospital_ws_invoice_sequence (tenant_id, branch_id, financial_year);

CREATE TABLE hospital_issue (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    invoice_number VARCHAR(64) NOT NULL,
    ward_id UUID NOT NULL REFERENCES hospital_ward(id),
    indent_id UUID REFERENCES hospital_indent(id),
    reason VARCHAR(32) NOT NULL,
    uhid VARCHAR(32),
    patient_name VARCHAR(200),
    pharmacy_name VARCHAR(200) NOT NULL,
    pharmacy_address VARCHAR(500),
    pharmacy_gstin VARCHAR(20),
    pharmacy_drug_license VARCHAR(64),
    hospital_name VARCHAR(200) NOT NULL,
    hospital_gstin VARCHAR(20),
    credit_terms VARCHAR(32) NOT NULL,
    mrp_value_paise BIGINT NOT NULL,
    billed_paise BIGINT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(80) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_issue_reason
        CHECK (reason IN ('FLOOR_STOCK', 'CONSUMPTION', 'PATIENT_REFILL')),
    CONSTRAINT chk_hospital_issue_money
        CHECK (mrp_value_paise >= 0 AND billed_paise >= 0)
);

CREATE UNIQUE INDEX uq_hospital_issue_tenant_invoice
    ON hospital_issue (tenant_id, invoice_number);

CREATE UNIQUE INDEX uq_hospital_issue_tenant_idempotency
    ON hospital_issue (tenant_id, idempotency_key);

CREATE INDEX idx_hospital_issue_branch_issued
    ON hospital_issue (tenant_id, branch_id, issued_at DESC);

CREATE TABLE hospital_issue_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    issue_id UUID NOT NULL REFERENCES hospital_issue(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    batch_id UUID REFERENCES stock_batch(id),
    batch_number VARCHAR(64),
    expiry_on DATE,
    hsn_code VARCHAR(16),
    gst_rate NUMERIC(5, 2),
    quantity NUMERIC(19, 6) NOT NULL,
    mrp_paise BIGINT NOT NULL,
    credit_price_paise BIGINT NOT NULL,
    discount_bps INT NOT NULL,
    amount_paise BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_issue_line_qty CHECK (quantity > 0),
    CONSTRAINT chk_hospital_issue_line_money
        CHECK (mrp_paise >= 0 AND credit_price_paise >= 0 AND amount_paise >= 0)
);

CREATE INDEX idx_hospital_issue_line_issue
    ON hospital_issue_line (issue_id);

CREATE TABLE hospital_ward_stock (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    ward_id UUID NOT NULL REFERENCES hospital_ward(id),
    product_id UUID NOT NULL REFERENCES product(id),
    quantity NUMERIC(19, 6) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_ward_stock_qty CHECK (quantity >= 0)
);

CREATE UNIQUE INDEX uq_hospital_ward_stock_scope
    ON hospital_ward_stock (tenant_id, branch_id, ward_id, product_id);

CREATE TABLE hospital_ledger_entry (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    account_id UUID NOT NULL REFERENCES hospital_credit_account(id),
    kind VARCHAR(16) NOT NULL,
    debit_paise BIGINT NOT NULL DEFAULT 0,
    credit_paise BIGINT NOT NULL DEFAULT 0,
    issue_id UUID REFERENCES hospital_issue(id),
    occurred_at TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_ledger_kind CHECK (kind IN ('ISSUE', 'RETURN', 'PAYMENT')),
    CONSTRAINT chk_hospital_ledger_money CHECK (debit_paise >= 0 AND credit_paise >= 0)
);

CREATE UNIQUE INDEX uq_hospital_ledger_tenant_idempotency
    ON hospital_ledger_entry (tenant_id, idempotency_key);

CREATE INDEX idx_hospital_ledger_account_occurred
    ON hospital_ledger_entry (tenant_id, account_id, occurred_at);
