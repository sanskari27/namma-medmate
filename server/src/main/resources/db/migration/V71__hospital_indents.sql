-- M13-S05: ward medicine indents (requisitions)

CREATE TABLE hospital_indent_sequence (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    next_value INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_hospital_indent_sequence_positive CHECK (next_value >= 1)
);

CREATE UNIQUE INDEX uq_hospital_indent_sequence_scope
    ON hospital_indent_sequence (tenant_id, branch_id);

CREATE TABLE hospital_indent (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    indent_number VARCHAR(32) NOT NULL,
    ward_id UUID NOT NULL REFERENCES hospital_ward(id),
    bed_id UUID REFERENCES hospital_bed(id),
    patient_name VARCHAR(200),
    note VARCHAR(500),
    requested_by VARCHAR(200) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    hospital_invoice_ref VARCHAR(64),
    issued_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_indent_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED'))
);

CREATE UNIQUE INDEX uq_hospital_indent_tenant_branch_number
    ON hospital_indent (tenant_id, branch_id, indent_number);

CREATE INDEX idx_hospital_indent_branch_status
    ON hospital_indent (tenant_id, branch_id, status);

CREATE INDEX idx_hospital_indent_issued_at
    ON hospital_indent (tenant_id, branch_id, issued_at)
    WHERE issued_at IS NOT NULL;

CREATE TABLE hospital_indent_line (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    indent_id UUID NOT NULL REFERENCES hospital_indent(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product(id),
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    requested_qty NUMERIC(19, 6) NOT NULL,
    issued_qty NUMERIC(19, 6) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_indent_line_requested_qty CHECK (requested_qty > 0),
    CONSTRAINT chk_hospital_indent_line_issued_qty CHECK (issued_qty >= 0)
);

CREATE INDEX idx_hospital_indent_line_indent
    ON hospital_indent_line (indent_id);

INSERT INTO access_role_module (id, role_id, module_code)
VALUES (gen_random_uuid(), '11111111-1111-1111-1111-000000000003', 'HOSPITAL');
