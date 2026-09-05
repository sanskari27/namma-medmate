-- M6-S02: server-priced GST, line/bill discounts, tax override, discount approval

ALTER TABLE sales_invoice
    ADD COLUMN bill_discount_type VARCHAR(16) NOT NULL DEFAULT 'NONE',
    ADD COLUMN bill_discount_value BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN customer_gstin VARCHAR(15),
    ADD COLUMN tax_jurisdiction VARCHAR(8) NOT NULL DEFAULT 'INTRA',
    ADD COLUMN cgst_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN sgst_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN igst_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN round_off_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN discount_approval_request_id UUID,
    ADD COLUMN discount_approval_status VARCHAR(16) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN tax_adjustment_reason VARCHAR(500),
    ADD COLUMN tax_adjusted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_bill_discount_type
        CHECK (bill_discount_type IN ('NONE', 'PERCENT', 'FLAT')),
    ADD CONSTRAINT chk_sales_invoice_tax_jurisdiction
        CHECK (tax_jurisdiction IN ('INTRA', 'INTER')),
    ADD CONSTRAINT chk_sales_invoice_discount_approval
        CHECK (discount_approval_status IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE sales_invoice_line
    ADD COLUMN discount_type VARCHAR(16) NOT NULL DEFAULT 'FLAT',
    ADD COLUMN discount_value BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN bill_discount_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN tax_category VARCHAR(64),
    ADD COLUMN gst_rate_source VARCHAR(16) NOT NULL DEFAULT 'PRODUCT',
    ADD COLUMN original_gst_rate NUMERIC(5, 2);

ALTER TABLE sales_invoice_line
    ADD CONSTRAINT chk_sales_invoice_line_discount_type
        CHECK (discount_type IN ('NONE', 'PERCENT', 'FLAT')),
    ADD CONSTRAINT chk_sales_invoice_line_gst_source
        CHECK (gst_rate_source IN ('PRODUCT', 'MANUAL'));

UPDATE sales_invoice_line
SET discount_value = discount_paise,
    original_gst_rate = gst_rate;

UPDATE sales_invoice si
SET cgst_paise = COALESCE((
        SELECT SUM(l.cgst_paise) FROM sales_invoice_line l WHERE l.sales_invoice_id = si.id
    ), 0),
    sgst_paise = COALESCE((
        SELECT SUM(l.sgst_paise) FROM sales_invoice_line l WHERE l.sales_invoice_id = si.id
    ), 0),
    igst_paise = COALESCE((
        SELECT SUM(l.igst_paise) FROM sales_invoice_line l WHERE l.sales_invoice_id = si.id
    ), 0);
