CREATE TABLE whatsapp_approved_structure (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_name VARCHAR(64) NOT NULL UNIQUE,
    body TEXT NOT NULL,
    tenant_slots JSONB NOT NULL,
    runtime_slots JSONB NOT NULL,
    meta_template_id VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL
        CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_tenant_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant (id),
    unique_name VARCHAR(64) NOT NULL
        REFERENCES whatsapp_approved_structure (unique_name),
    namespace_name VARCHAR(128) NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, unique_name),
    UNIQUE (namespace_name)
);

CREATE INDEX idx_whatsapp_tenant_template_tenant
    ON whatsapp_tenant_template (tenant_id);

CREATE TABLE whatsapp_provider_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_number VARCHAR(32) NOT NULL,
    phone_number_id VARCHAR(64) NOT NULL,
    health VARCHAR(24) NOT NULL
        CHECK (health IN ('UP', 'UNAVAILABLE', 'NOT_CONFIGURED')),
    synced_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO whatsapp_approved_structure (
    unique_name, body, tenant_slots, runtime_slots, meta_template_id, status
) VALUES
    (
        'refill_due',
        'Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock.',
        '["pharmacy_name"]'::jsonb,
        '["customer_name","medicine_name"]'::jsonb,
        'meta-refill-due',
        'APPROVED'
    ),
    (
        'refill_due_warm',
        'Hello {{customer_name}}, it is time to refill {{medicine_name}} at {{pharmacy_name}}.',
        '["pharmacy_name"]'::jsonb,
        '["customer_name","medicine_name"]'::jsonb,
        'meta-refill-due-warm',
        'APPROVED'
    ),
    (
        'credit_due',
        'Hi {{customer_name}}, your khata at {{pharmacy_name}} has an amount due.',
        '["pharmacy_name"]'::jsonb,
        '["customer_name"]'::jsonb,
        'meta-credit-due',
        'APPROVED'
    ),
    (
        'campaign',
        'Hi {{customer_name}}, {{pharmacy_name}} has an update for you.',
        '["pharmacy_name"]'::jsonb,
        '["customer_name"]'::jsonb,
        'meta-campaign',
        'APPROVED'
    ),
    (
        'birthday',
        'Happy birthday {{customer_name}} from {{pharmacy_name}}.',
        '["pharmacy_name"]'::jsonb,
        '["customer_name"]'::jsonb,
        'meta-birthday',
        'APPROVED'
    );
