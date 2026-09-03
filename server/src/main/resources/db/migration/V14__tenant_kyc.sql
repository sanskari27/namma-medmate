CREATE TABLE kyc_submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    legal_name VARCHAR(255) NOT NULL,
    drug_license_number VARCHAR(64) NOT NULL,
    pan VARCHAR(20) NOT NULL,
    gstin VARCHAR(20),
    address_line1 VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(16) NOT NULL,
    contact_phone VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUBMITTED', 'REJECTED', 'APPROVED')),
    rejection_reason VARCHAR(1000),
    submitted_by UUID NOT NULL REFERENCES app_user(id),
    submitted_at TIMESTAMPTZ NOT NULL,
    reviewed_by UUID REFERENCES app_user(id),
    reviewed_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_kyc_submission_tenant_submitted
    ON kyc_submission (tenant_id)
    WHERE status = 'SUBMITTED';

CREATE INDEX idx_kyc_submission_tenant ON kyc_submission (tenant_id);
CREATE INDEX idx_kyc_submission_status ON kyc_submission (status)
    WHERE status = 'SUBMITTED';

CREATE TABLE kyc_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    submission_id UUID NOT NULL REFERENCES kyc_submission(id) ON DELETE CASCADE,
    doc_type VARCHAR(32) NOT NULL CHECK (doc_type IN ('DRUG_LICENSE', 'PAN', 'GST_CERTIFICATE')),
    content_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_kyc_document_submission_type UNIQUE (submission_id, doc_type)
);

CREATE INDEX idx_kyc_document_tenant ON kyc_document (tenant_id);
CREATE INDEX idx_kyc_document_submission ON kyc_document (submission_id);

CREATE TABLE tenant_subscription (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenant(id),
    plan_code VARCHAR(32) NOT NULL CHECK (plan_code IN ('FREE', 'STARTER', 'GROWTH', 'PRO')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
    started_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_subscription_plan ON tenant_subscription (plan_code);
