CREATE TABLE transactional_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    tenant_id UUID REFERENCES tenant(id),
    template_key VARCHAR(32) NOT NULL
        CHECK (template_key IN ('PASSWORD_RESET', 'ONBOARDING', 'INVOICE_COPY')),
    recipient_normalized VARCHAR(320) NOT NULL,
    provider_message_id VARCHAR(64),
    status VARCHAR(24) NOT NULL
        CHECK (status IN ('QUEUED', 'SENT', 'TRANSIENT_FAILURE', 'PERMANENT_FAILURE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactional_email_tenant ON transactional_email (tenant_id)
    WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX idx_transactional_email_provider_message
    ON transactional_email (provider_message_id)
    WHERE provider_message_id IS NOT NULL;
