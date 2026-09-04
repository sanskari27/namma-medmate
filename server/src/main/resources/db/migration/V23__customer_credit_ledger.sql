-- M3-S05: per-customer khata credit account + immutable ledger

CREATE TABLE customer_credit_account (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    limit_paise BIGINT NOT NULL DEFAULT 0,
    balance_paise BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_customer_credit_account_limit_nonneg CHECK (limit_paise >= 0),
    CONSTRAINT chk_customer_credit_account_balance_nonneg CHECK (balance_paise >= 0)
);

CREATE UNIQUE INDEX uq_customer_credit_account_tenant_customer
    ON customer_credit_account (tenant_id, customer_id);

CREATE INDEX idx_customer_credit_account_tenant_balance
    ON customer_credit_account (tenant_id, balance_paise DESC)
    WHERE balance_paise > 0;

CREATE TABLE customer_credit_ledger_entry (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    account_id UUID NOT NULL REFERENCES customer_credit_account(id),
    type VARCHAR(32) NOT NULL,
    amount_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    invoice_id UUID,
    settlement_mode VARCHAR(64),
    settlement_reference VARCHAR(200),
    idempotency_key VARCHAR(128),
    created_by_user_id UUID NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_customer_credit_ledger_type
        CHECK (type IN ('SALE_CHARGE', 'SETTLEMENT', 'LIMIT_SET')),
    CONSTRAINT chk_customer_credit_ledger_amount_nonneg CHECK (amount_paise >= 0)
);

CREATE INDEX idx_customer_credit_ledger_customer
    ON customer_credit_ledger_entry (tenant_id, customer_id, occurred_at DESC);

CREATE UNIQUE INDEX uq_customer_credit_ledger_idempotency
    ON customer_credit_ledger_entry (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
