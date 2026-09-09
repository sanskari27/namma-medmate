-- Prescription scan/image attachment on sales invoices (orders Rx view)

ALTER TABLE sales_invoice
    ADD COLUMN prescription_attachment_storage_key VARCHAR(512),
    ADD COLUMN prescription_attachment_content_type VARCHAR(128),
    ADD COLUMN prescription_attachment_filename VARCHAR(255),
    ADD COLUMN prescription_attachment_byte_size BIGINT,
    ADD COLUMN prescription_attachment_uploaded_at TIMESTAMPTZ;

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_rx_attachment_size
    CHECK (
        prescription_attachment_byte_size IS NULL
        OR prescription_attachment_byte_size > 0
    );
