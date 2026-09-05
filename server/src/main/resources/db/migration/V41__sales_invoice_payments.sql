-- M6-S03: mixed tender, khata due, change, completed invoice payments

ALTER TABLE sales_invoice
    DROP CONSTRAINT chk_sales_invoice_status;

ALTER TABLE sales_invoice
    ADD COLUMN amount_paid_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN amount_due_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN change_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN completed_at TIMESTAMPTZ,
    ADD COLUMN complete_idempotency_key VARCHAR(128);

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_status CHECK (status IN ('DRAFT', 'COMPLETED')),
    ADD CONSTRAINT chk_sales_invoice_tender_nonneg CHECK (
        amount_paid_paise >= 0 AND amount_due_paise >= 0 AND change_paise >= 0
    );

CREATE UNIQUE INDEX uq_sales_invoice_tenant_branch_complete_idempotency
    ON sales_invoice (tenant_id, branch_id, complete_idempotency_key)
    WHERE complete_idempotency_key IS NOT NULL;

CREATE TABLE sales_invoice_payment (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    sales_invoice_id UUID NOT NULL REFERENCES sales_invoice(id),
    mode VARCHAR(16) NOT NULL,
    amount_paise BIGINT NOT NULL,
    reference VARCHAR(64),
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_sales_invoice_payment_mode
        CHECK (mode IN ('CASH', 'CARD', 'UPI', 'CREDIT', 'BANK_TRANSFER')),
    CONSTRAINT chk_sales_invoice_payment_amount CHECK (amount_paise > 0)
);

CREATE INDEX idx_sales_invoice_payment_scope
    ON sales_invoice_payment (tenant_id, branch_id, sales_invoice_id, sort_order);
