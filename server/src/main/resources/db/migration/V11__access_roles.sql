CREATE TABLE access_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenant(id),
    scope VARCHAR(16) NOT NULL CHECK (scope IN ('TENANT', 'PLATFORM')),
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('PREDEFINED', 'CUSTOM')),
    code VARCHAR(64),
    name VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT access_role_predefined_code
        CHECK (kind <> 'PREDEFINED' OR code IS NOT NULL),
    CONSTRAINT access_role_custom_tenant
        CHECK (
            kind <> 'CUSTOM'
            OR (scope = 'TENANT' AND tenant_id IS NOT NULL)
            OR (scope = 'PLATFORM' AND tenant_id IS NULL)
        ),
    CONSTRAINT access_role_predefined_global
        CHECK (kind <> 'PREDEFINED' OR tenant_id IS NULL)
);

CREATE UNIQUE INDEX idx_access_role_code
    ON access_role (code)
    WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX idx_access_role_tenant_custom_name
    ON access_role (tenant_id, lower(name))
    WHERE deleted_at IS NULL AND kind = 'CUSTOM' AND tenant_id IS NOT NULL;

CREATE UNIQUE INDEX idx_access_role_platform_custom_name
    ON access_role (lower(name))
    WHERE deleted_at IS NULL
      AND kind = 'CUSTOM'
      AND tenant_id IS NULL
      AND scope = 'PLATFORM';

CREATE INDEX idx_access_role_tenant
    ON access_role (tenant_id)
    WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE access_role_module (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES access_role(id) ON DELETE CASCADE,
    module_code VARCHAR(32) NOT NULL,
    UNIQUE (role_id, module_code)
);

CREATE TABLE user_access_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id),
    role_id UUID NOT NULL REFERENCES access_role(id),
    tenant_id UUID REFERENCES tenant(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_access_role_tenant
    ON user_access_role (tenant_id)
    WHERE tenant_id IS NOT NULL;

CREATE INDEX idx_user_access_role_user ON user_access_role (user_id);

CREATE TABLE access_role_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES app_user(id),
    action VARCHAR(16) NOT NULL
        CHECK (action IN ('CREATED', 'UPDATED', 'DEACTIVATED', 'ASSIGNED', 'UNASSIGNED')),
    role_id UUID REFERENCES access_role(id),
    target_user_id UUID REFERENCES app_user(id),
    tenant_id UUID REFERENCES tenant(id),
    modules_snapshot VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO access_role (id, tenant_id, scope, kind, code, name, version, created_at, updated_at)
VALUES
    ('11111111-1111-1111-1111-000000000001', NULL, 'TENANT', 'PREDEFINED', 'pharmacist', 'Pharmacist', 1, NOW(), NOW()),
    ('11111111-1111-1111-1111-000000000002', NULL, 'TENANT', 'PREDEFINED', 'cashier', 'Cashier', 1, NOW(), NOW()),
    ('11111111-1111-1111-1111-000000000003', NULL, 'TENANT', 'PREDEFINED', 'inventory', 'Inventory', 1, NOW(), NOW()),
    ('11111111-1111-1111-1111-000000000004', NULL, 'TENANT', 'PREDEFINED', 'accountant', 'Accountant', 1, NOW(), NOW()),
    ('22222222-2222-2222-2222-000000000001', NULL, 'PLATFORM', 'PREDEFINED', 'verification_agent', 'Verification Agent', 1, NOW(), NOW()),
    ('22222222-2222-2222-2222-000000000002', NULL, 'PLATFORM', 'PREDEFINED', 'support', 'Support', 1, NOW(), NOW()),
    ('22222222-2222-2222-2222-000000000003', NULL, 'PLATFORM', 'PREDEFINED', 'platform_accountant', 'Platform accountant', 1, NOW(), NOW());

INSERT INTO access_role_module (id, role_id, module_code)
VALUES
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000001', 'SALES'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000001', 'INVENTORY'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000001', 'CRM'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000002', 'SALES'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000002', 'CRM'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000003', 'INVENTORY'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000003', 'PROCUREMENT'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000004', 'FINANCE'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000004', 'REPORTING'),
    (gen_random_uuid(), '11111111-1111-1111-1111-000000000004', 'CRM'),
    (gen_random_uuid(), '22222222-2222-2222-2222-000000000001', 'STAFF_VERIFICATION'),
    (gen_random_uuid(), '22222222-2222-2222-2222-000000000001', 'TENANT_KYC'),
    (gen_random_uuid(), '22222222-2222-2222-2222-000000000002', 'SUPPORT'),
    (gen_random_uuid(), '22222222-2222-2222-2222-000000000003', 'PLATFORM_FINANCE'),
    (gen_random_uuid(), '22222222-2222-2222-2222-000000000003', 'SUBSCRIPTIONS');
