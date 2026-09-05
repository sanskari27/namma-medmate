-- M5-S05: pharmacist QC and stock-in against pending goods receipts

ALTER TABLE goods_receipt
    ADD COLUMN checked_at TIMESTAMPTZ,
    ADD COLUMN checked_by_user_id UUID,
    ADD COLUMN visual_inspection_passed BOOLEAN,
    ADD COLUMN packaging_intact BOOLEAN,
    ADD COLUMN label_matches BOOLEAN,
    ADD COLUMN batch_readable BOOLEAN,
    ADD COLUMN no_damage BOOLEAN,
    ADD COLUMN qc_idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX uq_goods_receipt_tenant_branch_qc_idempotency
    ON goods_receipt (tenant_id, branch_id, qc_idempotency_key)
    WHERE qc_idempotency_key IS NOT NULL;

CREATE INDEX idx_goods_receipt_tenant_branch_status_created
    ON goods_receipt (tenant_id, branch_id, status, created_at DESC);

ALTER TABLE goods_receipt_line
    ADD COLUMN accepted_quantity NUMERIC(19, 6),
    ADD COLUMN rejected_quantity NUMERIC(19, 6),
    ADD COLUMN batch_number VARCHAR(64),
    ADD COLUMN manufactured_on DATE,
    ADD COLUMN expires_on DATE,
    ADD COLUMN stock_movement_id UUID;
