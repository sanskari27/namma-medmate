-- M6-S05: park/hold invoices without reserving stock

ALTER TABLE sales_invoice
    DROP CONSTRAINT chk_sales_invoice_status;

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_status CHECK (status IN ('DRAFT', 'HELD', 'COMPLETED'));
