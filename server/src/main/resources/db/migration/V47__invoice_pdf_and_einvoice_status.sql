ALTER TABLE sales_invoice
    ADD COLUMN pharmacy_legal_name VARCHAR(200),
    ADD COLUMN pharmacy_address VARCHAR(500),
    ADD COLUMN pharmacy_phone VARCHAR(32),
    ADD COLUMN pharmacy_gstin VARCHAR(15),
    ADD COLUMN pharmacy_pan VARCHAR(20),
    ADD COLUMN pharmacy_drug_license_number VARCHAR(64),
    ADD COLUMN pharmacy_drug_license_type VARCHAR(64),
    ADD COLUMN pharmacist_name VARCHAR(200),
    ADD COLUMN pharmacist_registration VARCHAR(64),
    ADD COLUMN einvoice_applicability VARCHAR(32) NOT NULL DEFAULT 'NOT_APPLICABLE',
    ADD COLUMN einvoice_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SUBMITTED',
    ADD COLUMN einvoice_irn VARCHAR(64),
    ADD COLUMN einvoice_ack_no VARCHAR(64),
    ADD COLUMN einvoice_ack_at TIMESTAMPTZ;

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_einvoice_applicability
        CHECK (einvoice_applicability IN ('NOT_APPLICABLE')),
    ADD CONSTRAINT chk_sales_invoice_einvoice_status
        CHECK (einvoice_status IN ('NOT_SUBMITTED'));

ALTER TABLE sales_invoice_line
    ADD COLUMN schedule_classification VARCHAR(16),
    ADD COLUMN controlled_substance BOOLEAN NOT NULL DEFAULT FALSE;
