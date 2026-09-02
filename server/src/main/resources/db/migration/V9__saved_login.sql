CREATE TABLE saved_login (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenant(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_saved_login_device_user ON saved_login (device_id, user_id);

CREATE INDEX idx_saved_login_device_active
    ON saved_login (device_id)
    WHERE revoked_at IS NULL;

CREATE INDEX idx_saved_login_user ON saved_login (user_id)
    WHERE revoked_at IS NULL;
