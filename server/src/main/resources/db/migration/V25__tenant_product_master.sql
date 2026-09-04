-- M4-S01: tenant-scoped product master (no shared cross-tenant catalogue)

CREATE TABLE product_category (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_product_category_tenant_name
    ON product_category (tenant_id, lower(name));

CREATE INDEX idx_product_category_tenant
    ON product_category (tenant_id);

CREATE TABLE manufacturer (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_manufacturer_tenant_name
    ON manufacturer (tenant_id, lower(name));

CREATE INDEX idx_manufacturer_tenant
    ON manufacturer (tenant_id);

CREATE TABLE product (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    sku VARCHAR(64) NOT NULL,
    barcode VARCHAR(64),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    brand_name VARCHAR(200),
    manufacturer_id UUID REFERENCES manufacturer(id),
    category_id UUID NOT NULL REFERENCES product_category(id),
    product_type VARCHAR(32) NOT NULL,
    dosage_form VARCHAR(32) NOT NULL,
    therapeutic_class VARCHAR(200),
    composition TEXT,
    strength VARCHAR(100),
    route VARCHAR(32),
    prescription_required BOOLEAN NOT NULL,
    schedule_classification VARCHAR(16),
    hsn_code VARCHAR(16),
    gst_rate NUMERIC(5, 2),
    base_unit VARCHAR(32) NOT NULL,
    pack_size NUMERIC(12, 4) NOT NULL,
    pack_unit VARCHAR(32) NOT NULL,
    pack_description VARCHAR(200),
    storage_conditions VARCHAR(500),
    requires_cold_storage BOOLEAN NOT NULL DEFAULT FALSE,
    rack_location VARCHAR(100),
    reorder_level INT,
    reorder_quantity INT,
    minimum_stock INT,
    is_discontinued BOOLEAN NOT NULL DEFAULT FALSE,
    is_returnable BOOLEAN NOT NULL DEFAULT TRUE,
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    tax_category VARCHAR(64),
    requires_batch_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    requires_expiry_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    requires_serial_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    controlled_substance BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_product_tenant_sku
    ON product (tenant_id, sku);

CREATE INDEX idx_product_tenant_name
    ON product (tenant_id, lower(name));

CREATE INDEX idx_product_tenant_sku
    ON product (tenant_id, sku);

CREATE INDEX idx_product_tenant_barcode
    ON product (tenant_id, barcode)
    WHERE barcode IS NOT NULL;
