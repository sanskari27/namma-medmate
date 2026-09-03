CREATE TABLE user_branch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    user_id UUID NOT NULL REFERENCES app_user(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, user_id, branch_id)
);

CREATE INDEX idx_user_branch_user ON user_branch (tenant_id, user_id);
CREATE INDEX idx_user_branch_branch ON user_branch (tenant_id, branch_id);

ALTER TABLE user_session
    ADD COLUMN active_branch_id UUID REFERENCES location(id);
