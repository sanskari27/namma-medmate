-- M6-S06: schemes/offers and invoice-line snapshots

CREATE TABLE sales_offer (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    name VARCHAR(120) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    priority INTEGER NOT NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    buy_quantity INTEGER,
    get_quantity INTEGER,
    benefit_type VARCHAR(16) NOT NULL,
    benefit_value BIGINT NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_offer_kind CHECK (kind IN ('BOGO', 'SEASONAL', 'BUNDLE')),
    CONSTRAINT chk_sales_offer_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_sales_offer_benefit_type CHECK (benefit_type IN ('PERCENT', 'FLAT', 'FREE_QTY'))
);

CREATE INDEX idx_sales_offer_tenant_status ON sales_offer (tenant_id, status, priority DESC);

CREATE TABLE sales_offer_product (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    offer_id UUID NOT NULL REFERENCES sales_offer (id),
    product_id UUID NOT NULL,
    slot VARCHAR(16) NOT NULL,
    CONSTRAINT chk_sales_offer_product_slot CHECK (slot IN ('TRIGGER', 'BENEFIT', 'BUNDLE')),
    CONSTRAINT uq_sales_offer_product UNIQUE (offer_id, product_id, slot)
);

CREATE INDEX idx_sales_offer_product_tenant ON sales_offer_product (tenant_id, offer_id);

ALTER TABLE sales_invoice_line
    ADD COLUMN offer_id UUID,
    ADD COLUMN offer_name VARCHAR(120),
    ADD COLUMN offer_kind VARCHAR(16),
    ADD COLUMN offer_priority INTEGER,
    ADD COLUMN offer_benefit_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN offer_explanation VARCHAR(500);

ALTER TABLE sales_invoice_line
    ADD CONSTRAINT chk_sales_invoice_line_offer_kind
        CHECK (offer_kind IS NULL OR offer_kind IN ('BOGO', 'SEASONAL', 'BUNDLE'));
