-- M4-S06: owner-initiated physical count with snapshotted expected qty

CREATE TABLE stock_take (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    status VARCHAR(16) NOT NULL,
    started_by_user_id UUID NOT NULL REFERENCES app_user(id),
    posted_by_user_id UUID REFERENCES app_user(id),
    cancelled_by_user_id UUID REFERENCES app_user(id),
    idempotency_key VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    posted_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT chk_stock_take_status CHECK (status IN ('OPEN', 'POSTED', 'CANCELLED'))
);

CREATE UNIQUE INDEX uq_stock_take_idempotency
    ON stock_take (tenant_id, idempotency_key);

CREATE UNIQUE INDEX uq_stock_take_one_open
    ON stock_take (tenant_id, branch_id)
    WHERE status = 'OPEN';

CREATE INDEX idx_stock_take_tenant_branch_status
    ON stock_take (tenant_id, branch_id, status, created_at DESC);

CREATE TABLE stock_take_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    stock_take_id UUID NOT NULL REFERENCES stock_take(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_id UUID REFERENCES stock_batch(id),
    expected_quantity NUMERIC(19, 6) NOT NULL,
    counted_quantity NUMERIC(19, 6),
    counted_by_user_id UUID REFERENCES app_user(id),
    counted_at TIMESTAMPTZ,
    adjustment_id UUID REFERENCES stock_adjustment(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_stock_take_line_expected CHECK (expected_quantity >= 0),
    CONSTRAINT chk_stock_take_line_counted CHECK (
        counted_quantity IS NULL OR counted_quantity >= 0
    )
);

CREATE UNIQUE INDEX uq_stock_take_line_batched
    ON stock_take_line (stock_take_id, product_id, batch_id)
    WHERE batch_id IS NOT NULL;

CREATE UNIQUE INDEX uq_stock_take_line_unbatched
    ON stock_take_line (stock_take_id, product_id)
    WHERE batch_id IS NULL;

CREATE INDEX idx_stock_take_line_tenant_take
    ON stock_take_line (tenant_id, stock_take_id);
