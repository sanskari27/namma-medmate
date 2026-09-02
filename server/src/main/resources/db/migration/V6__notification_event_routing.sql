ALTER TABLE notification_source
    ADD COLUMN source_record_id UUID;

CREATE TABLE notification_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(128) NOT NULL UNIQUE,
    trigger VARCHAR(64) NOT NULL,
    tenant_id UUID REFERENCES tenant(id),
    branch_id UUID REFERENCES location(id),
    source_record_id UUID NOT NULL,
    affected_user_id UUID REFERENCES app_user(id),
    approver_role VARCHAR(32),
    customer_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_event_tenant ON notification_event (tenant_id)
    WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_notification_event_branch ON notification_event (tenant_id, branch_id)
    WHERE branch_id IS NOT NULL;

CREATE TABLE notification_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES notification_event(id),
    recipient_key VARCHAR(80) NOT NULL,
    channel VARCHAR(16) NOT NULL CHECK (channel IN ('IN_APP', 'WHATSAPP', 'CREDENTIAL')),
    recipient_user_id UUID REFERENCES app_user(id),
    notification_id UUID REFERENCES notification(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, recipient_key, channel)
);

CREATE UNIQUE INDEX idx_notification_delivery_inbox ON notification_delivery (notification_id)
    WHERE notification_id IS NOT NULL;

CREATE TABLE notification_role_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID REFERENCES location(id),
    routing_role VARCHAR(32) NOT NULL
        CHECK (routing_role IN ('INVENTORY', 'PHARMACIST', 'ACCOUNTANT', 'APPROVER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_notification_role_assignment_unique
    ON notification_role_assignment (
        user_id,
        tenant_id,
        COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'),
        routing_role
    );
