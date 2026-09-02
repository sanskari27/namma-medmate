CREATE TABLE approval_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant(id),
    scope VARCHAR(16) NOT NULL CHECK (scope IN ('TENANT', 'PLATFORM')),
    module_code VARCHAR(32) NOT NULL,
    action_key VARCHAR(64) NOT NULL,
    threshold_value INTEGER,
    approver_type VARCHAR(16) NOT NULL
        CHECK (approver_type IN ('ACCOUNT_CLASS', 'ACCESS_ROLE')),
    approver_account_class VARCHAR(32),
    approver_role_id UUID REFERENCES access_role(id),
    allow_self_approval BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT approval_rule_approver_shape CHECK (
        (approver_type = 'ACCOUNT_CLASS'
            AND approver_account_class IS NOT NULL
            AND approver_role_id IS NULL)
        OR (approver_type = 'ACCESS_ROLE'
            AND approver_role_id IS NOT NULL
            AND approver_account_class IS NULL)
    ),
    CONSTRAINT approval_rule_scope_tenant CHECK (
        (scope = 'TENANT' AND tenant_id IS NOT NULL)
        OR (scope = 'PLATFORM' AND tenant_id IS NULL)
    )
);

CREATE UNIQUE INDEX idx_approval_rule_tenant_action
    ON approval_rule (tenant_id, module_code, action_key)
    WHERE deleted_at IS NULL AND scope = 'TENANT';

CREATE UNIQUE INDEX idx_approval_rule_platform_action
    ON approval_rule (module_code, action_key)
    WHERE deleted_at IS NULL AND scope = 'PLATFORM';

CREATE INDEX idx_approval_rule_tenant
    ON approval_rule (tenant_id)
    WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE approval_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID REFERENCES location(id),
    rule_id UUID NOT NULL REFERENCES approval_rule(id),
    requester_user_id UUID NOT NULL REFERENCES app_user(id),
    module_code VARCHAR(32) NOT NULL,
    action_key VARCHAR(64) NOT NULL,
    amount_value INTEGER,
    threshold_snapshot INTEGER,
    rule_version_snapshot INTEGER NOT NULL,
    context_json TEXT,
    status VARCHAR(16) NOT NULL
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    idempotency_key VARCHAR(128),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_approval_request_idempotency
    ON approval_request (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_approval_request_tenant_status
    ON approval_request (tenant_id, status);

CREATE INDEX idx_approval_request_rule
    ON approval_request (rule_id);

CREATE TABLE approval_decision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES approval_request(id),
    actor_user_id UUID NOT NULL REFERENCES app_user(id),
    outcome VARCHAR(16) NOT NULL CHECK (outcome IN ('APPROVED', 'REJECTED')),
    note VARCHAR(500),
    rule_version_snapshot INTEGER NOT NULL,
    threshold_snapshot INTEGER,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_approval_decision_request
    ON approval_decision (request_id);

CREATE TABLE audit_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    tenant_id UUID,
    branch_id UUID,
    action VARCHAR(64) NOT NULL,
    outcome VARCHAR(32) NOT NULL,
    attempted_identity VARCHAR(320),
    source_ip VARCHAR(64),
    user_agent VARCHAR(512),
    session_id UUID,
    context_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_event_tenant_created
    ON audit_event (tenant_id, created_at DESC);

CREATE INDEX idx_audit_event_created
    ON audit_event (created_at);
