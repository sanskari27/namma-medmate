ALTER TABLE tenant
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN email_verified_at TIMESTAMPTZ;

ALTER TABLE tenant
    ADD CONSTRAINT chk_tenant_status
    CHECK (status IN (
        'VERIFICATION_REQUIRED',
        'ACTIVE',
        'SUSPENDED',
        'EXPIRED',
        'TERMINATED'
    ));

UPDATE tenant
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE status = 'ACTIVE' AND email_verified_at IS NULL;

CREATE TABLE email_verification_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_token_tenant ON email_verification_token (tenant_id);
CREATE INDEX idx_email_verification_token_user ON email_verification_token (user_id);
