-- M13-S08: POS hospital sale sources on existing sales invoices (patient INV, not hospital AR)

ALTER TABLE sales_invoice
    ADD COLUMN sale_source VARCHAR(16) NOT NULL DEFAULT 'COUNTER',
    ADD COLUMN uhid VARCHAR(32),
    ADD COLUMN ward_id UUID REFERENCES hospital_ward(id),
    ADD COLUMN admission_id UUID REFERENCES hospital_admission(id),
    ADD COLUMN insurer_name VARCHAR(200),
    ADD COLUMN policy_number VARCHAR(64);

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_sale_source
        CHECK (sale_source IN ('COUNTER', 'OPD_RX', 'WARD', 'EMERGENCY'));

CREATE INDEX idx_sales_invoice_hospital_source
    ON sales_invoice (tenant_id, branch_id, sale_source);

ALTER TABLE sales_invoice_payment
    DROP CONSTRAINT chk_sales_invoice_payment_mode;

ALTER TABLE sales_invoice_payment
    ADD CONSTRAINT chk_sales_invoice_payment_mode
        CHECK (mode IN ('CASH', 'CARD', 'UPI', 'CREDIT', 'BANK_TRANSFER', 'INSURANCE_TPA'));
