CREATE TABLE notification_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant(id),
    branch_id UUID REFERENCES location(id),
    href VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ,
    access_revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_source_tenant ON notification_source (tenant_id)
    WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_notification_source_branch ON notification_source (tenant_id, branch_id)
    WHERE branch_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES app_user(id),
    tenant_id UUID REFERENCES tenant(id),
    branch_id UUID REFERENCES location(id),
    title VARCHAR(255) NOT NULL,
    body VARCHAR(1000),
    source_type VARCHAR(64) NOT NULL,
    source_id UUID NOT NULL REFERENCES notification_source(id),
    href VARCHAR(255) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_recipient_created ON notification (recipient_user_id, created_at DESC);
CREATE INDEX idx_notification_tenant ON notification (tenant_id)
    WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_notification_branch ON notification (tenant_id, branch_id)
    WHERE branch_id IS NOT NULL;
CREATE INDEX idx_notification_unread ON notification (recipient_user_id)
    WHERE read_at IS NULL;
