ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
ALTER TABLE app_user
    ADD CONSTRAINT app_user_role_check
    CHECK (role IN ('pharmacy_owner', 'pharmacy_staff', 'admin_super', 'admin_verification'));

ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_status_check;
ALTER TABLE app_user
    ADD CONSTRAINT app_user_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'KYC_LOCKED', 'PENDING'));

ALTER TABLE app_user ADD COLUMN phone VARCHAR(32);

CREATE TABLE staff_registration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant(id),
    user_id UUID NOT NULL UNIQUE REFERENCES app_user(id),
    kind VARCHAR(32) NOT NULL CHECK (kind IN ('PHARMACIST', 'STAFF')),
    license_number VARCHAR(64),
    evidence_reference VARCHAR(255),
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'APPROVED')),
    reviewed_by UUID REFERENCES app_user(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_registration_pharmacist_license
        CHECK (kind <> 'PHARMACIST' OR (license_number IS NOT NULL AND length(btrim(license_number)) > 0))
);

CREATE INDEX idx_staff_registration_tenant ON staff_registration (tenant_id)
    WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_staff_registration_pending ON staff_registration (status)
    WHERE status = 'PENDING';
