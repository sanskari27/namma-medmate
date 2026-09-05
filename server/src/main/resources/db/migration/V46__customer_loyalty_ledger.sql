-- M3-S09: tenant-wide loyalty points ledger (D-012)

CREATE TABLE customer_loyalty_account (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    balance_points BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_customer_loyalty_account_balance_nonneg CHECK (balance_points >= 0)
);

CREATE UNIQUE INDEX uq_customer_loyalty_account_tenant_customer
    ON customer_loyalty_account (tenant_id, customer_id);

CREATE TABLE customer_loyalty_ledger_entry (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    account_id UUID NOT NULL REFERENCES customer_loyalty_account(id),
    type VARCHAR(32) NOT NULL,
    points BIGINT NOT NULL,
    delta_points BIGINT NOT NULL,
    balance_after_points BIGINT NOT NULL,
    invoice_id UUID,
    sales_return_id UUID,
    taxable_paise BIGINT NOT NULL DEFAULT 0,
    reason VARCHAR(200),
    idempotency_key VARCHAR(128),
    created_by_user_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_customer_loyalty_ledger_type
        CHECK (type IN (
            'EARN', 'REDEEM', 'SETTLEMENT_EARN', 'RETURN_EARN', 'RETURN_REDEEM', 'ADJUSTMENT'
        )),
    CONSTRAINT chk_customer_loyalty_ledger_points_nonneg CHECK (points >= 0),
    CONSTRAINT chk_customer_loyalty_ledger_balance_nonneg CHECK (balance_after_points >= 0)
);

CREATE INDEX idx_customer_loyalty_ledger_customer
    ON customer_loyalty_ledger_entry (tenant_id, customer_id, occurred_at DESC);

CREATE UNIQUE INDEX uq_customer_loyalty_ledger_idempotency
    ON customer_loyalty_ledger_entry (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

ALTER TABLE sales_invoice
    ADD COLUMN loyalty_redeem_points BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN loyalty_redeem_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN loyalty_earned_points BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN loyalty_taxable_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN loyalty_pending_taxable_paise BIGINT NOT NULL DEFAULT 0;

ALTER TABLE sales_invoice
    ADD CONSTRAINT chk_sales_invoice_loyalty_nonneg CHECK (
        loyalty_redeem_points >= 0
        AND loyalty_redeem_paise >= 0
        AND loyalty_earned_points >= 0
        AND loyalty_taxable_paise >= 0
        AND loyalty_pending_taxable_paise >= 0
    );
