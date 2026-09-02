-- Local-only seed. Never run against RDS / production.
-- Password for both users is: password
-- BCrypt cost 10, matches SecurityConfig.

INSERT INTO tenant (id, name, slug, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Varshmaan Pharmacy',
    'varshmaan-pharmacy',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_user (
    id,
    tenant_id,
    email,
    password_hash,
    display_name,
    role,
    active,
    status,
    created_at,
    updated_at
)
VALUES
    (
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        '11111111-1111-1111-1111-111111111111',
        'varshmaan.sonkar@gmail.com',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Varshmaan',
        'pharmacy_owner',
        TRUE,
        'ACTIVE',
        NOW(),
        NOW()
    ),
    (
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NULL,
        'sanskarkumar85111@gmail.com',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Sanskar',
        'admin_super',
        TRUE,
        'ACTIVE',
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    active = TRUE,
    status = 'ACTIVE',
    deleted_at = NULL,
    updated_at = NOW();
