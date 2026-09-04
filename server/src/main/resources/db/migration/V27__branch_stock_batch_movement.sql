-- M4-S03: branch-scoped batch stock + immutable movements

CREATE TABLE stock_batch (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_number VARCHAR(64) NOT NULL,
    manufactured_on DATE,
    expires_on DATE,
    purchase_price_paise BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_stock_batch_price_nonneg CHECK (purchase_price_paise >= 0),
    CONSTRAINT chk_stock_batch_dates CHECK (
        manufactured_on IS NULL
        OR expires_on IS NULL
        OR manufactured_on <= expires_on
    )
);

CREATE UNIQUE INDEX uq_stock_batch_tenant_product_number
    ON stock_batch (tenant_id, product_id, batch_number);

CREATE INDEX idx_stock_batch_tenant_product
    ON stock_batch (tenant_id, product_id);

CREATE TABLE stock_balance (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_id UUID REFERENCES stock_batch(id),
    quantity NUMERIC(19, 6) NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_stock_balance_qty_nonneg CHECK (quantity >= 0)
);

CREATE UNIQUE INDEX uq_stock_balance_with_batch
    ON stock_balance (tenant_id, branch_id, product_id, batch_id)
    WHERE batch_id IS NOT NULL;

CREATE UNIQUE INDEX uq_stock_balance_without_batch
    ON stock_balance (tenant_id, branch_id, product_id)
    WHERE batch_id IS NULL;

CREATE INDEX idx_stock_balance_tenant_branch
    ON stock_balance (tenant_id, branch_id);

CREATE INDEX idx_stock_balance_tenant_branch_product
    ON stock_balance (tenant_id, branch_id, product_id);

CREATE TABLE stock_movement (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_id UUID REFERENCES stock_batch(id),
    balance_id UUID NOT NULL REFERENCES stock_balance(id),
    type VARCHAR(32) NOT NULL,
    quantity NUMERIC(19, 6) NOT NULL,
    balance_after NUMERIC(19, 6) NOT NULL,
    purchase_price_paise BIGINT,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by_user_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_stock_movement_type CHECK (type IN ('STOCK_IN', 'STOCK_OUT')),
    CONSTRAINT chk_stock_movement_qty_positive CHECK (quantity > 0),
    CONSTRAINT chk_stock_movement_balance_after_nonneg CHECK (balance_after >= 0)
);

CREATE UNIQUE INDEX uq_stock_movement_idempotency
    ON stock_movement (tenant_id, idempotency_key);

CREATE INDEX idx_stock_movement_tenant_branch_occurred
    ON stock_movement (tenant_id, branch_id, occurred_at DESC);

CREATE INDEX idx_stock_movement_tenant_product
    ON stock_movement (tenant_id, branch_id, product_id, occurred_at DESC);
