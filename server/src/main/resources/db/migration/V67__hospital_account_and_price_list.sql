-- M13-S01: tenant hospital credit account + institutional price list

CREATE TABLE hospital_credit_account (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    institution_name VARCHAR(200) NOT NULL,
    gstin VARCHAR(20),
    stores_contact VARCHAR(200),
    billing_phone VARCHAR(32),
    billing_email VARCHAR(200),
    credit_terms VARCHAR(32) NOT NULL,
    credit_limit_paise BIGINT NOT NULL DEFAULT 0,
    uniform_discount_bps INT NOT NULL DEFAULT 0,
    balance_paise BIGINT NOT NULL DEFAULT 0,
    price_list_approval_request_id UUID,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_credit_account_limit_nonneg CHECK (credit_limit_paise >= 0),
    CONSTRAINT chk_hospital_credit_account_balance_nonneg CHECK (balance_paise >= 0),
    CONSTRAINT chk_hospital_credit_account_uniform_bps
        CHECK (uniform_discount_bps >= 0 AND uniform_discount_bps <= 10000),
    CONSTRAINT chk_hospital_credit_account_terms
        CHECK (credit_terms IN ('ON_DEMAND', 'NET_15', 'NET_30', 'NET_45'))
);

CREATE UNIQUE INDEX uq_hospital_credit_account_tenant
    ON hospital_credit_account (tenant_id);

CREATE TABLE hospital_product_price_rule (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    product_id UUID NOT NULL REFERENCES product(id),
    rule_type VARCHAR(16) NOT NULL,
    value INT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_price_rule_type CHECK (rule_type IN ('PERCENT', 'FLAT_PAISE')),
    CONSTRAINT chk_hospital_price_rule_value CHECK (value >= 0)
);

CREATE UNIQUE INDEX uq_hospital_product_price_rule_tenant_product
    ON hospital_product_price_rule (tenant_id, product_id);

INSERT INTO access_role_module (id, role_id, module_code)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-000000000004', 'HOSPITAL');
