-- M4-S04: FEFO / expiry threshold settings + per-branch product stock levels

ALTER TABLE location
    ADD COLUMN IF NOT EXISTS inventory_settings JSONB NOT NULL DEFAULT '{"expiryWarnDays":30}'::jsonb;

CREATE TABLE IF NOT EXISTS branch_product_stock_level (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenant (id),
    branch_id       UUID NOT NULL REFERENCES location (id),
    product_id      UUID NOT NULL REFERENCES product (id),
    reorder_level   INT,
    reorder_quantity INT,
    minimum_stock   INT,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_branch_product_stock_level UNIQUE (tenant_id, branch_id, product_id),
    CONSTRAINT chk_branch_product_stock_level_reorder_nonneg
        CHECK (reorder_level IS NULL OR reorder_level >= 0),
    CONSTRAINT chk_branch_product_stock_level_qty_nonneg
        CHECK (reorder_quantity IS NULL OR reorder_quantity >= 0),
    CONSTRAINT chk_branch_product_stock_level_min_nonneg
        CHECK (minimum_stock IS NULL OR minimum_stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_branch_product_stock_level_tenant_branch
    ON branch_product_stock_level (tenant_id, branch_id);
