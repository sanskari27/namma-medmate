-- M13-S04: IPD admissions with tenant-unique UHID

CREATE TABLE hospital_uhid_sequence (
    tenant_id UUID PRIMARY KEY REFERENCES tenant(id),
    next_value INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_hospital_uhid_sequence_positive CHECK (next_value >= 1)
);

CREATE TABLE hospital_admission (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    uhid VARCHAR(32) NOT NULL,
    patient_name VARCHAR(200) NOT NULL,
    phone VARCHAR(32),
    age INT,
    gender VARCHAR(32),
    customer_id UUID REFERENCES customer(id),
    ward_id UUID NOT NULL REFERENCES hospital_ward(id),
    bed_id UUID NOT NULL REFERENCES hospital_bed(id),
    attending_doctor_id UUID REFERENCES hospital_doctor(id),
    diagnosis VARCHAR(500),
    payer_type VARCHAR(16) NOT NULL,
    insurer_name VARCHAR(200),
    policy_number VARCHAR(64),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    admitted_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_admission_payer
        CHECK (payer_type IN ('SELF_PAY', 'INSURANCE_TPA')),
    CONSTRAINT chk_hospital_admission_status
        CHECK (status IN ('ACTIVE', 'DISCHARGED')),
    CONSTRAINT chk_hospital_admission_age CHECK (age IS NULL OR age >= 0)
);

CREATE UNIQUE INDEX uq_hospital_admission_tenant_uhid
    ON hospital_admission (tenant_id, lower(uhid));

CREATE UNIQUE INDEX uq_hospital_admission_active_bed
    ON hospital_admission (tenant_id, branch_id, bed_id)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_hospital_admission_branch_status
    ON hospital_admission (tenant_id, branch_id, status);
