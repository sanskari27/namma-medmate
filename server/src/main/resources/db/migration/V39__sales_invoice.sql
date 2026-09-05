-- M6-S01: branch sales invoice drafts with FY sequential numbering

CREATE TABLE sales_invoice (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    invoice_number VARCHAR(48) NOT NULL,
    status VARCHAR(16) NOT NULL,
    staff_user_id UUID NOT NULL REFERENCES app_user(id),
    terminal_id UUID NOT NULL,
    customer_id UUID REFERENCES customer(id),
    doctor_id UUID REFERENCES doctor(id),
    prescription_reference VARCHAR(64),
    prescription_verified BOOLEAN NOT NULL,
    subtotal_paise BIGINT NOT NULL,
    discount_paise BIGINT NOT NULL,
    tax_paise BIGINT NOT NULL,
    total_paise BIGINT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_invoice_status CHECK (status IN ('DRAFT')),
    CONSTRAINT chk_sales_invoice_money_nonneg CHECK (
        subtotal_paise >= 0 AND discount_paise >= 0 AND tax_paise >= 0 AND total_paise >= 0
    )
);

CREATE UNIQUE INDEX uq_sales_invoice_tenant_branch_number
    ON sales_invoice (tenant_id, branch_id, invoice_number);

CREATE UNIQUE INDEX uq_sales_invoice_tenant_branch_idempotency
    ON sales_invoice (tenant_id, branch_id, idempotency_key);

CREATE INDEX idx_sales_invoice_tenant_branch_created
    ON sales_invoice (tenant_id, branch_id, created_at DESC);

CREATE TABLE sales_invoice_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    sales_invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    batch_id UUID REFERENCES stock_batch(id),
    batch_number VARCHAR(64),
    expires_on DATE,
    quantity NUMERIC(19, 6) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    base_quantity NUMERIC(19, 6) NOT NULL,
    mrp_paise BIGINT NOT NULL,
    selling_price_paise BIGINT NOT NULL,
    discount_paise BIGINT NOT NULL,
    hsn_code VARCHAR(16),
    gst_rate NUMERIC(5, 2),
    cgst_paise BIGINT NOT NULL,
    sgst_paise BIGINT NOT NULL,
    igst_paise BIGINT NOT NULL,
    line_taxable_paise BIGINT NOT NULL,
    line_tax_paise BIGINT NOT NULL,
    line_total_paise BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_invoice_line_qty_positive CHECK (quantity > 0 AND base_quantity > 0),
    CONSTRAINT chk_sales_invoice_line_money_nonneg CHECK (
        mrp_paise >= 0 AND selling_price_paise >= 0 AND discount_paise >= 0
        AND cgst_paise >= 0 AND sgst_paise >= 0 AND igst_paise >= 0
        AND line_taxable_paise >= 0 AND line_tax_paise >= 0 AND line_total_paise >= 0
    )
);

CREATE INDEX idx_sales_invoice_line_scope
    ON sales_invoice_line (tenant_id, branch_id, sales_invoice_id, sort_order);

CREATE TABLE sales_invoice_sequence (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    financial_year VARCHAR(8) NOT NULL,
    next_value INT NOT NULL,
    CONSTRAINT chk_sales_invoice_sequence_positive CHECK (next_value >= 1)
);

CREATE UNIQUE INDEX uq_sales_invoice_sequence_scope
    ON sales_invoice_sequence (tenant_id, branch_id, financial_year);
