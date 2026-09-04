-- M4-S05: stock adjustments routed through inventory write-off approval

ALTER TABLE stock_movement DROP CONSTRAINT chk_stock_movement_type;
ALTER TABLE stock_movement ADD CONSTRAINT chk_stock_movement_type
    CHECK (type IN (
        'STOCK_IN',
        'STOCK_OUT',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT'
    ));

CREATE TABLE stock_adjustment (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    product_id UUID NOT NULL REFERENCES product(id),
    batch_id UUID REFERENCES stock_batch(id),
    reason VARCHAR(32) NOT NULL,
    quantity NUMERIC(19, 6) NOT NULL,
    direction VARCHAR(8) NOT NULL,
    status VARCHAR(16) NOT NULL,
    requester_user_id UUID NOT NULL REFERENCES app_user(id),
    approver_user_id UUID REFERENCES app_user(id),
    approval_request_id UUID NOT NULL REFERENCES approval_request(id),
    idempotency_key VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ,
    CONSTRAINT chk_stock_adjustment_reason CHECK (
        reason IN (
            'DAMAGE_BREAKAGE',
            'EXPIRY_WRITE_OFF',
            'THEFT_LOSS',
            'PHYSICAL_COUNT',
            'SAMPLE_FREE_GOODS'
        )
    ),
    CONSTRAINT chk_stock_adjustment_direction CHECK (direction IN ('IN', 'OUT')),
    CONSTRAINT chk_stock_adjustment_status CHECK (
        status IN ('PENDING', 'APPROVED', 'REJECTED')
    ),
    CONSTRAINT chk_stock_adjustment_qty_positive CHECK (quantity > 0)
);

CREATE UNIQUE INDEX uq_stock_adjustment_idempotency
    ON stock_adjustment (tenant_id, idempotency_key);

CREATE UNIQUE INDEX uq_stock_adjustment_approval_request
    ON stock_adjustment (approval_request_id);

CREATE INDEX idx_stock_adjustment_tenant_branch_status
    ON stock_adjustment (tenant_id, branch_id, status, created_at DESC);
