-- Local-only seed. Never run against RDS / production.
-- Password for both users is: password
-- BCrypt cost 10, matches SecurityConfig.

INSERT INTO tenant (id, name, slug, status, email_verified_at, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Varshmaan Pharmacy',
    'varshmaan-pharmacy',
    'ACTIVE',
    NOW(),
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

-- Pharmacy staff created by the OWNER (M1-S03 admin-reset / must-change checks).
INSERT INTO app_user (
    id,
    tenant_id,
    email,
    password_hash,
    display_name,
    role,
    active,
    status,
    created_by,
    created_at,
    updated_at
)
VALUES
    (
        'c0a1e5c0-1111-4000-8000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        'counter.staff@varshmaan.local',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Counter staff',
        'pharmacy_staff',
        TRUE,
        'ACTIVE',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    created_by = EXCLUDED.created_by,
    active = TRUE,
    status = 'ACTIVE',
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO user_access_role (id, user_id, role_id, tenant_id, created_at)
VALUES (
    'c0a1e5c0-1111-4000-8000-0000000000aa',
    'c0a1e5c0-1111-4000-8000-000000000001',
    '11111111-1111-1111-1111-000000000002',
    '11111111-1111-1111-1111-111111111111',
    NOW()
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verification Agent created by MASTER (M1-S04 HQ queue / operator checks).
INSERT INTO app_user (
    id,
    tenant_id,
    email,
    password_hash,
    display_name,
    phone,
    role,
    active,
    status,
    created_by,
    created_at,
    updated_at
)
VALUES
    (
        'a2b3c4d5-2222-4000-8000-0000000000aa',
        NULL,
        'verify.agent@nammamedmate.local',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Meera',
        '9000000001',
        'admin_verification',
        TRUE,
        'ACTIVE',
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    created_by = EXCLUDED.created_by,
    active = TRUE,
    status = 'ACTIVE',
    deleted_at = NULL,
    updated_at = NOW();

-- Inbox fixtures for local browser checks (M10-S01). Harmless on re-run.
INSERT INTO notification_source (id, tenant_id, branch_id, href, deleted_at, access_revoked_at, created_at)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        '/inventory',
        NULL,
        NULL,
        NOW()
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        '/inventory',
        NOW(),
        NULL,
        NOW()
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        '/inventory',
        NULL,
        NOW(),
        NOW()
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        NULL,
        NULL,
        '/kyc',
        NULL,
        NULL,
        NOW()
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        NULL,
        NULL,
        '/kyc',
        NOW(),
        NULL,
        NOW()
    ),
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        '/credit',
        NULL,
        NULL,
        NOW()
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
        NULL,
        NULL,
        '/subscriptions',
        NULL,
        NULL,
        NOW()
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
        NULL,
        NULL,
        '/pharmacies',
        NULL,
        NULL,
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification (
    id,
    recipient_user_id,
    tenant_id,
    branch_id,
    title,
    body,
    source_type,
    source_id,
    href,
    read_at,
    created_at
)
VALUES
    (
        'cccccccc-cccc-cccc-cccc-ccccccccccc1',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'Paracetamol 500mg is below reorder',
        'Shelf A has 4 strips left. Open inventory to indent.',
        'low_stock',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '/inventory',
        NULL,
        NOW() - INTERVAL '20 minutes'
    ),
    (
        'cccccccc-cccc-cccc-cccc-ccccccccccc2',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'Yesterday’s expiry walk is done',
        'Rack B was cleared at close.',
        'stock_item',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        '/inventory',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'cccccccc-cccc-cccc-cccc-ccccccccccc3',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'Old batch card was removed',
        'This stock record is no longer on the floor.',
        'stock_item',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
        '/inventory',
        NULL,
        NOW() - INTERVAL '2 hours'
    ),
    (
        'cccccccc-cccc-cccc-cccc-ccccccccccc4',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'Write-off is with another counter',
        'You no longer have access to this record.',
        'stock_item',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
        '/inventory',
        NULL,
        NOW() - INTERVAL '3 hours'
    ),
    (
        'dddddddd-dddd-dddd-dddd-ddddddddddd1',
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NULL,
        NULL,
        'KYC pack waiting on Varshmaan Pharmacy',
        'Open the tenant file before the SLA clock.',
        'kyc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        '/kyc',
        NULL,
        NOW() - INTERVAL '15 minutes'
    ),
    (
        'dddddddd-dddd-dddd-dddd-ddddddddddd2',
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NULL,
        NULL,
        'Yesterday’s KYC pass was filed',
        'Tenant pulse already reflects the approval.',
        'kyc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        '/kyc',
        NOW() - INTERVAL '18 hours',
        NOW() - INTERVAL '18 hours'
    ),
    (
        'dddddddd-dddd-dddd-dddd-ddddddddddd3',
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NULL,
        NULL,
        'Withdrawn KYC pack',
        'The tenant withdrew this submission.',
        'kyc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        '/kyc',
        NULL,
        NOW() - INTERVAL '4 hours'
    ),
    (
        'cccccccc-cccc-cccc-cccc-ccccccccccc5',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'Customer credit due',
        'A khata balance is due. Open credit to follow up.',
        'credit_due',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
        '/credit',
        NULL,
        NOW() - INTERVAL '8 minutes'
    ),
    (
        'dddddddd-dddd-dddd-dddd-ddddddddddd4',
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NULL,
        NULL,
        'Subscription expiring',
        'A tenant plan is nearing expiry. Open subscriptions.',
        'subscription_expiry',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
        '/subscriptions',
        NULL,
        NOW() - INTERVAL '6 minutes'
    ),
    (
        'dddddddd-dddd-dddd-dddd-ddddddddddd5',
        'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
        NULL,
        NULL,
        'License expiring',
        'A tenant or branch license is nearing expiry. Open the pharmacy file.',
        'license_expiry',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
        '/pharmacies',
        NULL,
        NOW() - INTERVAL '12 minutes'
    )
ON CONFLICT (id) DO NOTHING;
