-- M4-S07: immutable controlled-stock register fed by every movement of H/H1/X/NDPS stock

CREATE TABLE controlled_stock_register (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    stock_movement_id UUID NOT NULL REFERENCES stock_movement(id),
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    schedule_classification VARCHAR(16),
    batch_id UUID REFERENCES stock_batch(id),
    batch_number VARCHAR(64),
    expires_on DATE,
    quantity NUMERIC(19, 6) NOT NULL,
    balance_after NUMERIC(19, 6) NOT NULL,
    movement_type VARCHAR(32) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES app_user(id),
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_controlled_stock_qty CHECK (quantity > 0),
    CONSTRAINT chk_controlled_stock_type CHECK (
        movement_type IN (
            'STOCK_IN',
            'STOCK_OUT',
            'TRANSFER_OUT',
            'TRANSFER_IN',
            'ADJUSTMENT_IN',
            'ADJUSTMENT_OUT'
        )
    )
);

CREATE UNIQUE INDEX uq_controlled_stock_movement
    ON controlled_stock_register (tenant_id, stock_movement_id);

CREATE INDEX idx_controlled_stock_tenant_branch_occurred
    ON controlled_stock_register (tenant_id, branch_id, occurred_at DESC);

CREATE INDEX idx_controlled_stock_schedule
    ON controlled_stock_register (tenant_id, branch_id, schedule_classification);
