-- M7-S04: sale-time prescription references; 6-month validity then archive (D-003)

CREATE TABLE prescription_reference (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    customer_id UUID NOT NULL REFERENCES customer(id),
    doctor_id UUID REFERENCES doctor(id),
    prescription_reference VARCHAR(64) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archive_reason VARCHAR(16) CHECK (archive_reason IN ('EXPIRED', 'FULFILLED')),
    archived_at TIMESTAMPTZ,
    first_invoice_id UUID REFERENCES sales_invoice(id),
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_prescription_reference_archive CHECK (
        (status = 'ACTIVE' AND archived_at IS NULL AND archive_reason IS NULL)
        OR (status = 'ARCHIVED' AND archived_at IS NOT NULL AND archive_reason IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_prescription_reference_tenant_ref
    ON prescription_reference (tenant_id, prescription_reference);

CREATE INDEX idx_prescription_reference_tenant_status
    ON prescription_reference (tenant_id, status);

CREATE INDEX idx_prescription_reference_tenant_expires
    ON prescription_reference (tenant_id, expires_at)
    WHERE status = 'ACTIVE';

INSERT INTO prescription_reference (
    id,
    tenant_id,
    branch_id,
    customer_id,
    doctor_id,
    prescription_reference,
    issued_at,
    expires_at,
    status,
    first_invoice_id,
    version,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    f.tenant_id,
    i.branch_id,
    f.customer_id,
    f.doctor_id,
    f.prescription_reference,
    f.created_at,
    (f.created_at AT TIME ZONE 'UTC' + INTERVAL '6 months') AT TIME ZONE 'UTC',
    'ACTIVE',
    i.id,
    0,
    f.created_at,
    f.updated_at
FROM (
    SELECT DISTINCT ON (tenant_id, prescription_reference)
        tenant_id,
        customer_id,
        doctor_id,
        prescription_reference,
        created_at,
        updated_at
    FROM sales_prescription_fulfillment
    ORDER BY tenant_id, prescription_reference, created_at ASC
) f
JOIN LATERAL (
    SELECT si.id, si.branch_id
    FROM sales_invoice si
    WHERE si.tenant_id = f.tenant_id
      AND si.prescription_reference = f.prescription_reference
      AND si.status = 'COMPLETED'
    ORDER BY si.completed_at ASC NULLS LAST
    LIMIT 1
) i ON TRUE;
