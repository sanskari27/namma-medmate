CREATE TABLE kiosk_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    status VARCHAR(16) NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
    opened_by UUID NOT NULL REFERENCES app_user(id),
    opened_at TIMESTAMPTZ NOT NULL,
    closed_by UUID REFERENCES app_user(id),
    closed_at TIMESTAMPTZ,
    next_token INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_kiosk_session_open
    ON kiosk_session (tenant_id, branch_id)
    WHERE status = 'OPEN';

CREATE INDEX idx_kiosk_session_tenant_branch
    ON kiosk_session (tenant_id, branch_id, opened_at DESC);

CREATE TABLE kiosk_ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    session_id UUID NOT NULL REFERENCES kiosk_session(id),
    token INT NOT NULL,
    walk_in_name VARCHAR(120),
    pickup_request VARCHAR(500) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('WAITING', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_kiosk_ticket_session_token UNIQUE (session_id, token)
);

CREATE INDEX idx_kiosk_ticket_tenant_branch_status
    ON kiosk_ticket (tenant_id, branch_id, status, created_at);
