-- M4-S02: multi-unit conversion (star topology to base_unit)

ALTER TABLE product
    ADD COLUMN quantity_precision INT NOT NULL DEFAULT 0;

ALTER TABLE product
    ADD CONSTRAINT chk_product_quantity_precision
        CHECK (quantity_precision >= 0 AND quantity_precision <= 4);

CREATE TABLE product_unit_conversion (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    unit VARCHAR(32) NOT NULL,
    factor_to_base NUMERIC(18, 6) NOT NULL,
    version INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_product_unit_factor_positive CHECK (factor_to_base > 0),
    CONSTRAINT chk_product_unit_version_positive CHECK (version >= 1)
);

CREATE UNIQUE INDEX uq_product_unit_conversion_tenant_product_unit
    ON product_unit_conversion (tenant_id, product_id, unit);

CREATE INDEX idx_product_unit_conversion_tenant_product
    ON product_unit_conversion (tenant_id, product_id);

-- Backfill pack_unit → base from existing product pack fields
INSERT INTO product_unit_conversion (
    id, tenant_id, product_id, unit, factor_to_base, version, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    p.tenant_id,
    p.id,
    p.pack_unit,
    p.pack_size,
    1,
    p.created_at,
    p.updated_at
FROM product p
WHERE p.pack_unit <> p.base_unit
  AND p.pack_size > 0;
