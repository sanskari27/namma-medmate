-- M13-S03: tenant-scoped hospital departments and doctor directory

CREATE TABLE hospital_department (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(16) NOT NULL,
    head_doctor_id UUID REFERENCES doctor(id),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_department_type CHECK (type IN ('OPD', 'IPD', 'DIAGNOSTIC'))
);

CREATE UNIQUE INDEX uq_hospital_department_tenant_name
    ON hospital_department (tenant_id, lower(name));

CREATE TABLE hospital_doctor (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    doctor_id UUID NOT NULL REFERENCES doctor(id),
    department_id UUID REFERENCES hospital_department(id),
    qualification VARCHAR(200),
    specialty VARCHAR(200),
    gender VARCHAR(32),
    experience_years INT,
    email VARCHAR(320),
    opd_room VARCHAR(64),
    consulting_days VARCHAR(200),
    consulting_hours VARCHAR(200),
    consultation_fee_paise BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
    languages VARCHAR(500),
    notes TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_doctor_status
        CHECK (status IN ('AVAILABLE', 'ON_LEAVE', 'VISITING')),
    CONSTRAINT chk_hospital_doctor_fee CHECK (consultation_fee_paise >= 0),
    CONSTRAINT chk_hospital_doctor_experience
        CHECK (experience_years IS NULL OR experience_years >= 0)
);

CREATE UNIQUE INDEX uq_hospital_doctor_tenant_doctor
    ON hospital_doctor (tenant_id, doctor_id);

CREATE INDEX idx_hospital_doctor_department ON hospital_doctor (department_id);
