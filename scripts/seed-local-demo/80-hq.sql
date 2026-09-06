-- Local-only HQ pharmacies so admin queues are lists, not empty states.

INSERT INTO tenant (id, name, slug, status, email_verified_at, created_at, updated_at)
SELECT
    local_demo_uuid('hq-tenant', n),
    (ARRAY[
        'Pending Chemist Jayanagar','Koramangala Meds (KYC)','Whitefield Wellness (KYC)',
        'Malleshwaram Drugs (KYC)','HSR Layout Pharmacy','BTM LifeCare','Indiranagar Rx Starter',
        'Hebbal Growth Meds','Suspended Peenya Store','Expired Yelahanka Chemist','Pro JP Nagar Hub'
    ])[n],
    'demo-hq-' || n::text,
    CASE
        WHEN n <= 4 THEN 'VERIFICATION_REQUIRED'
        WHEN n = 9 THEN 'SUSPENDED'
        WHEN n = 10 THEN 'EXPIRED'
        ELSE 'ACTIVE'
    END,
    CASE WHEN n <= 4 THEN NULL ELSE NOW() - INTERVAL '20 days' END,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days'
FROM generate_series(1, 11) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_subscription (
    id, tenant_id, plan_code, status, started_at, expires_at, created_at, updated_at
)
SELECT
    local_demo_uuid('hq-sub', n),
    local_demo_uuid('hq-tenant', n),
    CASE
        WHEN n IN (7, 10) THEN 'STARTER'
        WHEN n IN (8, 9) THEN 'GROWTH'
        WHEN n = 11 THEN 'PRO'
        ELSE 'FREE'
    END,
    CASE WHEN n = 10 THEN 'EXPIRED' ELSE 'ACTIVE' END,
    NOW() - INTERVAL '30 days',
    CASE WHEN n = 10 THEN NOW() - INTERVAL '5 days' ELSE NULL END,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '5 days'
FROM generate_series(1, 11) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_user (
    id, tenant_id, email, password_hash, display_name, role, active, status,
    must_change_password, created_at, updated_at, password_changed_at
)
SELECT
    local_demo_uuid('hq-owner', n),
    local_demo_uuid('hq-tenant', n),
    'owner.hq' || n::text || '@nammamedmate.local',
    '$2b$10$0WiQ0dLgQjP1unelVIhZfON/kH4KS7euUC8KLMmIt1J5RDgxhTAd2',
    'HQ Owner ' || n::text,
    'pharmacy_owner',
    TRUE,
    'ACTIVE',
    FALSE,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '40 days'
FROM generate_series(1, 11) AS n
ON CONFLICT (email) DO NOTHING;

INSERT INTO kyc_submission (
    id, tenant_id, legal_name, drug_license_number, pan, gstin,
    address_line1, city, state, pincode, contact_phone, status,
    submitted_by, submitted_at, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hq-kyc', n),
    local_demo_uuid('hq-tenant', n),
    (SELECT name FROM tenant WHERE id = local_demo_uuid('hq-tenant', n)),
    'KA-DL-HQ-' || lpad(n::text, 4, '0'),
    'AABCH' || lpad(n::text, 4, '0') || 'A',
    '29AABCH' || lpad(n::text, 4, '0') || 'A1Z' || (n % 10)::text,
    n::text || ' Demo Street',
    'Bengaluru',
    'Karnataka',
    '5600' || lpad(n::text, 2, '0'),
    '99110' || lpad(n::text, 5, '0'),
    'SUBMITTED',
    local_demo_uuid('hq-owner', n),
    NOW() - (n || ' days')::interval,
    0,
    NOW() - (n || ' days')::interval,
    NOW() - (n || ' days')::interval
FROM generate_series(1, 4) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO kyc_document (
    id, tenant_id, submission_id, doc_type, content_type, byte_size,
    storage_key, original_filename, created_at
)
SELECT
    local_demo_uuid('hq-kyc-doc', n * 10 + k),
    local_demo_uuid('hq-tenant', n),
    local_demo_uuid('hq-kyc', n),
    (ARRAY['DRUG_LICENSE','PAN','GST_CERTIFICATE'])[k],
    'application/pdf',
    1024,
    'local-demo/hq-' || n::text || '-' || k::text || '.pdf',
    'evidence-' || k::text || '.pdf',
    NOW() - INTERVAL '2 days'
FROM generate_series(1, 4) AS n
CROSS JOIN generate_series(1, 3) AS k
ON CONFLICT (id) DO NOTHING;

INSERT INTO location (
    id, tenant_id, name, address_line, city, state, pincode, branch_code,
    contact_phone, drug_license_number, gstin, operating_hours, branch_type, status,
    opening_date, is_default, linked_warehouse, pricing_settings, tax_settings,
    inventory_settings, created_at, updated_at
)
SELECT
    local_demo_uuid('hq-br', n),
    local_demo_uuid('hq-tenant', n),
    'Main counter',
    n::text || ' Demo Street',
    'Bengaluru',
    'Karnataka',
    '5600' || lpad(n::text, 2, '0'),
    'BR01',
    '99110' || lpad(n::text, 5, '0'),
    'KA-DL-HQ-' || lpad(n::text, 4, '0'),
    '29AABCH' || lpad(n::text, 4, '0') || 'A1Z' || (n % 10)::text,
    '{}'::jsonb,
    'RETAIL',
    'ACTIVE',
    DATE '2025-01-01',
    TRUE,
    FALSE,
    '{}'::jsonb,
    '{}'::jsonb,
    '{"expiryWarnDays":30}'::jsonb,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
FROM generate_series(5, 11) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO compliance_license (
    id, tenant_id, branch_id, doc_type, scope, license_number, issued_on, expires_on,
    version, created_at, updated_at
)
SELECT
    local_demo_uuid('hq-lic', n),
    local_demo_uuid('hq-tenant', n),
    local_demo_uuid('hq-br', n),
    'DRUG_LICENSE',
    'BRANCH',
    'KA-DL-HQ-' || lpad(n::text, 4, '0'),
    DATE '2024-01-01',
    CASE WHEN n IN (5, 8, 11) THEN CURRENT_DATE + 12 ELSE DATE '2027-12-31' END,
    1,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
FROM generate_series(5, 11) AS n
ON CONFLICT (id) DO NOTHING;
