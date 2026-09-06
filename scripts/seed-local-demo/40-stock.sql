-- Local-only opening stock (STOCK_IN) on BR01/BR02. Kiosk has none.

INSERT INTO stock_batch (
    id, tenant_id, product_id, batch_number, manufactured_on, expires_on,
    purchase_price_paise, created_at, updated_at
)
SELECT
    local_demo_uuid('batch-a', n),
    d.tenant_id,
    local_demo_uuid('product', n),
    'A26-' || lpad(n::text, 4, '0'),
    DATE '2025-08-01',
    DATE '2027-08-01',
    3500 + (n % 20) * 100,
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '70 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_batch (
    id, tenant_id, product_id, batch_number, manufactured_on, expires_on,
    purchase_price_paise, created_at, updated_at
)
SELECT
    local_demo_uuid('batch-b', n),
    d.tenant_id,
    local_demo_uuid('product', n),
    'NEAR-' || lpad(n::text, 4, '0'),
    CURRENT_DATE - 340,
    CURRENT_DATE + 12,
    3500 + (n % 20) * 100,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
WHERE n IN (2, 11, 20, 29, 38, 47, 56, 65, 74, 83, 92, 101)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_balance (
    id, tenant_id, branch_id, product_id, batch_id, quantity, version, created_at, updated_at
)
SELECT
    local_demo_uuid('bal-a-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('product', n),
    local_demo_uuid('batch-a', n),
    CASE
        WHEN n BETWEEN 1 AND 15 THEN CASE WHEN b.tag = 'br01' THEN 28 ELSE 40 END
        WHEN n BETWEEN 16 AND 60 THEN CASE WHEN b.tag = 'br01' THEN 2000 ELSE 900 END
        WHEN n BETWEEN 61 AND 80 THEN CASE WHEN b.tag = 'br01' THEN 180 ELSE 90 END
        WHEN n BETWEEN 81 AND 95 THEN CASE WHEN b.tag = 'br01' THEN 42 ELSE 18 END
        WHEN n BETWEEN 96 AND 100 THEN CASE WHEN b.tag = 'br01' THEN 120 ELSE 60 END
        ELSE CASE WHEN b.tag = 'br01' THEN 800 ELSE 400 END
    END,
    0,
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '70 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
CROSS JOIN LATERAL (
    SELECT d.br01 AS branch_id, 'br01' AS tag
    UNION ALL
    SELECT d.br02, 'br02'
) b
WHERE b.branch_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_balance (
    id, tenant_id, branch_id, product_id, batch_id, quantity, version, created_at, updated_at
)
SELECT
    local_demo_uuid('bal-b-br01', n),
    d.tenant_id,
    d.br01,
    local_demo_uuid('product', n),
    local_demo_uuid('batch-b', n),
    18,
    0,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
WHERE n IN (2, 11, 20, 29, 38, 47, 56, 65, 74, 83, 92, 101)
  AND d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id,
    occurred_at, created_at
)
SELECT
    local_demo_uuid('mov-in-a-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('product', n),
    local_demo_uuid('batch-a', n),
    local_demo_uuid('bal-a-' || b.tag, n),
    'STOCK_IN',
    sb.quantity,
    sb.quantity,
    3500 + (n % 20) * 100,
    'demo-open-a:' || b.tag || ':' || n::text,
    d.inventory_id,
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '70 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
CROSS JOIN LATERAL (
    SELECT d.br01 AS branch_id, 'br01' AS tag
    UNION ALL
    SELECT d.br02, 'br02'
) b
JOIN stock_balance sb ON sb.id = local_demo_uuid('bal-a-' || b.tag, n)
WHERE b.branch_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id,
    occurred_at, created_at
)
SELECT
    local_demo_uuid('mov-in-b-br01', n),
    d.tenant_id,
    d.br01,
    local_demo_uuid('product', n),
    local_demo_uuid('batch-b', n),
    local_demo_uuid('bal-b-br01', n),
    'STOCK_IN',
    18,
    18,
    3500 + (n % 20) * 100,
    'demo-open-b:br01:' || n::text,
    d.inventory_id,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
WHERE n IN (2, 11, 20, 29, 38, 47, 56, 65, 74, 83, 92, 101)
  AND d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO controlled_stock_register (
    id, tenant_id, branch_id, stock_movement_id, product_id, product_name, sku,
    schedule_classification, batch_id, batch_number, expires_on, quantity, balance_after,
    movement_type, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('csr-in-a-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('mov-in-a-' || b.tag, n),
    local_demo_uuid('product', n),
    p.name,
    p.sku,
    p.schedule_classification,
    local_demo_uuid('batch-a', n),
    'A26-' || lpad(n::text, 4, '0'),
    DATE '2027-08-01',
    m.quantity,
    m.balance_after,
    'STOCK_IN',
    d.inventory_id,
    m.occurred_at,
    m.created_at
FROM demo_ctx d
CROSS JOIN generate_series(96, 100) AS n
CROSS JOIN LATERAL (
    SELECT d.br01 AS branch_id, 'br01' AS tag
    UNION ALL
    SELECT d.br02, 'br02'
) b
JOIN product p ON p.id = local_demo_uuid('product', n)
JOIN stock_movement m ON m.id = local_demo_uuid('mov-in-a-' || b.tag, n)
WHERE b.branch_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
