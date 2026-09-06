-- Local-only: PRO plan, outlets, extra staff, PIN, approved KYC for Varshmaan.

UPDATE tenant_subscription
SET plan_code = 'PRO',
    status = 'ACTIVE',
    expires_at = NULL,
    updated_at = NOW()
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

UPDATE app_user
SET pin_hash = '$2b$10$04G76DicePls3.FxdyIcQOjxG.xOP4/2vdo8ZwTh1l4yctd.li//W',
    updated_at = NOW()
WHERE email IN (
    'varshmaan.sonkar@gmail.com',
    'counter.staff@varshmaan.local',
    'sanskarkumar85111@gmail.com',
    'verify.agent@nammamedmate.local'
);

INSERT INTO app_user (
    id, tenant_id, email, password_hash, display_name, role, active, status,
    created_by, must_change_password, pin_hash, created_at, updated_at, password_changed_at
)
VALUES
    (
        'c0a1e5c0-1111-4000-8000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        'pharmacist@varshmaan.local',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Priya Pharmacist',
        'pharmacy_staff',
        TRUE,
        'ACTIVE',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        FALSE,
        '$2b$10$04G76DicePls3.FxdyIcQOjxG.xOP4/2vdo8ZwTh1l4yctd.li//W',
        NOW(),
        NOW(),
        NOW()
    ),
    (
        'c0a1e5c0-1111-4000-8000-000000000003',
        '11111111-1111-1111-1111-111111111111',
        'inventory@varshmaan.local',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Imran Stores',
        'pharmacy_staff',
        TRUE,
        'ACTIVE',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        FALSE,
        '$2b$10$04G76DicePls3.FxdyIcQOjxG.xOP4/2vdo8ZwTh1l4yctd.li//W',
        NOW(),
        NOW(),
        NOW()
    ),
    (
        'c0a1e5c0-1111-4000-8000-000000000004',
        '11111111-1111-1111-1111-111111111111',
        'accountant@varshmaan.local',
        '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
        'Ananya Accounts',
        'pharmacy_staff',
        TRUE,
        'ACTIVE',
        'f70713e0-0e91-4bc3-a287-47ca3b819a25',
        FALSE,
        '$2b$10$04G76DicePls3.FxdyIcQOjxG.xOP4/2vdo8ZwTh1l4yctd.li//W',
        NOW(),
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
    must_change_password = FALSE,
    pin_hash = EXCLUDED.pin_hash,
    deleted_at = NULL,
    updated_at = NOW();

INSERT INTO staff_registration (
    id, tenant_id, user_id, kind, license_number, evidence_reference, status,
    reviewed_by, reviewed_at, created_at
)
VALUES (
    'c0a1e5c0-1111-4000-8000-0000000000b2',
    '11111111-1111-1111-1111-111111111111',
    'c0a1e5c0-1111-4000-8000-000000000002',
    'PHARMACIST',
    'KA-PCI-20418',
    'local-demo/pharmacist-license.pdf',
    'APPROVED',
    'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '45 days'
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_access_role (id, user_id, role_id, tenant_id, created_at)
VALUES
    (
        'c0a1e5c0-1111-4000-8000-0000000000ab',
        'c0a1e5c0-1111-4000-8000-000000000002',
        '11111111-1111-1111-1111-000000000001',
        '11111111-1111-1111-1111-111111111111',
        NOW()
    ),
    (
        'c0a1e5c0-1111-4000-8000-0000000000ac',
        'c0a1e5c0-1111-4000-8000-000000000003',
        '11111111-1111-1111-1111-000000000003',
        '11111111-1111-1111-1111-111111111111',
        NOW()
    ),
    (
        'c0a1e5c0-1111-4000-8000-0000000000ad',
        'c0a1e5c0-1111-4000-8000-000000000004',
        '11111111-1111-1111-1111-000000000004',
        '11111111-1111-1111-1111-111111111111',
        NOW()
    )
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO kyc_submission (
    id, tenant_id, legal_name, drug_license_number, pan, gstin,
    address_line1, city, state, pincode, contact_phone, status,
    submitted_by, submitted_at, reviewed_by, reviewed_at, version, created_at, updated_at
)
VALUES (
    local_demo_uuid('kyc', 1),
    '11111111-1111-1111-1111-111111111111',
    'Varshmaan Pharmacy Private Limited',
    'KA-DL20-B-12345',
    'AABCV1111A',
    '29AABCV1111A1Z5',
    '14 100 Feet Road, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    '9876500001',
    'APPROVED',
    'f70713e0-0e91-4bc3-a287-47ca3b819a25',
    NOW() - INTERVAL '60 days',
    'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
    NOW() - INTERVAL '58 days',
    1,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '58 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO kyc_document (
    id, tenant_id, submission_id, doc_type, content_type, byte_size,
    storage_key, original_filename, created_at
)
VALUES
    (
        local_demo_uuid('kyc-doc', 1),
        '11111111-1111-1111-1111-111111111111',
        local_demo_uuid('kyc', 1),
        'DRUG_LICENSE',
        'application/pdf',
        2048,
        'local-demo/varshmaan-drug-license.pdf',
        'drug-license.pdf',
        NOW() - INTERVAL '60 days'
    ),
    (
        local_demo_uuid('kyc-doc', 2),
        '11111111-1111-1111-1111-111111111111',
        local_demo_uuid('kyc', 1),
        'PAN',
        'application/pdf',
        1024,
        'local-demo/varshmaan-pan.pdf',
        'pan.pdf',
        NOW() - INTERVAL '60 days'
    ),
    (
        local_demo_uuid('kyc-doc', 3),
        '11111111-1111-1111-1111-111111111111',
        local_demo_uuid('kyc', 1),
        'GST_CERTIFICATE',
        'application/pdf',
        1536,
        'local-demo/varshmaan-gst.pdf',
        'gstin.pdf',
        NOW() - INTERVAL '60 days'
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO location (
    id, tenant_id, name, address_line, city, state, pincode, branch_code,
    contact_phone, contact_email, drug_license_number, gstin, operating_hours,
    branch_type, status, opening_date, is_default, linked_warehouse,
    pricing_settings, tax_settings, inventory_settings, created_at, updated_at
)
SELECT
    'b1111111-1111-4000-8000-000000000001',
    c.tenant_id,
    'Indiranagar',
    '14 100 Feet Road',
    'Bengaluru',
    'Karnataka',
    '560038',
    'BR01',
    '9876500001',
    'indiranagar@varshmaan.local',
    'KA-DL20-B-12345',
    '29AABCV1111A1Z5',
    '{"mon":{"open":"09:00","close":"21:30"},"tue":{"open":"09:00","close":"21:30"},"wed":{"open":"09:00","close":"21:30"},"thu":{"open":"09:00","close":"21:30"},"fri":{"open":"09:00","close":"21:30"},"sat":{"open":"09:00","close":"21:30"},"sun":{"open":"10:00","close":"14:00"}}'::jsonb,
    'RETAIL',
    'ACTIVE',
    DATE '2024-04-01',
    NOT EXISTS (
        SELECT 1
        FROM location l
        WHERE l.tenant_id = c.tenant_id
          AND l.deleted_at IS NULL
          AND l.is_default
          AND l.status = 'ACTIVE'
    ),
    FALSE,
    '{"defaultMarkupBps":0}'::jsonb,
    '{"gstMode":"CGST_SGST","taxState":"KA"}'::jsonb,
    '{"expiryWarnDays":30}'::jsonb,
    NOW() - INTERVAL '400 days',
    NOW()
FROM demo_ctx c
WHERE NOT EXISTS (
    SELECT 1 FROM location l
    WHERE l.tenant_id = c.tenant_id AND l.branch_code = 'BR01' AND l.deleted_at IS NULL
);

INSERT INTO location (
    id, tenant_id, name, address_line, city, state, pincode, branch_code,
    contact_phone, contact_email, drug_license_number, gstin, operating_hours,
    branch_type, status, opening_date, is_default, linked_warehouse,
    pricing_settings, tax_settings, inventory_settings, created_at, updated_at
)
SELECT
    'b1111111-1111-4000-8000-000000000002',
    c.tenant_id,
    'Koramangala',
    '42 80 Feet Road',
    'Bengaluru',
    'Karnataka',
    '560034',
    'BR02',
    '9876500002',
    'koramangala@varshmaan.local',
    'KA-DL20-B-12346',
    '29AABCV1111A1Z5',
    '{"mon":{"open":"09:00","close":"21:00"},"tue":{"open":"09:00","close":"21:00"},"wed":{"open":"09:00","close":"21:00"},"thu":{"open":"09:00","close":"21:00"},"fri":{"open":"09:00","close":"21:00"},"sat":{"open":"09:00","close":"21:00"},"sun":{"open":"10:00","close":"13:00"}}'::jsonb,
    'RETAIL',
    'ACTIVE',
    DATE '2025-06-01',
    FALSE,
    FALSE,
    '{"defaultMarkupBps":0}'::jsonb,
    '{"gstMode":"CGST_SGST","taxState":"KA"}'::jsonb,
    '{"expiryWarnDays":30}'::jsonb,
    NOW() - INTERVAL '200 days',
    NOW()
FROM demo_ctx c
WHERE NOT EXISTS (
    SELECT 1 FROM location l
    WHERE l.tenant_id = c.tenant_id AND l.branch_code = 'BR02' AND l.deleted_at IS NULL
);

INSERT INTO location (
    id, tenant_id, name, address_line, city, state, pincode, branch_code,
    contact_phone, contact_email, drug_license_number, gstin, operating_hours,
    branch_type, status, opening_date, is_default, linked_warehouse,
    pricing_settings, tax_settings, inventory_settings, created_at, updated_at
)
SELECT
    'b1111111-1111-4000-8000-000000000003',
    c.tenant_id,
    'Kiosk — Indiranagar lobby',
    '14 100 Feet Road, lobby',
    'Bengaluru',
    'Karnataka',
    '560038',
    'BR03',
    '9876500001',
    'kiosk@varshmaan.local',
    'KA-DL20-B-12345',
    '29AABCV1111A1Z5',
    '{"mon":{"open":"09:00","close":"21:00"}}'::jsonb,
    'KIOSK',
    'ACTIVE',
    DATE '2026-01-15',
    FALSE,
    FALSE,
    '{"defaultMarkupBps":0}'::jsonb,
    '{"gstMode":"CGST_SGST","taxState":"KA"}'::jsonb,
    '{"expiryWarnDays":30}'::jsonb,
    NOW() - INTERVAL '90 days',
    NOW()
FROM demo_ctx c
WHERE NOT EXISTS (
    SELECT 1 FROM location l
    WHERE l.tenant_id = c.tenant_id AND l.branch_code = 'BR03' AND l.deleted_at IS NULL
);

UPDATE demo_ctx d
SET
    br01 = (
        SELECT l.id FROM location l
        WHERE l.tenant_id = d.tenant_id AND l.branch_code = 'BR01' AND l.deleted_at IS NULL
        LIMIT 1
    ),
    br02 = (
        SELECT l.id FROM location l
        WHERE l.tenant_id = d.tenant_id AND l.branch_code = 'BR02' AND l.deleted_at IS NULL
        LIMIT 1
    ),
    br03 = (
        SELECT l.id FROM location l
        WHERE l.tenant_id = d.tenant_id AND l.branch_code = 'BR03' AND l.deleted_at IS NULL
        LIMIT 1
    );

UPDATE location l
SET branch_type = 'RETAIL',
    name = CASE WHEN l.name IN ('Drug Store 1', 'Main', 'Main counter') THEN 'Indiranagar' ELSE l.name END,
    gstin = COALESCE(NULLIF(btrim(l.gstin), ''), '29AABCV1111A1Z5'),
    updated_at = NOW()
FROM demo_ctx d
WHERE l.id = d.br01
  AND l.branch_type = 'KIOSK';

UPDATE location l
SET branch_type = 'RETAIL',
    gstin = COALESCE(NULLIF(btrim(l.gstin), ''), '29AABCV1111A1Z5'),
    updated_at = NOW()
FROM demo_ctx d
WHERE l.id = d.br02
  AND l.branch_type = 'KIOSK';

INSERT INTO user_branch (id, tenant_id, user_id, branch_id, created_at)
SELECT local_demo_uuid('user-branch', u.n * 10 + b.ord), d.tenant_id, u.user_id, b.branch_id, NOW()
FROM demo_ctx d
CROSS JOIN (VALUES
    (1, 'c0a1e5c0-1111-4000-8000-000000000001'::uuid),
    (2, 'c0a1e5c0-1111-4000-8000-000000000002'::uuid),
    (3, 'c0a1e5c0-1111-4000-8000-000000000003'::uuid),
    (4, 'c0a1e5c0-1111-4000-8000-000000000004'::uuid)
) AS u(n, user_id)
CROSS JOIN LATERAL (
    SELECT 1 AS ord, d.br01 AS branch_id
    UNION ALL
    SELECT 2, d.br02
    WHERE u.user_id <> 'c0a1e5c0-1111-4000-8000-000000000001'::uuid
) AS b
WHERE b.branch_id IS NOT NULL
ON CONFLICT (tenant_id, user_id, branch_id) DO NOTHING;

INSERT INTO approval_rule (
    id, tenant_id, scope, module_code, action_key, threshold_value,
    approver_type, approver_account_class, allow_self_approval, version,
    created_by, created_at, updated_at
)
SELECT
    local_demo_uuid('approval-rule', 1),
    '11111111-1111-1111-1111-111111111111',
    'TENANT',
    'INVENTORY',
    'INVENTORY_WRITE_OFF',
    0,
    'ACCOUNT_CLASS',
    'pharmacy_owner',
    TRUE,
    1,
    'f70713e0-0e91-4bc3-a287-47ca3b819a25',
    NOW() - INTERVAL '50 days',
    NOW() - INTERVAL '50 days'
WHERE NOT EXISTS (
    SELECT 1
    FROM approval_rule r
    WHERE r.tenant_id = '11111111-1111-1111-1111-111111111111'
      AND r.module_code = 'INVENTORY'
      AND r.action_key = 'INVENTORY_WRITE_OFF'
      AND r.deleted_at IS NULL
)
ON CONFLICT (id) DO NOTHING;
