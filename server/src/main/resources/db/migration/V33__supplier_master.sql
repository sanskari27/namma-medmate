-- M5-S01: tenant-wide supplier master (shared across branches; no rating)

CREATE TABLE supplier (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    supplier_code VARCHAR(32) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(200),
    supplier_type VARCHAR(32) NOT NULL,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    drug_license_number VARCHAR(64),
    drug_license_type VARCHAR(32),
    drug_license_expiry DATE,
    fssai_license_number VARCHAR(64),
    contact_person_name VARCHAR(120) NOT NULL,
    contact_person_role VARCHAR(80),
    phone VARCHAR(32) NOT NULL,
    alternate_phone VARCHAR(32),
    email VARCHAR(200),
    website VARCHAR(200),
    address_line_1 VARCHAR(200) NOT NULL,
    address_line_2 VARCHAR(200),
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL,
    pincode VARCHAR(16) NOT NULL,
    country VARCHAR(80) NOT NULL,
    payment_terms VARCHAR(16) NOT NULL,
    credit_period_days INT,
    credit_limit_paise BIGINT,
    bank_name VARCHAR(120),
    account_holder_name VARCHAR(120),
    account_number VARCHAR(32),
    ifsc_code VARCHAR(11),
    upi_id VARCHAR(120),
    status VARCHAR(16) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_supplier_tenant_code
    ON supplier (tenant_id, supplier_code);

CREATE UNIQUE INDEX uq_supplier_tenant_gstin
    ON supplier (tenant_id, gstin)
    WHERE gstin IS NOT NULL;

CREATE INDEX idx_supplier_tenant_legal
    ON supplier (tenant_id, lower(legal_name));

CREATE TABLE supplier_category (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    supplier_id UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_category(id),
    UNIQUE (supplier_id, category_id)
);

CREATE INDEX idx_supplier_category_tenant
    ON supplier_category (tenant_id, supplier_id);
