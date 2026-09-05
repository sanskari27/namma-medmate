-- M8-S01 categorized expense tracking
CREATE TABLE expense_category (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenant (id),
    code VARCHAR(32) NOT NULL,
    label VARCHAR(80) NOT NULL,
    system BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX uq_expense_category_code
    ON expense_category (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'), code);

CREATE INDEX idx_expense_category_tenant
    ON expense_category (tenant_id);

INSERT INTO expense_category (id, tenant_id, code, label, system, created_at)
VALUES
    ('51000000-0000-0000-0000-000000000001', NULL, 'RENT', 'Rent', TRUE, TIMESTAMPTZ '2026-09-06 00:00:00+00'),
    ('51000000-0000-0000-0000-000000000002', NULL, 'ELECTRICITY', 'Electricity', TRUE, TIMESTAMPTZ '2026-09-06 00:00:00+00'),
    ('51000000-0000-0000-0000-000000000003', NULL, 'SALARIES', 'Salaries', TRUE, TIMESTAMPTZ '2026-09-06 00:00:00+00'),
    ('51000000-0000-0000-0000-000000000004', NULL, 'MISCELLANEOUS', 'Miscellaneous', TRUE, TIMESTAMPTZ '2026-09-06 00:00:00+00');

CREATE TABLE expense (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    branch_id UUID NOT NULL REFERENCES location (id),
    category_id UUID NOT NULL REFERENCES expense_category (id),
    category_code VARCHAR(32) NOT NULL,
    category_label VARCHAR(80) NOT NULL,
    amount_paise BIGINT NOT NULL,
    occurred_on DATE NOT NULL,
    notes VARCHAR(500),
    current_evidence_id UUID,
    idempotency_key VARCHAR(128),
    version INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_expense_amount_positive CHECK (amount_paise > 0)
);

CREATE UNIQUE INDEX uq_expense_idempotency
    ON expense (tenant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_expense_tenant_branch_occurred
    ON expense (tenant_id, branch_id, occurred_on DESC);

CREATE INDEX idx_expense_tenant_category
    ON expense (tenant_id, category_id);

CREATE TABLE expense_evidence (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    expense_id UUID NOT NULL REFERENCES expense (id),
    storage_key VARCHAR(512) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES app_user (id),
    uploaded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_expense_evidence_expense
    ON expense_evidence (tenant_id, expense_id, uploaded_at);

ALTER TABLE expense
    ADD CONSTRAINT fk_expense_current_evidence
        FOREIGN KEY (current_evidence_id) REFERENCES expense_evidence (id);
