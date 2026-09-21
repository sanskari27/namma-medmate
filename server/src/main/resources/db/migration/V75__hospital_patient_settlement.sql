-- M13-S09: active-patient settlement and discharge

ALTER TABLE hospital_admission
    ADD COLUMN discharged_at TIMESTAMPTZ;

CREATE TABLE hospital_patient_settlement (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    admission_id UUID REFERENCES hospital_admission(id),
    uhid VARCHAR(32) NOT NULL,
    payment_mode VARCHAR(16) NOT NULL,
    amount_paise BIGINT NOT NULL,
    insurer_name VARCHAR(200),
    policy_number VARCHAR(64),
    idempotency_key VARCHAR(128) NOT NULL,
    created_by UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_hospital_patient_settlement_mode
        CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'INSURANCE_TPA')),
    CONSTRAINT chk_hospital_patient_settlement_amount CHECK (amount_paise > 0)
);

CREATE UNIQUE INDEX uq_hospital_patient_settlement_tenant_idempotency
    ON hospital_patient_settlement (tenant_id, idempotency_key);

CREATE INDEX idx_hospital_patient_settlement_stay
    ON hospital_patient_settlement (tenant_id, branch_id, admission_id, uhid);

CREATE INDEX idx_sales_invoice_hospital_unpaid
    ON sales_invoice (tenant_id, branch_id, sale_source, status, amount_due_paise)
    WHERE amount_due_paise > 0;

CREATE INDEX idx_sales_invoice_hospital_admission
    ON sales_invoice (tenant_id, branch_id, admission_id)
    WHERE admission_id IS NOT NULL;

CREATE INDEX idx_sales_invoice_hospital_uhid
    ON sales_invoice (tenant_id, branch_id, lower(uhid))
    WHERE uhid IS NOT NULL;
