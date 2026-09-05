CREATE TABLE compliance_license (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    branch_id UUID REFERENCES location (id),
    staff_user_id UUID REFERENCES app_user (id),
    doc_type VARCHAR(32) NOT NULL,
    scope VARCHAR(16) NOT NULL,
    license_number VARCHAR(64) NOT NULL,
    issued_on DATE NOT NULL,
    expires_on DATE NOT NULL,
    current_evidence_id UUID,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_compliance_license_doc_type
        CHECK (doc_type IN ('DRUG_LICENSE', 'GST', 'FSSAI', 'PHARMACIST_REGISTRATION')),
    CONSTRAINT chk_compliance_license_scope
        CHECK (scope IN ('TENANT', 'BRANCH', 'STAFF')),
    CONSTRAINT chk_compliance_license_dates
        CHECK (expires_on >= issued_on)
);

CREATE UNIQUE INDEX uq_compliance_license_current
    ON compliance_license (
        tenant_id,
        doc_type,
        COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'),
        COALESCE(staff_user_id, '00000000-0000-0000-0000-000000000000')
    );

CREATE INDEX idx_compliance_license_tenant_due
    ON compliance_license (tenant_id, expires_on);

CREATE INDEX idx_compliance_license_branch
    ON compliance_license (tenant_id, branch_id);

CREATE TABLE compliance_license_evidence (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    license_id UUID NOT NULL REFERENCES compliance_license (id),
    license_number VARCHAR(64) NOT NULL,
    issued_on DATE NOT NULL,
    expires_on DATE NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES app_user (id),
    uploaded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_compliance_license_evidence_license
    ON compliance_license_evidence (tenant_id, license_id, uploaded_at);

ALTER TABLE compliance_license
    ADD CONSTRAINT fk_compliance_license_current_evidence
        FOREIGN KEY (current_evidence_id) REFERENCES compliance_license_evidence (id);
