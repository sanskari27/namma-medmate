-- M5-S03: idempotent reorder-to-draft runs (tenant + branch scoped)

CREATE TABLE purchase_order_reorder_run (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    idempotency_key VARCHAR(128) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    draft_ids JSONB NOT NULL,
    unmapped JSONB NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_po_reorder_run_tenant_branch_key
    ON purchase_order_reorder_run (tenant_id, branch_id, idempotency_key);

CREATE INDEX idx_po_reorder_run_tenant_branch_created
    ON purchase_order_reorder_run (tenant_id, branch_id, created_at DESC);
