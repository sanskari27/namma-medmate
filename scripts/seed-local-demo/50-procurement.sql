-- Local-only suppliers, POs, GRNs, purchase returns, payables, transfers.

INSERT INTO supplier (
    id, tenant_id, supplier_code, legal_name, trade_name, supplier_type, gstin, pan,
    drug_license_number, drug_license_type, drug_license_expiry, contact_person_name,
    contact_person_role, phone, email, address_line_1, city, state, pincode, country,
    payment_terms, credit_period_days, credit_limit_paise, bank_name, account_holder_name,
    account_number, ifsc_code, upi_id, status, created_at, updated_at
)
SELECT
    local_demo_uuid('supplier', n),
    d.tenant_id,
    'SUP-' || lpad(n::text, 3, '0'),
    (ARRAY[
        'Karnataka Drug House Pvt Ltd','MedPlus Wholesale','Abbott India Distribution',
        'Cipla Stockist Bengaluru','Sun Pharma C&F','Alkem Super Stockist',
        'Micro Labs Agency','Lupin Bengaluru Depot'
    ])[n],
    (ARRAY['KDH','MedPlus WH','Abbott C&F','Cipla STK','Sun C&F','Alkem SS','Micro AG','Lupin DEP'])[n],
    (ARRAY['DISTRIBUTOR','WHOLESALER','SUPER_STOCKIST','DISTRIBUTOR','WHOLESALER','SUPER_STOCKIST','DISTRIBUTOR','WHOLESALER'])[n],
    '29AABCS' || lpad(n::text, 4, '0') || 'A1Z' || n::text,
    'AABCS' || lpad(n::text, 4, '0') || 'A',
    'KA-WD-' || lpad(n::text, 4, '0'),
    'WHOLESALE',
    DATE '2027-12-31',
    (ARRAY['Ramesh','Sita','Imran','Kavya','Arun','Neha','Vikram','Pooja'])[n],
    'Purchase desk',
    '99000' || lpad(n::text, 5, '0'),
    'supplier' || n::text || '@varshmaan.local',
    n::text || ' Industrial Layout, Peenya',
    'Bengaluru',
    'Karnataka',
    '560058',
    'India',
    CASE WHEN n % 3 = 0 THEN 'COD' WHEN n % 3 = 1 THEN 'CREDIT' ELSE 'ADVANCE' END,
    CASE WHEN n % 3 = 1 THEN 30 ELSE NULL END,
    CASE WHEN n % 3 = 1 THEN 50000000 ELSE NULL END,
    'HDFC Bank',
    (ARRAY['Karnataka Drug House Pvt Ltd','MedPlus Wholesale','Abbott India Distribution',
        'Cipla Stockist Bengaluru','Sun Pharma C&F','Alkem Super Stockist',
        'Micro Labs Agency','Lupin Bengaluru Depot'])[n],
    '12345678' || lpad(n::text, 4, '0'),
    'HDFC0' || lpad(n::text, 6, '0'),
    'supplier' || n::text || '@hdfcbank',
    'ACTIVE',
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '20 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 8) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_order (
    id, tenant_id, branch_id, supplier_id, po_number, status, expected_delivery_date,
    payment_terms, notes, version, subtotal_paise, tax_paise, total_paise, idempotency_key,
    created_by_user_id, created_at, updated_at
)
SELECT
    local_demo_uuid('po', n),
    d.tenant_id,
    CASE WHEN n % 2 = 0 THEN d.br02 ELSE d.br01 END,
    local_demo_uuid('supplier', 1 + ((n - 1) % 8)),
    'PO/2026-27/' || CASE WHEN n % 2 = 0 THEN 'BR02' ELSE 'BR01' END || '/' || lpad(n::text, 5, '0'),
    CASE
        WHEN n <= 3 THEN 'DRAFT'
        WHEN n <= 6 THEN 'ISSUED'
        WHEN n <= 8 THEN 'CANCELLED'
        ELSE 'CLOSED'
    END,
    DATE '2026-05-01' + (n * 3),
    'CREDIT',
    'Local demo indent ' || n::text,
    1,
    300000,
    36000,
    336000,
    'demo-po-' || n::text,
    d.inventory_id,
    TIMESTAMPTZ '2026-05-01 04:30:00+00' + ((n - 1) || ' days')::interval,
    TIMESTAMPTZ '2026-05-01 04:30:00+00' + ((n - 1) || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 30) AS n
WHERE d.br01 IS NOT NULL AND d.br02 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_order_line (
    id, tenant_id, branch_id, purchase_order_id, product_id, product_name, sku,
    quantity, unit_rate_paise, gst_rate, line_subtotal_paise, line_tax_paise, line_total_paise,
    sort_order, created_at
)
SELECT
    local_demo_uuid('po-line', n * 10 + k),
    d.tenant_id,
    CASE WHEN n % 2 = 0 THEN d.br02 ELSE d.br01 END,
    local_demo_uuid('po', n),
    p.id,
    p.name,
    p.sku,
    50,
    2000,
    12,
    100000,
    12000,
    112000,
    k,
    TIMESTAMPTZ '2026-05-01 04:30:00+00' + ((n - 1) || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 30) AS n
CROSS JOIN generate_series(1, 3) AS k
JOIN product p ON p.id = local_demo_uuid('product', 16 + ((n + k - 1) % 45))
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_order_version (
    id, tenant_id, branch_id, purchase_order_id, version, status, total_paise, snapshot,
    changed_by_user_id, created_at
)
SELECT
    local_demo_uuid('po-ver', replace(po.idempotency_key, 'demo-po-', '')::int),
    po.tenant_id,
    po.branch_id,
    po.id,
    1,
    po.status,
    po.total_paise,
    jsonb_build_object('status', po.status, 'poNumber', po.po_number),
    po.created_by_user_id,
    po.created_at
FROM purchase_order po
WHERE po.id IN (SELECT local_demo_uuid('po', n) FROM generate_series(1, 30) n)
ON CONFLICT (id) DO NOTHING;

INSERT INTO goods_receipt (
    id, tenant_id, branch_id, purchase_order_id, supplier_id, receipt_number, receipt_reference,
    status, idempotency_key, created_by_user_id, created_at, checked_at, checked_by_user_id,
    visual_inspection_passed, packaging_intact, label_matches, batch_readable, no_damage,
    qc_idempotency_key
)
SELECT
    local_demo_uuid('grn', n),
    po.tenant_id,
    po.branch_id,
    po.id,
    po.supplier_id,
    'GRN/2026-27/' || CASE WHEN n % 2 = 0 THEN 'BR02' ELSE 'BR01' END || '/' || lpad(n::text, 5, '0'),
    'CHLN-' || lpad(n::text, 4, '0'),
    CASE WHEN n BETWEEN 4 AND 6 THEN 'PENDING_QC' ELSE 'CHECKED' END,
    'demo-grn-' || n::text,
    d.inventory_id,
    po.created_at + INTERVAL '2 days',
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE po.created_at + INTERVAL '3 days' END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE d.pharmacist_id END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE TRUE END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE TRUE END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE TRUE END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE TRUE END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE TRUE END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE 'demo-qc-' || n::text END
FROM demo_ctx d
CROSS JOIN generate_series(4, 30) AS n
JOIN purchase_order po ON po.id = local_demo_uuid('po', n)
ON CONFLICT (id) DO NOTHING;

INSERT INTO goods_receipt_line (
    id, tenant_id, branch_id, goods_receipt_id, purchase_order_line_id, product_id,
    product_name, sku, quantity, unit_rate_paise, sort_order, created_at,
    accepted_quantity, rejected_quantity, batch_number, manufactured_on, expires_on,
    stock_movement_id
)
SELECT
    local_demo_uuid('grn-line', n * 10 + k),
    pol.tenant_id,
    pol.branch_id,
    local_demo_uuid('grn', n),
    pol.id,
    pol.product_id,
    pol.product_name,
    pol.sku,
    50,
    pol.unit_rate_paise,
    k,
    gr.created_at,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE 48 END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE 2 END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE 'A26-' || lpad(((16 + ((n + k - 1) % 45)))::text, 4, '0') END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE DATE '2025-08-01' END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE DATE '2027-08-01' END,
    CASE WHEN n BETWEEN 4 AND 6 THEN NULL ELSE
        local_demo_uuid('mov-in-a-' || CASE WHEN n % 2 = 0 THEN 'br02' ELSE 'br01' END, 16 + ((n + k - 1) % 45))
    END
FROM demo_ctx d
CROSS JOIN generate_series(4, 30) AS n
CROSS JOIN generate_series(1, 3) AS k
JOIN purchase_order_line pol ON pol.id = local_demo_uuid('po-line', n * 10 + k)
JOIN goods_receipt gr ON gr.id = local_demo_uuid('grn', n)
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_return (
    id, tenant_id, branch_id, supplier_id, goods_receipt_id, origin, status,
    debit_note_number, amount_paise, idempotency_key, created_by_user_id, created_at
)
SELECT
    local_demo_uuid('pr', n),
    gr.tenant_id,
    gr.branch_id,
    gr.supplier_id,
    gr.id,
    'QC',
    'CONFIRMED',
    'DN/2026-27/' || CASE WHEN n % 2 = 0 THEN 'BR02' ELSE 'BR01' END || '/' || lpad(n::text, 5, '0'),
    8000,
    'demo-pr-' || n::text,
    d.pharmacist_id,
    gr.checked_at
FROM demo_ctx d
CROSS JOIN generate_series(9, 16) AS n
JOIN goods_receipt gr ON gr.id = local_demo_uuid('grn', n)
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_return_line (
    id, tenant_id, branch_id, purchase_return_id, goods_receipt_line_id, product_id,
    product_name, sku, batch_id, quantity, unit_rate_paise, amount_paise, stock_movement_id,
    sort_order, created_at
)
SELECT
    local_demo_uuid('pr-line', n),
    pr.tenant_id,
    pr.branch_id,
    pr.id,
    local_demo_uuid('grn-line', n * 10 + 1),
    pol.product_id,
    pol.product_name,
    pol.sku,
    local_demo_uuid('batch-a', 16 + ((n + 1 - 1) % 45)),
    2,
    2000,
    4000,
    NULL,
    1,
    pr.created_at
FROM purchase_return pr
JOIN demo_ctx d ON TRUE
CROSS JOIN generate_series(9, 16) AS n
JOIN purchase_order_line pol ON pol.id = local_demo_uuid('po-line', n * 10 + 1)
WHERE pr.id = local_demo_uuid('pr', n)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_payable_account (
    id, tenant_id, branch_id, supplier_id, balance_paise, version, created_at, updated_at
)
SELECT
    local_demo_uuid('ap-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('supplier', n),
    CASE WHEN n % 2 = 0 THEN 150000 ELSE 200000 END,
    1,
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '5 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 8) AS n
CROSS JOIN LATERAL (
    SELECT d.br01 AS branch_id, 'br01' AS tag
    UNION ALL
    SELECT d.br02, 'br02'
) b
WHERE b.branch_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_ledger_entry (
    id, tenant_id, branch_id, supplier_id, account_id, type, amount_paise, balance_after_paise,
    goods_receipt_id, due_on, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('ap-inv-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('supplier', n),
    local_demo_uuid('ap-' || b.tag, n),
    'INVOICE',
    200000,
    200000,
    NULL,
    CURRENT_DATE - CASE (n % 4)
        WHEN 1 THEN 110
        WHEN 2 THEN 70
        WHEN 3 THEN 45
        ELSE 12
    END,
    'demo-ap-inv-' || b.tag || '-' || n::text,
    d.accountant_id,
    (CURRENT_DATE - CASE (n % 4)
        WHEN 1 THEN 120
        WHEN 2 THEN 80
        WHEN 3 THEN 50
        ELSE 18
    END)::timestamp AT TIME ZONE 'Asia/Kolkata',
    (CURRENT_DATE - CASE (n % 4)
        WHEN 1 THEN 120
        WHEN 2 THEN 80
        WHEN 3 THEN 50
        ELSE 18
    END)::timestamp AT TIME ZONE 'Asia/Kolkata'
FROM demo_ctx d
CROSS JOIN generate_series(1, 8) AS n
CROSS JOIN LATERAL (
    SELECT d.br01 AS branch_id, 'br01' AS tag
    UNION ALL
    SELECT d.br02, 'br02'
) b
WHERE b.branch_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_ledger_entry (
    id, tenant_id, branch_id, supplier_id, account_id, type, amount_paise, balance_after_paise,
    payment_mode, payment_reference, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('ap-pay-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('supplier', n),
    local_demo_uuid('ap-' || b.tag, n),
    'PAYMENT',
    50000,
    150000,
    'UPI',
    'UPI-AP-' || n::text,
    'demo-ap-pay-' || b.tag || '-' || n::text,
    d.accountant_id,
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 8) AS n
CROSS JOIN LATERAL (
    SELECT d.br01 AS branch_id, 'br01' AS tag
    UNION ALL
    SELECT d.br02, 'br02'
) b
WHERE b.branch_id IS NOT NULL AND n % 2 = 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_transfer (
    id, tenant_id, from_branch_id, to_branch_id, direction, status, idempotency_key,
    created_by_user_id, dispatched_by_user_id, confirmed_by_user_id, version, created_at, updated_at
)
SELECT
    local_demo_uuid('xfer', n),
    d.tenant_id,
    d.br01,
    d.br02,
    'PUSH',
    'COMPLETED',
    'demo-xfer-' || n::text,
    d.inventory_id,
    d.inventory_id,
    d.inventory_id,
    3,
    NOW() - ((20 - n) || ' days')::interval,
    NOW() - ((19 - n) || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 10) AS n
WHERE d.br01 IS NOT NULL AND d.br02 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_transfer_line (
    id, transfer_id, tenant_id, product_id, batch_id, quantity, created_at
)
SELECT
    local_demo_uuid('xfer-line', n),
    local_demo_uuid('xfer', n),
    d.tenant_id,
    local_demo_uuid('product', 30 + n),
    local_demo_uuid('batch-a', 30 + n),
    12,
    NOW() - ((20 - n) || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('mov-xout', n),
    d.tenant_id,
    d.br01,
    local_demo_uuid('product', 30 + n),
    local_demo_uuid('batch-a', 30 + n),
    local_demo_uuid('bal-a-br01', 30 + n),
    'TRANSFER_OUT',
    12,
    (SELECT quantity FROM stock_balance WHERE id = local_demo_uuid('bal-a-br01', 30 + n)) - 12,
    3500,
    'demo-xfer-out-' || n::text,
    d.inventory_id,
    NOW() - ((20 - n) || ' days')::interval,
    NOW() - ((20 - n) || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('mov-xin', n),
    d.tenant_id,
    d.br02,
    local_demo_uuid('product', 30 + n),
    local_demo_uuid('batch-a', 30 + n),
    local_demo_uuid('bal-a-br02', 30 + n),
    'TRANSFER_IN',
    12,
    (SELECT quantity FROM stock_balance WHERE id = local_demo_uuid('bal-a-br02', 30 + n)) + 12,
    3500,
    'demo-xfer-in-' || n::text,
    d.inventory_id,
    NOW() - ((19 - n) || ' days')::interval,
    NOW() - ((19 - n) || ' days')::interval
FROM demo_ctx d
CROSS JOIN generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

UPDATE stock_balance sb
SET quantity = m.balance_after,
    version = GREATEST(sb.version, 1),
    updated_at = NOW()
FROM stock_movement m
WHERE m.balance_id = sb.id
  AND (
      m.id IN (SELECT local_demo_uuid('mov-xout', n) FROM generate_series(1, 10) n)
      OR m.id IN (SELECT local_demo_uuid('mov-xin', n) FROM generate_series(1, 10) n)
  )
  AND NOT EXISTS (
      SELECT 1
      FROM stock_movement later
      WHERE later.balance_id = sb.id
        AND (later.occurred_at, later.id) > (m.occurred_at, m.id)
  );
