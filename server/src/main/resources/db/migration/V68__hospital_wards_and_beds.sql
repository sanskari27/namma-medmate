-- M13-S02: branch wards and beds for IPD occupancy

CREATE TABLE hospital_ward (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(32) NOT NULL,
    floor VARCHAR(64),
    category VARCHAR(32) NOT NULL,
    capacity INT NOT NULL,
    nurse_in_charge VARCHAR(200),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_ward_capacity CHECK (capacity > 0),
    CONSTRAINT chk_hospital_ward_category
        CHECK (category IN ('GENERAL', 'ICU', 'PEDIATRIC', 'MATERNITY', 'SURGICAL', 'PRIVATE'))
);

CREATE UNIQUE INDEX uq_hospital_ward_tenant_branch_code
    ON hospital_ward (tenant_id, branch_id, lower(code));

CREATE TABLE hospital_bed (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    ward_id UUID NOT NULL REFERENCES hospital_ward(id) ON DELETE CASCADE,
    sequence_no INT NOT NULL,
    label VARCHAR(64) NOT NULL,
    occupancy_status VARCHAR(16) NOT NULL DEFAULT 'FREE',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_bed_occupancy CHECK (occupancy_status IN ('FREE', 'OCCUPIED')),
    CONSTRAINT chk_hospital_bed_sequence CHECK (sequence_no > 0)
);

CREATE UNIQUE INDEX uq_hospital_bed_tenant_branch_label
    ON hospital_bed (tenant_id, branch_id, label);

CREATE INDEX idx_hospital_bed_ward ON hospital_bed (ward_id);

INSERT INTO access_role_module (id, role_id, module_code)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-000000000001', 'HOSPITAL');
