-- Pharmacy-to-platform Cashfree checkout history. Tenant-owned, not branch-owned.

CREATE TABLE subscription_payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    upgrade_intent_id UUID NOT NULL REFERENCES subscription_upgrade_intent(id),
    plan_code VARCHAR(32) NOT NULL CHECK (plan_code IN ('STARTER', 'GROWTH', 'PRO')),
    amount_paise INT NOT NULL CHECK (amount_paise > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    provider VARCHAR(32) NOT NULL CHECK (provider = 'CASHFREE'),
    provider_order_id VARCHAR(128) NOT NULL,
    payment_session_id VARCHAR(256),
    checkout_url VARCHAR(512),
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'ABANDONED')),
    provider_payment_id VARCHAR(128),
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    idempotency_key VARCHAR(128) NOT NULL,
    payload_snapshot JSONB,
    error_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_subscription_payment_idempotency UNIQUE (idempotency_key),
    CONSTRAINT uq_subscription_payment_provider_order UNIQUE (provider_order_id)
);

CREATE INDEX idx_subscription_payment_tenant_created
    ON subscription_payment (tenant_id, created_at DESC);
