-- M5-S02: branch purchase orders with immutable versions

CREATE TABLE purchase_order (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    supplier_id UUID NOT NULL REFERENCES supplier(id),
    po_number VARCHAR(48) NOT NULL,
    status VARCHAR(16) NOT NULL,
    expected_delivery_date DATE,
    payment_terms VARCHAR(16) NOT NULL,
    notes TEXT,
    version INT NOT NULL,
    subtotal_paise BIGINT NOT NULL,
    tax_paise BIGINT NOT NULL,
    total_paise BIGINT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_purchase_order_tenant_branch_number
    ON purchase_order (tenant_id, branch_id, po_number);

CREATE UNIQUE INDEX uq_purchase_order_tenant_branch_idempotency
    ON purchase_order (tenant_id, branch_id, idempotency_key);

CREATE INDEX idx_purchase_order_tenant_branch_created
    ON purchase_order (tenant_id, branch_id, created_at DESC);

CREATE INDEX idx_purchase_order_tenant_branch_supplier
    ON purchase_order (tenant_id, branch_id, supplier_id);

CREATE TABLE purchase_order_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_order(id),
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    quantity NUMERIC(19, 6) NOT NULL,
    unit_rate_paise BIGINT NOT NULL,
    gst_rate NUMERIC(5, 2),
    line_subtotal_paise BIGINT NOT NULL,
    line_tax_paise BIGINT NOT NULL,
    line_total_paise BIGINT NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_purchase_order_line_scope
    ON purchase_order_line (tenant_id, branch_id, purchase_order_id);

CREATE TABLE purchase_order_version (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_order(id),
    version INT NOT NULL,
    status VARCHAR(16) NOT NULL,
    total_paise BIGINT NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_purchase_order_version_no
    ON purchase_order_version (purchase_order_id, version);

CREATE INDEX idx_purchase_order_version_scope
    ON purchase_order_version (tenant_id, branch_id, purchase_order_id);
