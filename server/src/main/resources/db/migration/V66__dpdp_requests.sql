-- M1-S09: staff-mediated DPDP principal requests (D-013)

CREATE TABLE dpdp_request (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenant(id),
    principal_type VARCHAR(32) NOT NULL,
    principal_id UUID,
    request_type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    submitted_name VARCHAR(200),
    submitted_phone VARCHAR(32),
    notes VARCHAR(500),
    identity_method VARCHAR(500),
    identity_attested_by UUID REFERENCES app_user(id),
    identity_attested_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    decision VARCHAR(16),
    decision_reason VARCHAR(500),
    legal_retention BOOLEAN NOT NULL DEFAULT FALSE,
    export_json TEXT,
    created_by UUID NOT NULL REFERENCES app_user(id),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_dpdp_principal_type CHECK (
        principal_type IN ('CUSTOMER', 'STAFF', 'OWNER_KYC', 'MASTER', 'SUPPLIER', 'DOCTOR')
    ),
    CONSTRAINT chk_dpdp_request_type CHECK (
        request_type IN ('ACCESS', 'CORRECTION', 'EXPORT', 'ERASURE')
    ),
    CONSTRAINT chk_dpdp_status CHECK (
        status IN ('RECEIVED', 'ACCEPTED', 'FULFILLED', 'REFUSED')
    ),
    CONSTRAINT chk_dpdp_decision CHECK (
        decision IS NULL OR decision IN ('FULFILLED', 'REFUSED')
    ),
    CONSTRAINT chk_dpdp_scope CHECK (
        (principal_type IN ('MASTER') AND tenant_id IS NULL)
        OR (principal_type <> 'MASTER' AND tenant_id IS NOT NULL)
    )
);

CREATE INDEX idx_dpdp_request_tenant_created
    ON dpdp_request (tenant_id, created_at DESC);

CREATE INDEX idx_dpdp_request_platform_created
    ON dpdp_request (created_at DESC)
    WHERE tenant_id IS NULL;
