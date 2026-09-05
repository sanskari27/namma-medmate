-- M6-S07: sales return, restock to the originating batch, and customer credit note

ALTER TABLE stock_movement DROP CONSTRAINT chk_stock_movement_type;
ALTER TABLE stock_movement ADD CONSTRAINT chk_stock_movement_type
    CHECK (type IN (
        'STOCK_IN',
        'STOCK_OUT',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'PURCHASE_RETURN',
        'SALES_RETURN'
    ));

ALTER TABLE controlled_stock_register DROP CONSTRAINT chk_controlled_stock_type;
ALTER TABLE controlled_stock_register ADD CONSTRAINT chk_controlled_stock_type
    CHECK (movement_type IN (
        'STOCK_IN',
        'STOCK_OUT',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'PURCHASE_RETURN',
        'SALES_RETURN'
    ));

ALTER TABLE customer_credit_ledger_entry DROP CONSTRAINT chk_customer_credit_ledger_type;
ALTER TABLE customer_credit_ledger_entry ADD CONSTRAINT chk_customer_credit_ledger_type
    CHECK (type IN ('SALE_CHARGE', 'SETTLEMENT', 'LIMIT_SET', 'CREDIT_NOTE'));

-- A credit note is the opposite of a sale charge, so the khata balance may go
-- negative and hold store credit the customer has not spent yet.
ALTER TABLE customer_credit_account DROP CONSTRAINT chk_customer_credit_account_balance_nonneg;

CREATE TABLE sales_return (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    sales_invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
    customer_id UUID REFERENCES customer(id),
    reason VARCHAR(500) NOT NULL,
    decision VARCHAR(16) NOT NULL,
    refund_mode VARCHAR(16) NOT NULL,
    refund_total_paise BIGINT NOT NULL,
    cash_refund_paise BIGINT NOT NULL DEFAULT 0,
    credit_note_paise BIGINT NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_return_decision CHECK (decision IN ('APPROVED')),
    CONSTRAINT chk_sales_return_refund_mode CHECK (refund_mode IN ('CASH', 'CREDIT_NOTE')),
    CONSTRAINT chk_sales_return_amounts_nonneg CHECK (
        refund_total_paise >= 0 AND cash_refund_paise >= 0 AND credit_note_paise >= 0
    ),
    CONSTRAINT chk_sales_return_refund_split
        CHECK (cash_refund_paise + credit_note_paise = refund_total_paise)
);

CREATE UNIQUE INDEX uq_sales_return_tenant_branch_idempotency
    ON sales_return (tenant_id, branch_id, idempotency_key);

CREATE INDEX idx_sales_return_tenant_branch_created
    ON sales_return (tenant_id, branch_id, created_at DESC);

CREATE INDEX idx_sales_return_tenant_branch_invoice
    ON sales_return (tenant_id, branch_id, sales_invoice_id);

CREATE TABLE sales_return_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    sales_return_id UUID NOT NULL REFERENCES sales_return(id),
    sales_invoice_line_id UUID NOT NULL REFERENCES sales_invoice_line(id),
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    batch_id UUID REFERENCES stock_batch(id),
    quantity NUMERIC(19, 6) NOT NULL,
    line_total_paise BIGINT NOT NULL,
    refund_amount_paise BIGINT NOT NULL,
    stock_movement_id UUID REFERENCES stock_movement(id),
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_return_line_qty_positive CHECK (quantity > 0),
    CONSTRAINT chk_sales_return_line_amount_nonneg CHECK (refund_amount_paise >= 0)
);

CREATE INDEX idx_sales_return_line_return
    ON sales_return_line (tenant_id, branch_id, sales_return_id, sort_order);

CREATE INDEX idx_sales_return_line_invoice_line
    ON sales_return_line (tenant_id, branch_id, sales_invoice_line_id);
