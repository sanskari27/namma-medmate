-- M3-S02: customer merge provenance

ALTER TABLE customer
    ADD COLUMN merged_into_id UUID REFERENCES customer(id) ON DELETE SET NULL,
    ADD COLUMN merged_at TIMESTAMPTZ,
    ADD COLUMN merged_by_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL;

CREATE INDEX idx_customer_tenant_merged_into
    ON customer (tenant_id, merged_into_id)
    WHERE merged_into_id IS NOT NULL;
