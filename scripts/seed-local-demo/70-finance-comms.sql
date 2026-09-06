-- Local-only expenses, schemes, campaigns, licences, WhatsApp, inbox, adjustments.

INSERT INTO expense (
    id, tenant_id, branch_id, category_id, category_code, category_label, amount_paise,
    occurred_on, notes, idempotency_key, version, created_by, created_at, updated_at, status
)
SELECT
    local_demo_uuid('expense', n),
    d.tenant_id,
    CASE WHEN n % 2 = 0 THEN d.br02 ELSE d.br01 END,
    (ARRAY[
        '51000000-0000-0000-0000-000000000001'::uuid,
        '51000000-0000-0000-0000-000000000002'::uuid,
        '51000000-0000-0000-0000-000000000003'::uuid,
        '51000000-0000-0000-0000-000000000004'::uuid
    ])[1 + ((n - 1) % 4)],
    (ARRAY['RENT','ELECTRICITY','SALARIES','MISCELLANEOUS'])[1 + ((n - 1) % 4)],
    (ARRAY['Rent','Electricity','Salaries','Miscellaneous'])[1 + ((n - 1) % 4)],
    CASE (n % 4)
        WHEN 1 THEN 8500000
        WHEN 2 THEN 420000
        WHEN 3 THEN 12500000
        ELSE 185000
    END,
    DATE '2026-05-01' + ((n - 1) * 2),
    'Local demo spend ' || n::text,
    'demo-exp-' || n::text,
    0,
    d.accountant_id,
    (DATE '2026-05-01' + ((n - 1) * 2) + TIME '11:00') AT TIME ZONE 'Asia/Kolkata',
    (DATE '2026-05-01' + ((n - 1) * 2) + TIME '11:00') AT TIME ZONE 'Asia/Kolkata',
    'POSTED'
FROM demo_ctx d
CROSS JOIN generate_series(1, 52) AS n
WHERE d.br01 IS NOT NULL AND d.br02 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_offer (
    id, tenant_id, name, kind, status, priority, starts_at, ends_at,
    buy_quantity, get_quantity, benefit_type, benefit_value, version, created_at, updated_at
)
SELECT
    local_demo_uuid('offer', n),
    d.tenant_id,
    (ARRAY[
        'Monsoon BOGO strips','Independence 10% off','Senior flat 20','Bundle vitamins',
        'Expired winter scheme','Draft festival BOGO'
    ])[n],
    (ARRAY['BOGO','SEASONAL','SEASONAL','BUNDLE','SEASONAL','BOGO'])[n],
    (ARRAY['ACTIVE','ACTIVE','ACTIVE','ACTIVE','INACTIVE','DRAFT'])[n],
    n,
    TIMESTAMPTZ '2026-05-01 00:00:00+00',
    CASE WHEN n = 5 THEN TIMESTAMPTZ '2026-06-30 00:00:00+00' ELSE TIMESTAMPTZ '2026-12-31 00:00:00+00' END,
    CASE WHEN n IN (1, 6) THEN 1 ELSE NULL END,
    CASE WHEN n IN (1, 6) THEN 1 ELSE NULL END,
    CASE WHEN n IN (1, 6) THEN 'FREE_QTY' WHEN n = 3 THEN 'FLAT' ELSE 'PERCENT' END,
    CASE WHEN n IN (1, 6) THEN 1 WHEN n = 3 THEN 2000 ELSE 10 END,
    1,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 6) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_offer_product (id, tenant_id, offer_id, product_id, slot)
SELECT
    local_demo_uuid('offer-prod', n),
    d.tenant_id,
    local_demo_uuid('offer', n),
    local_demo_uuid('product', 16 + n),
    CASE WHEN n IN (1, 6) THEN 'TRIGGER' WHEN n = 4 THEN 'BUNDLE' ELSE 'TRIGGER' END
FROM demo_ctx d
CROSS JOIN generate_series(1, 6) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO whatsapp_tenant_template (
    id, tenant_id, unique_name, namespace_name, variables, version, created_at, updated_at
)
SELECT
    local_demo_uuid('wa-tpl', n),
    d.tenant_id,
    t.unique_name,
    d.tenant_id::text || '_' || t.unique_name,
    jsonb_build_object('pharmacy_name', 'Varshmaan Pharmacy'),
    1,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
FROM demo_ctx d
CROSS JOIN (
    VALUES (1, 'refill_due'), (2, 'refill_due_warm'), (3, 'credit_due'), (4, 'campaign'), (5, 'birthday')
) AS t(n, unique_name)
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaign (
    id, tenant_id, name, status, tag_ids, template_unique_name, template_namespace_name,
    template_variables, previewed_at, preview_recipient_count, frozen_at, frozen_recipient_count,
    version, created_by_user_id, created_at, updated_at
)
SELECT
    local_demo_uuid('campaign', n),
    d.tenant_id,
    (ARRAY['Refill club May','Diabetes June','VIP monsoon','Draft birthday'])[n],
    CASE WHEN n <= 3 THEN 'READY_FOR_DELIVERY' ELSE 'DRAFT' END,
    jsonb_build_array(local_demo_uuid('tag', n)),
    CASE WHEN n = 4 THEN 'birthday' ELSE 'campaign' END,
    d.tenant_id::text || '_' || CASE WHEN n = 4 THEN 'birthday' ELSE 'campaign' END,
    jsonb_build_object('pharmacy_name', 'Varshmaan Pharmacy'),
    NOW() - INTERVAL '12 days',
    CASE WHEN n = 1 THEN 40 WHEN n = 2 THEN 36 WHEN n = 3 THEN 32 ELSE 10 END,
    CASE WHEN n <= 3 THEN NOW() - INTERVAL '11 days' ELSE NULL END,
    CASE WHEN n = 1 THEN 40 WHEN n = 2 THEN 36 WHEN n = 3 THEN 32 ELSE NULL END,
    2,
    d.owner_id,
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '11 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 4) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaign_recipient (tenant_id, campaign_id, customer_id, created_at)
SELECT
    d.tenant_id,
    local_demo_uuid('campaign', 1 + ((n - 1) / 40)),
    local_demo_uuid('customer', n),
    NOW() - INTERVAL '11 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 80) AS n
WHERE 1 + ((n - 1) / 40) <= 2
ON CONFLICT DO NOTHING;

INSERT INTO campaign_recipient (tenant_id, campaign_id, customer_id, created_at)
SELECT
    d.tenant_id,
    local_demo_uuid('campaign', 3),
    local_demo_uuid('customer', n),
    NOW() - INTERVAL '11 days'
FROM demo_ctx d
CROSS JOIN generate_series(41, 80) AS n
ON CONFLICT DO NOTHING;

INSERT INTO whatsapp_message (
    id, tenant_id, kind, source_id, customer_id, campaign_id, template_unique_name,
    namespace_name, phone, variables, preview, status, provider_message_id, failure_code,
    idempotency_key, attempt_count, last_attempt_at, created_at, updated_at
)
SELECT
    local_demo_uuid('wa-msg', n),
    d.tenant_id,
    CASE WHEN n <= 20 THEN 'REFILL_DUE' WHEN n <= 35 THEN 'CREDIT_DUE' ELSE 'CAMPAIGN' END,
    CASE
        WHEN n <= 20 THEN local_demo_uuid('refill', 1 + ((n - 1) % 20))
        WHEN n <= 35 THEN local_demo_uuid('credit-acct', 1 + ((n - 21) % 25))
        ELSE local_demo_uuid('campaign', 1)
    END,
    local_demo_uuid('customer', 1 + ((n - 1) % 80)),
    CASE WHEN n > 35 THEN local_demo_uuid('campaign', 1) ELSE NULL END,
    CASE WHEN n <= 20 THEN 'refill_due' WHEN n <= 35 THEN 'credit_due' ELSE 'campaign' END,
    d.tenant_id::text || '_' || CASE WHEN n <= 20 THEN 'refill_due' WHEN n <= 35 THEN 'credit_due' ELSE 'campaign' END,
    '9888' || lpad((1 + ((n - 1) % 80))::text, 6, '0'),
    jsonb_build_object('pharmacy_name', 'Varshmaan Pharmacy', 'customer_name', 'Patient ' || n::text),
    'Hi Patient ' || n::text || ', Varshmaan Pharmacy has an update.',
    CASE WHEN n % 11 = 0 THEN 'FAILED' WHEN n % 7 = 0 THEN 'QUEUED' ELSE 'SENT' END,
    CASE WHEN n % 11 = 0 THEN NULL ELSE 'wamid-demo-' || n::text END,
    CASE WHEN n % 11 = 0 THEN 'PROVIDER_UNAVAILABLE' ELSE NULL END,
    'demo-wa-' || n::text,
    CASE WHEN n % 11 = 0 THEN 2 ELSE 1 END,
    NOW() - ((n % 20) || ' hours')::interval,
    NOW() - ((n % 20) || ' hours')::interval,
    NOW() - ((n % 20) || ' hours')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 48) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO compliance_license (
    id, tenant_id, branch_id, staff_user_id, doc_type, scope, license_number,
    issued_on, expires_on, version, created_at, updated_at
)
SELECT
    local_demo_uuid('lic', n),
    d.tenant_id,
    CASE WHEN n = 2 THEN d.br01 WHEN n = 3 THEN d.br02 ELSE NULL END,
    CASE WHEN n = 4 THEN d.pharmacist_id ELSE NULL END,
    (ARRAY['DRUG_LICENSE','GST','FSSAI','PHARMACIST_REGISTRATION'])[n],
    CASE WHEN n = 1 THEN 'TENANT' WHEN n = 4 THEN 'STAFF' ELSE 'BRANCH' END,
    CASE n
        WHEN 1 THEN 'KA-DL20-B-12345'
        WHEN 2 THEN '29AABCV1111A1Z5'
        WHEN 3 THEN 'FSSAI-114200000001'
        ELSE 'KA-PCI-20418'
    END,
    DATE '2024-04-01',
    CASE WHEN n = 3 THEN CURRENT_DATE + 18 ELSE DATE '2027-03-31' END,
    1,
    NOW() - INTERVAL '50 days',
    NOW() - INTERVAL '50 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 4) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO approval_request (
    id, tenant_id, branch_id, rule_id, requester_user_id, module_code, action_key,
    amount_value, threshold_snapshot, rule_version_snapshot, context_json, status,
    idempotency_key, version, created_at, updated_at
)
SELECT
    local_demo_uuid('appr-req', n),
    d.tenant_id,
    d.br01,
    COALESCE(
        (SELECT r.id FROM approval_rule r
         WHERE r.tenant_id = d.tenant_id AND r.action_key = 'INVENTORY_WRITE_OFF' AND r.deleted_at IS NULL
         LIMIT 1),
        local_demo_uuid('approval-rule', 1)
    ),
    d.inventory_id,
    'INVENTORY',
    'INVENTORY_WRITE_OFF',
    12000,
    0,
    1,
    '{"reason":"DAMAGE_BREAKAGE"}',
    'PENDING',
    'demo-adj-req-' || n::text,
    1,
    NOW() - (n || ' days')::interval,
    NOW() - (n || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 2) AS n
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_adjustment (
    id, tenant_id, branch_id, product_id, batch_id, reason, quantity, direction, status,
    requester_user_id, approval_request_id, idempotency_key, version, created_at, updated_at
)
SELECT
    local_demo_uuid('adj', n),
    d.tenant_id,
    d.br01,
    local_demo_uuid('product', 81 + n),
    local_demo_uuid('batch-a', 81 + n),
    'DAMAGE_BREAKAGE',
    2,
    'OUT',
    'PENDING',
    d.inventory_id,
    local_demo_uuid('appr-req', n),
    'demo-adj-' || n::text,
    1,
    NOW() - (n || ' days')::interval,
    NOW() - (n || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 2) AS n
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_take (
    id, tenant_id, branch_id, status, started_by_user_id, posted_by_user_id,
    idempotency_key, version, created_at, updated_at, posted_at
)
SELECT
    local_demo_uuid('take', n),
    d.tenant_id,
    CASE WHEN n = 1 THEN d.br01 ELSE d.br02 END,
    'POSTED',
    d.owner_id,
    d.owner_id,
    'demo-take-' || n::text,
    2,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '24 days',
    NOW() - INTERVAL '24 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 2) AS n
WHERE d.br01 IS NOT NULL AND d.br02 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_credit_ledger_entry (
    id, tenant_id, customer_id, account_id, type, amount_paise, balance_after_paise,
    idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('credit-age', n),
    d.tenant_id,
    local_demo_uuid('customer', n),
    local_demo_uuid('credit-acct', n),
    'SALE_CHARGE',
    75000,
    COALESCE(a.balance_paise, 0) + 75000,
    'demo-age-' || n::text,
    d.staff_id,
    (CURRENT_DATE - CASE
        WHEN n BETWEEN 1 AND 3 THEN 110
        WHEN n BETWEEN 4 AND 6 THEN 70
        WHEN n BETWEEN 7 AND 9 THEN 45
        ELSE 12
    END)::timestamp AT TIME ZONE 'Asia/Kolkata',
    (CURRENT_DATE - CASE
        WHEN n BETWEEN 1 AND 3 THEN 110
        WHEN n BETWEEN 4 AND 6 THEN 70
        WHEN n BETWEEN 7 AND 9 THEN 45
        ELSE 12
    END)::timestamp AT TIME ZONE 'Asia/Kolkata'
FROM demo_ctx d
CROSS JOIN generate_series(1, 12) AS n
JOIN customer_credit_account a ON a.id = local_demo_uuid('credit-acct', n)
ON CONFLICT (id) DO NOTHING;

UPDATE customer_credit_account a
SET balance_paise = COALESCE((
        SELECT e.balance_after_paise
        FROM customer_credit_ledger_entry e
        WHERE e.account_id = a.id
        ORDER BY e.occurred_at DESC, e.id DESC
        LIMIT 1
    ), 0),
    updated_at = NOW()
WHERE a.tenant_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO notification_source (id, tenant_id, branch_id, href, created_at)
VALUES
    (local_demo_uuid('nsrc', 1), '11111111-1111-1111-1111-111111111111', NULL, '/inventory', NOW()),
    (local_demo_uuid('nsrc', 2), '11111111-1111-1111-1111-111111111111', NULL, '/credit', NOW()),
    (local_demo_uuid('nsrc', 3), '11111111-1111-1111-1111-111111111111', NULL, '/licenses', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO notification (
    id, recipient_user_id, tenant_id, title, body, source_type, source_id, href, created_at
)
SELECT
    local_demo_uuid('notif', n),
    'f70713e0-0e91-4bc3-a287-47ca3b819a25',
    '11111111-1111-1111-1111-111111111111',
    (ARRAY['Paracetamol 500mg is below reorder','Khata overdue','FSSAI licence due soon'])[n],
    (ARRAY['Indiranagar has 4 strips left.','Anika Sharma has an aged khata balance.','Koramangala FSSAI expires in 18 days.'])[n],
    (ARRAY['low_stock','credit_due','license_expiry'])[n],
    local_demo_uuid('nsrc', n),
    (ARRAY['/inventory','/credit','/licenses'])[n],
    NOW() - (n || ' hours')::interval
FROM generate_series(1, 3) n
ON CONFLICT (id) DO NOTHING;
