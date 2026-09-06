CREATE TABLE whatsapp_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    kind VARCHAR(16) NOT NULL
        CHECK (kind IN ('REFILL_DUE', 'CREDIT_DUE', 'CAMPAIGN')),
    source_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer (id),
    campaign_id UUID REFERENCES campaign (id),
    template_unique_name VARCHAR(64) NOT NULL,
    namespace_name VARCHAR(128) NOT NULL,
    phone VARCHAR(16) NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    preview TEXT NOT NULL,
    status VARCHAR(16) NOT NULL
        CHECK (status IN ('QUEUED', 'SENT', 'FAILED')),
    provider_message_id VARCHAR(128),
    failure_code VARCHAR(64),
    idempotency_key VARCHAR(160) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX idx_whatsapp_message_tenant_created
    ON whatsapp_message (tenant_id, created_at DESC);

CREATE INDEX idx_whatsapp_message_tenant_kind
    ON whatsapp_message (tenant_id, kind);

CREATE INDEX idx_whatsapp_message_campaign
    ON whatsapp_message (tenant_id, campaign_id)
    WHERE campaign_id IS NOT NULL;
