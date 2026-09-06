-- M3-S07: tag-based campaign drafts, preview counts, frozen READY_FOR_DELIVERY audience

CREATE TABLE campaign (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    name VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL
        CHECK (status IN ('DRAFT', 'READY_FOR_DELIVERY')),
    tag_ids JSONB NOT NULL,
    template_unique_name VARCHAR(64) NOT NULL,
    template_namespace_name VARCHAR(128) NOT NULL,
    template_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    previewed_at TIMESTAMPTZ,
    preview_recipient_count INT,
    frozen_at TIMESTAMPTZ,
    frozen_recipient_count INT,
    version INT NOT NULL DEFAULT 1,
    created_by_user_id UUID REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_campaign_tenant ON campaign (tenant_id, created_at DESC);

CREATE TABLE campaign_recipient (
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    campaign_id UUID NOT NULL REFERENCES campaign (id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer (id),
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, campaign_id, customer_id)
);

CREATE INDEX idx_campaign_recipient_campaign
    ON campaign_recipient (tenant_id, campaign_id);
