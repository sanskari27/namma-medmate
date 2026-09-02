ALTER TABLE app_user
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE app_user
    ADD CONSTRAINT app_user_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'KYC_LOCKED'));

UPDATE app_user SET email = lower(email);

CREATE UNIQUE INDEX uq_app_user_email_lower ON app_user (lower(email));

CREATE TABLE user_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id),
    tenant_id UUID REFERENCES tenant(id),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_session_user_active ON user_session (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_session_tenant ON user_session (tenant_id)
    WHERE tenant_id IS NOT NULL AND revoked_at IS NULL;
