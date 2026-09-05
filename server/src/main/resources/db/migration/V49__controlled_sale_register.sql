-- M7-S02: immutable controlled-substance sale register from completed sales and linked returns

CREATE TABLE controlled_sale_register (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    kind VARCHAR(16) NOT NULL,
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    schedule_classification VARCHAR(16),
    batch_id UUID REFERENCES stock_batch(id),
    batch_number VARCHAR(64) NOT NULL,
    quantity NUMERIC(19, 6) NOT NULL,
    prescription_reference VARCHAR(64) NOT NULL,
    patient_id UUID NOT NULL REFERENCES customer(id),
    patient_name VARCHAR(200) NOT NULL,
    pharmacist_user_id UUID NOT NULL REFERENCES app_user(id),
    pharmacist_name VARCHAR(200) NOT NULL,
    pharmacist_registration VARCHAR(64),
    occurred_at TIMESTAMPTZ NOT NULL,
    sales_invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
    sales_invoice_line_id UUID NOT NULL REFERENCES sales_invoice_line(id),
    sales_return_id UUID REFERENCES sales_return(id),
    sales_return_line_id UUID REFERENCES sales_return_line(id),
    source_register_id UUID REFERENCES controlled_sale_register(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_controlled_sale_kind CHECK (kind IN ('SALE', 'RETURN')),
    CONSTRAINT chk_controlled_sale_qty CHECK (quantity > 0),
    CONSTRAINT chk_controlled_sale_return_link CHECK (
        (kind = 'SALE'
            AND sales_return_id IS NULL
            AND sales_return_line_id IS NULL
            AND source_register_id IS NULL)
        OR (kind = 'RETURN'
            AND sales_return_id IS NOT NULL
            AND sales_return_line_id IS NOT NULL
            AND source_register_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_controlled_sale_invoice_line
    ON controlled_sale_register (tenant_id, sales_invoice_line_id)
    WHERE kind = 'SALE';

CREATE UNIQUE INDEX uq_controlled_sale_return_line
    ON controlled_sale_register (tenant_id, sales_return_line_id)
    WHERE kind = 'RETURN';

CREATE INDEX idx_controlled_sale_tenant_branch_occurred
    ON controlled_sale_register (tenant_id, branch_id, occurred_at DESC);

CREATE INDEX idx_controlled_sale_filters
    ON controlled_sale_register (
        tenant_id, branch_id, product_id, patient_id, pharmacist_user_id, schedule_classification
    );
