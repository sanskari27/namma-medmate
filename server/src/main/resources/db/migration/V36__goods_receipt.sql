-- M5-S04: goods receipt against issued purchase orders (pending QC, no stock-in)

CREATE TABLE goods_receipt (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_order(id),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    receipt_number VARCHAR(48) NOT NULL,
    receipt_reference VARCHAR(128) NOT NULL,
    status VARCHAR(16) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_goods_receipt_tenant_branch_reference
    ON goods_receipt (tenant_id, branch_id, receipt_reference);

CREATE UNIQUE INDEX uq_goods_receipt_tenant_branch_idempotency
    ON goods_receipt (tenant_id, branch_id, idempotency_key);

CREATE UNIQUE INDEX uq_goods_receipt_tenant_branch_number
    ON goods_receipt (tenant_id, branch_id, receipt_number);

CREATE INDEX idx_goods_receipt_tenant_branch_po
    ON goods_receipt (tenant_id, branch_id, purchase_order_id);

CREATE INDEX idx_goods_receipt_tenant_branch_created
    ON goods_receipt (tenant_id, branch_id, created_at DESC);

CREATE TABLE goods_receipt_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    goods_receipt_id UUID NOT NULL REFERENCES goods_receipt(id),
    purchase_order_line_id UUID NOT NULL REFERENCES purchase_order_line(id),
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    quantity NUMERIC(19, 6) NOT NULL,
    unit_rate_paise BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_goods_receipt_line_scope
    ON goods_receipt_line (tenant_id, branch_id, goods_receipt_id);

CREATE INDEX idx_goods_receipt_line_po_line
    ON goods_receipt_line (tenant_id, branch_id, purchase_order_line_id);
