-- M5-S06: purchase return / debit note and supplier payable ledger

ALTER TABLE stock_movement DROP CONSTRAINT chk_stock_movement_type;
ALTER TABLE stock_movement ADD CONSTRAINT chk_stock_movement_type
    CHECK (type IN (
        'STOCK_IN',
        'STOCK_OUT',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'PURCHASE_RETURN'
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
        'PURCHASE_RETURN'
    ));

CREATE TABLE purchase_return (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    goods_receipt_id UUID REFERENCES goods_receipt(id),
    origin VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    debit_note_number VARCHAR(48) NOT NULL,
    amount_paise BIGINT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_purchase_return_origin CHECK (origin IN ('QC', 'MANUAL')),
    CONSTRAINT chk_purchase_return_status CHECK (status IN ('CONFIRMED')),
    CONSTRAINT chk_purchase_return_amount_nonneg CHECK (amount_paise >= 0)
);

CREATE UNIQUE INDEX uq_purchase_return_tenant_branch_idempotency
    ON purchase_return (tenant_id, branch_id, idempotency_key);

CREATE UNIQUE INDEX uq_purchase_return_tenant_branch_debit_note
    ON purchase_return (tenant_id, branch_id, debit_note_number);

CREATE UNIQUE INDEX uq_purchase_return_qc_receipt
    ON purchase_return (tenant_id, branch_id, goods_receipt_id)
    WHERE origin = 'QC' AND goods_receipt_id IS NOT NULL;

CREATE INDEX idx_purchase_return_tenant_branch_created
    ON purchase_return (tenant_id, branch_id, created_at DESC);

CREATE TABLE purchase_return_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    purchase_return_id UUID NOT NULL REFERENCES purchase_return(id),
    goods_receipt_line_id UUID REFERENCES goods_receipt_line(id),
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    batch_id UUID REFERENCES stock_batch(id),
    quantity NUMERIC(19, 6) NOT NULL,
    unit_rate_paise BIGINT NOT NULL,
    amount_paise BIGINT NOT NULL,
    stock_movement_id UUID REFERENCES stock_movement(id),
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_purchase_return_line_qty_positive CHECK (quantity > 0),
    CONSTRAINT chk_purchase_return_line_amount_nonneg CHECK (amount_paise >= 0)
);

CREATE INDEX idx_purchase_return_line_return
    ON purchase_return_line (tenant_id, branch_id, purchase_return_id, sort_order);

CREATE INDEX idx_purchase_return_line_grn_line
    ON purchase_return_line (tenant_id, branch_id, goods_receipt_line_id);

CREATE TABLE supplier_payable_account (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    balance_paise BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_supplier_payable_tenant_branch_supplier
    ON supplier_payable_account (tenant_id, branch_id, supplier_id);

CREATE INDEX idx_supplier_payable_tenant_branch_balance
    ON supplier_payable_account (tenant_id, branch_id, balance_paise DESC)
    WHERE balance_paise > 0;

CREATE TABLE supplier_ledger_entry (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    account_id UUID NOT NULL REFERENCES supplier_payable_account(id),
    type VARCHAR(32) NOT NULL,
    amount_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    goods_receipt_id UUID REFERENCES goods_receipt(id),
    purchase_return_id UUID REFERENCES purchase_return(id),
    payment_mode VARCHAR(64),
    payment_reference VARCHAR(200),
    due_on DATE,
    idempotency_key VARCHAR(128),
    created_by_user_id UUID NOT NULL REFERENCES app_user(id),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_supplier_ledger_type CHECK (type IN ('INVOICE', 'DEBIT_NOTE', 'PAYMENT')),
    CONSTRAINT chk_supplier_ledger_amount_nonneg CHECK (amount_paise >= 0)
);

CREATE INDEX idx_supplier_ledger_supplier_occurred
    ON supplier_ledger_entry (tenant_id, branch_id, supplier_id, occurred_at DESC);

CREATE UNIQUE INDEX uq_supplier_ledger_idempotency
    ON supplier_ledger_entry (tenant_id, branch_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX uq_supplier_ledger_payment_reference
    ON supplier_ledger_entry (tenant_id, branch_id, payment_reference)
    WHERE type = 'PAYMENT' AND payment_reference IS NOT NULL;
