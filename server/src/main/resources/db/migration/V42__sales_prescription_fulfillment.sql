-- M6-S04: prescription reference remaining qty; line prescribed snapshot (no image)

ALTER TABLE sales_invoice_line
    ADD COLUMN prescribed_quantity NUMERIC(19, 6);

CREATE TABLE sales_prescription_fulfillment (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    doctor_id UUID REFERENCES doctor(id),
    prescription_reference VARCHAR(64) NOT NULL,
    product_id UUID NOT NULL REFERENCES product(id),
    prescribed_quantity NUMERIC(19, 6) NOT NULL,
    fulfilled_quantity NUMERIC(19, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_prescription_qty CHECK (
        prescribed_quantity > 0 AND fulfilled_quantity >= 0
    )
);

CREATE UNIQUE INDEX uq_sales_prescription_fulfillment
    ON sales_prescription_fulfillment (tenant_id, prescription_reference, product_id);

CREATE INDEX idx_sales_prescription_fulfillment_tenant_ref
    ON sales_prescription_fulfillment (tenant_id, prescription_reference);
