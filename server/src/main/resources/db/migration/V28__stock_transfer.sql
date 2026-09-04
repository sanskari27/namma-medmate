-- M2-S06: inter-branch stock transfer (push/pull + receiving confirmation)

ALTER TABLE stock_movement DROP CONSTRAINT chk_stock_movement_type;
ALTER TABLE stock_movement ADD CONSTRAINT chk_stock_movement_type
    CHECK (type IN ('STOCK_IN', 'STOCK_OUT', 'TRANSFER_OUT', 'TRANSFER_IN'));

CREATE TABLE stock_transfer (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    from_branch_id UUID NOT NULL REFERENCES location(id),
    to_branch_id UUID NOT NULL REFERENCES location(id),
    direction VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by_user_id UUID NOT NULL,
    dispatched_by_user_id UUID,
    confirmed_by_user_id UUID,
    rejected_by_user_id UUID,
    cancelled_by_user_id UUID,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_stock_transfer_direction CHECK (direction IN ('PUSH', 'PULL')),
    CONSTRAINT chk_stock_transfer_status CHECK (
        status IN ('REQUESTED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED')
    ),
    CONSTRAINT chk_stock_transfer_distinct_branches CHECK (from_branch_id <> to_branch_id)
);

CREATE UNIQUE INDEX uq_stock_transfer_idempotency
    ON stock_transfer (tenant_id, idempotency_key);

CREATE INDEX idx_stock_transfer_tenant_from_status
    ON stock_transfer (tenant_id, from_branch_id, status, created_at DESC);

CREATE INDEX idx_stock_transfer_tenant_to_status
    ON stock_transfer (tenant_id, to_branch_id, status, created_at DESC);

CREATE TABLE stock_transfer_line (
    id UUID PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES stock_transfer(id),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_id UUID REFERENCES stock_batch(id),
    quantity NUMERIC(19, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_stock_transfer_line_qty_positive CHECK (quantity > 0)
);

CREATE INDEX idx_stock_transfer_line_transfer
    ON stock_transfer_line (transfer_id);
