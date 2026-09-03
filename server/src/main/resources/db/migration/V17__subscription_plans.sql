ALTER TABLE tenant_subscription
    ADD COLUMN branch_limit_override INT NULL;

CREATE TABLE subscription_upgrade_intent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    target_plan VARCHAR(32) NOT NULL CHECK (target_plan IN ('FREE', 'STARTER', 'GROWTH', 'PRO')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'APPLIED', 'CANCELLED')),
    idempotency_key VARCHAR(128) NOT NULL,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_subscription_upgrade_intent_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX idx_subscription_upgrade_intent_tenant
    ON subscription_upgrade_intent (tenant_id);

CREATE TABLE subscription_override_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    actor_user_id UUID NOT NULL REFERENCES app_user(id),
    before_plan VARCHAR(32) NOT NULL,
    after_plan VARCHAR(32) NOT NULL,
    before_status VARCHAR(32) NOT NULL,
    after_status VARCHAR(32) NOT NULL,
    before_expires_at TIMESTAMPTZ,
    after_expires_at TIMESTAMPTZ,
    before_branch_limit_override INT,
    after_branch_limit_override INT,
    reason VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_override_event_tenant_created
    ON subscription_override_event (tenant_id, created_at DESC);
