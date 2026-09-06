-- Local-only sales: ~380 completed bills May–Sep 2026, held bills, returns, stock-out.

DROP TABLE IF EXISTS demo_inv;
CREATE TEMP TABLE demo_inv AS
SELECT
    n,
    d.tenant_id,
    CASE
        WHEN n BETWEEN 321 AND 335 THEN d.br01
        WHEN n % 3 = 0 THEN d.br02
        ELSE d.br01
    END AS branch_id,
    CASE
        WHEN n BETWEEN 321 AND 335 THEN 'BR01'
        WHEN n % 3 = 0 THEN 'BR02'
        ELSE 'BR01'
    END AS branch_code,
    CASE
        WHEN n BETWEEN 356 AND 380 THEN local_demo_uuid('customer', 1 + ((n - 1) % 40))
        WHEN n % 5 = 0 AND n <= 320 THEN NULL
        ELSE local_demo_uuid('customer', 1 + ((n - 1) % 90))
    END AS customer_id,
    CASE WHEN n BETWEEN 356 AND 380 THEN local_demo_uuid('doctor', 1 + ((n - 1) % 14)) ELSE NULL END AS doctor_id,
    CASE
        WHEN n BETWEEN 356 AND 380 THEN d.pharmacist_id
        WHEN n % 4 = 0 THEN d.pharmacist_id
        ELSE d.staff_id
    END AS staff_user_id,
    CASE
        WHEN n BETWEEN 381 AND 387 THEN 'HELD'
        ELSE 'COMPLETED'
    END AS status,
    CASE WHEN n BETWEEN 356 AND 380 THEN 'RX-2026-' || lpad((n - 355)::text, 4, '0') ELSE NULL END AS rx_ref,
    n BETWEEN 356 AND 380 AS rx,
    n BETWEEN 321 AND 335 AS low_stock,
    n BETWEEN 336 AND 355 AS slow,
    (n % 13 = 0 AND n <= 320 AND (1 + ((n - 1) % 90)) BETWEEN 1 AND 25) AS khata,
    (n % 23 = 0 AND n % 5 <> 0) AS b2b,
    (DATE '2026-05-01' + ((n - 1) % 130) + TIME '10:15') AT TIME ZONE 'Asia/Kolkata'
        + ((n % 8) || ' hours')::interval AS billed_at
FROM demo_ctx d
CROSS JOIN generate_series(1, 387) AS n
WHERE d.br01 IS NOT NULL AND d.br02 IS NOT NULL;

INSERT INTO sales_invoice (
    id, tenant_id, branch_id, invoice_number, status, staff_user_id, terminal_id,
    customer_id, doctor_id, prescription_reference, prescription_verified,
    subtotal_paise, discount_paise, tax_paise, total_paise,
    bill_discount_type, bill_discount_value, customer_gstin, tax_jurisdiction,
    cgst_paise, sgst_paise, igst_paise, round_off_paise, discount_approval_status, tax_adjusted,
    amount_paid_paise, amount_due_paise, change_paise,
    loyalty_redeem_points, loyalty_redeem_paise, loyalty_earned_points, loyalty_taxable_paise,
    loyalty_pending_taxable_paise,
    pharmacy_legal_name, pharmacy_address, pharmacy_phone, pharmacy_gstin, pharmacy_pan,
    pharmacy_drug_license_number, pharmacy_drug_license_type, pharmacist_name, pharmacist_registration,
    einvoice_applicability, einvoice_status,
    completed_at, complete_idempotency_key, idempotency_key, version, created_at, updated_at
)
SELECT
    local_demo_uuid('inv', i.n),
    i.tenant_id,
    i.branch_id,
    'INV/2026-27/' || i.branch_code || '/' || lpad(i.n::text, 5, '0'),
    i.status,
    i.staff_user_id,
    d.terminal_id,
    i.customer_id,
    i.doctor_id,
    i.rx_ref,
    i.rx,
    0, 0, 0, 0,
    'NONE', 0,
    CASE WHEN i.b2b THEN '29AABCC1111A1Z5' ELSE NULL END,
    'INTRA',
    0, 0, 0, 0, 'NOT_REQUIRED', FALSE,
    0, 0, 0,
    0, 0, 0, 0, 0,
    'Varshmaan Pharmacy',
    '14 100 Feet Road, Indiranagar, Bengaluru 560038',
    '9876500001',
    '29AABCV1111A1Z5',
    'AABCV1111A',
    'KA-DL20-B-12345',
    'RETAIL',
    'Priya Pharmacist',
    'KA-PCI-20418',
    'NOT_APPLICABLE',
    'NOT_SUBMITTED',
    CASE WHEN i.status = 'COMPLETED' THEN i.billed_at ELSE NULL END,
    CASE WHEN i.status = 'COMPLETED' THEN 'demo-complete-' || i.n::text ELSE NULL END,
    'demo-inv-' || i.n::text,
    CASE WHEN i.status = 'HELD' THEN 2 ELSE 3 END,
    i.billed_at,
    i.billed_at
FROM demo_inv i
JOIN demo_ctx d ON TRUE
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_invoice_line (
    id, tenant_id, branch_id, sales_invoice_id, product_id, product_name, sku,
    batch_id, batch_number, expires_on, quantity, unit, base_quantity, prescribed_quantity,
    mrp_paise, selling_price_paise, discount_paise, discount_type, discount_value, bill_discount_paise,
    hsn_code, tax_category, gst_rate, gst_rate_source, original_gst_rate,
    cgst_paise, sgst_paise, igst_paise, line_taxable_paise, line_tax_paise, line_total_paise,
    schedule_classification, controlled_substance, sort_order, created_at, offer_benefit_paise
)
SELECT
    local_demo_uuid('inv-line', i.n * 10 + k),
    i.tenant_id,
    i.branch_id,
    local_demo_uuid('inv', i.n),
    p.id,
    p.name,
    p.sku,
    local_demo_uuid('batch-a', x.prod_n),
    'A26-' || lpad(x.prod_n::text, 4, '0'),
    DATE '2027-08-01',
    x.qty,
    p.base_unit,
    x.qty,
    CASE WHEN i.rx THEN 10 ELSE NULL END,
    x.mrp,
    x.selling,
    0, 'NONE', 0, 0,
    p.hsn_code,
    'GST',
    p.gst_rate,
    'PRODUCT',
    p.gst_rate,
    (local_demo_tax(x.selling * x.qty, p.gst_rate) / 2),
    local_demo_tax(x.selling * x.qty, p.gst_rate) - (local_demo_tax(x.selling * x.qty, p.gst_rate) / 2),
    0,
    x.selling * x.qty,
    local_demo_tax(x.selling * x.qty, p.gst_rate),
    x.selling * x.qty + local_demo_tax(x.selling * x.qty, p.gst_rate),
    p.schedule_classification,
    p.controlled_substance,
    k,
    i.billed_at,
    0
FROM demo_inv i
CROSS JOIN generate_series(1, 3) AS k
CROSS JOIN LATERAL (
    SELECT
        CASE
            WHEN i.low_stock THEN i.n - 320
            WHEN i.slow THEN 61 + (i.n - 336)
            WHEN i.rx THEN 96 + ((i.n - 356) % 5)
            ELSE 16 + ((i.n * 3 + k - 1) % 45)
        END AS prod_n,
        CASE WHEN i.low_stock THEN 24 WHEN i.slow THEN 3 ELSE 1 END AS qty,
        (5000 + ((CASE
            WHEN i.low_stock THEN i.n - 320
            WHEN i.slow THEN 61 + (i.n - 336)
            WHEN i.rx THEN 96 + ((i.n - 356) % 5)
            ELSE 16 + ((i.n * 3 + k - 1) % 45)
        END) % 20) * 250) AS selling,
        (5500 + ((CASE
            WHEN i.low_stock THEN i.n - 320
            WHEN i.slow THEN 61 + (i.n - 336)
            WHEN i.rx THEN 96 + ((i.n - 356) % 5)
            ELSE 16 + ((i.n * 3 + k - 1) % 45)
        END) % 20) * 250) AS mrp
) x
JOIN product p ON p.id = local_demo_uuid('product', x.prod_n)
WHERE (NOT i.low_stock AND NOT i.slow AND NOT i.rx)
   OR (i.low_stock AND k = 1 AND x.prod_n BETWEEN 1 AND 15)
   OR (i.slow AND k = 1 AND x.prod_n BETWEEN 61 AND 80)
   OR (i.rx AND k = 1 AND x.prod_n BETWEEN 96 AND 100)
ON CONFLICT (id) DO NOTHING;

-- Low-stock product numbers: invoices 321-335 should map to products 1-15
-- Fix: 320 + (n-320) for n=321 => 321 which is wrong. Patch lines already inserted
-- via the CASE when i.low_stock THEN i.n - 320  => 321-320=1. Need to fix the CASE.

UPDATE sales_invoice si
SET
    subtotal_paise = s.subtotal,
    tax_paise = s.tax,
    total_paise = s.total,
    cgst_paise = s.cgst,
    sgst_paise = s.sgst,
    amount_paid_paise = s.total,
    amount_due_paise = CASE WHEN i.khata AND si.status = 'COMPLETED' THEN s.total ELSE 0 END,
    loyalty_taxable_paise = CASE WHEN i.customer_id IS NOT NULL AND si.status = 'COMPLETED' THEN s.subtotal ELSE 0 END,
    loyalty_earned_points = CASE
        WHEN i.customer_id IS NOT NULL AND si.status = 'COMPLETED'
        THEN round(s.subtotal / 10000.0)
        ELSE 0
    END
FROM demo_inv i
JOIN LATERAL (
    SELECT
        COALESCE(SUM(l.line_taxable_paise), 0) AS subtotal,
        COALESCE(SUM(l.line_tax_paise), 0) AS tax,
        COALESCE(SUM(l.line_total_paise), 0) AS total,
        COALESCE(SUM(l.cgst_paise), 0) AS cgst,
        COALESCE(SUM(l.sgst_paise), 0) AS sgst
    FROM sales_invoice_line l
    WHERE l.sales_invoice_id = local_demo_uuid('inv', i.n)
) s ON TRUE
WHERE si.id = local_demo_uuid('inv', i.n);

INSERT INTO sales_invoice_payment (
    id, tenant_id, branch_id, sales_invoice_id, mode, amount_paise, reference, sort_order, created_at
)
SELECT
    local_demo_uuid('inv-pay', i.n),
    i.tenant_id,
    i.branch_id,
    local_demo_uuid('inv', i.n),
    CASE
        WHEN i.khata THEN 'CREDIT'
        WHEN i.n % 4 = 1 THEN 'UPI'
        WHEN i.n % 4 = 2 THEN 'CARD'
        ELSE 'CASH'
    END,
    si.total_paise,
    CASE WHEN i.khata THEN 'KHATA' WHEN i.n % 4 = 1 THEN 'UPI-' || i.n::text ELSE NULL END,
    1,
    i.billed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
WHERE si.status = 'COMPLETED' AND si.total_paise > 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_invoice_sequence (id, tenant_id, branch_id, financial_year, next_value)
SELECT local_demo_uuid('inv-seq', 1), d.tenant_id, d.br01, '2026-27', 500
FROM demo_ctx d
WHERE d.br01 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM sales_invoice_sequence s
      WHERE s.tenant_id = d.tenant_id AND s.branch_id = d.br01 AND s.financial_year = '2026-27'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_invoice_sequence (id, tenant_id, branch_id, financial_year, next_value)
SELECT local_demo_uuid('inv-seq', 2), d.tenant_id, d.br02, '2026-27', 500
FROM demo_ctx d
WHERE d.br02 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM sales_invoice_sequence s
      WHERE s.tenant_id = d.tenant_id AND s.branch_id = d.br02 AND s.financial_year = '2026-27'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_history_fact (
    id, tenant_id, customer_id, branch_id, type, summary, prescription_reference,
    doctor_id, invoice_id, amount_paise, occurred_at, created_at
)
SELECT
    local_demo_uuid('hist-p', i.n),
    i.tenant_id,
    i.customer_id,
    i.branch_id,
    'PURCHASE',
    'Till bill ' || si.invoice_number,
    i.rx_ref,
    i.doctor_id,
    si.id,
    si.total_paise,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
WHERE i.customer_id IS NOT NULL AND si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_history_fact (
    id, tenant_id, customer_id, branch_id, type, summary, prescription_reference,
    doctor_id, invoice_id, amount_paise, occurred_at, created_at
)
SELECT
    local_demo_uuid('hist-rx', i.n),
    i.tenant_id,
    i.customer_id,
    i.branch_id,
    'PRESCRIPTION',
    'Rx ' || i.rx_ref,
    i.rx_ref,
    i.doctor_id,
    si.id,
    si.total_paise,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
WHERE i.rx AND si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('mov-out', i.n * 10 + l.sort_order),
    l.tenant_id,
    l.branch_id,
    l.product_id,
    l.batch_id,
    sb.id,
    'STOCK_OUT',
    l.base_quantity,
    sb.quantity - SUM(l.base_quantity) OVER (
        PARTITION BY sb.id
        ORDER BY si.completed_at, l.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    b.purchase_price_paise,
    'demo-sale-out:' || i.n::text || ':' || l.sort_order::text,
    si.staff_user_id,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
JOIN sales_invoice_line l ON l.sales_invoice_id = si.id
JOIN stock_batch b ON b.id = l.batch_id
JOIN stock_balance sb ON sb.tenant_id = l.tenant_id
    AND sb.branch_id = l.branch_id
    AND sb.product_id = l.product_id
    AND sb.batch_id = l.batch_id
WHERE si.status = 'COMPLETED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_movement m
      WHERE m.id = local_demo_uuid('mov-out', i.n * 10 + l.sort_order)
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_credit_ledger_entry (
    id, tenant_id, customer_id, account_id, type, amount_paise, balance_after_paise,
    invoice_id, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('credit-chg', i.n),
    i.tenant_id,
    i.customer_id,
    local_demo_uuid('credit-acct', (
        SELECT n FROM generate_series(1, 25) n
        WHERE local_demo_uuid('customer', n) = i.customer_id
    )),
    'SALE_CHARGE',
    si.total_paise,
    SUM(si.total_paise) OVER (PARTITION BY i.customer_id ORDER BY si.completed_at, si.id),
    si.id,
    'demo-credit-' || i.n::text,
    si.staff_user_id,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
WHERE i.khata AND i.customer_id IS NOT NULL AND si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

UPDATE customer_credit_account a
SET balance_paise = COALESCE((
        SELECT e.balance_after_paise
        FROM customer_credit_ledger_entry e
        WHERE e.account_id = a.id
        ORDER BY e.occurred_at DESC, e.id DESC
        LIMIT 1
    ), 0),
    version = 1,
    updated_at = NOW()
WHERE a.id IN (SELECT local_demo_uuid('credit-acct', n) FROM generate_series(1, 25) n);

INSERT INTO customer_loyalty_ledger_entry (
    id, tenant_id, customer_id, account_id, type, points, delta_points, balance_after_points,
    invoice_id, taxable_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('loyal-earn', i.n),
    i.tenant_id,
    i.customer_id,
    local_demo_uuid('loyalty-acct', (
        SELECT n FROM generate_series(1, 40) n
        WHERE local_demo_uuid('customer', n) = i.customer_id
    )),
    'EARN',
    si.loyalty_earned_points,
    si.loyalty_earned_points,
    SUM(si.loyalty_earned_points) OVER (PARTITION BY i.customer_id ORDER BY si.completed_at, si.id),
    si.id,
    si.loyalty_taxable_paise,
    'demo-loyal-' || i.n::text,
    si.staff_user_id,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
WHERE i.customer_id IS NOT NULL
  AND si.status = 'COMPLETED'
  AND si.loyalty_earned_points > 0
  AND EXISTS (
      SELECT 1 FROM generate_series(1, 40) n
      WHERE local_demo_uuid('customer', n) = i.customer_id
  )
ON CONFLICT (id) DO NOTHING;

UPDATE customer_loyalty_account a
SET balance_points = COALESCE((
        SELECT e.balance_after_points
        FROM customer_loyalty_ledger_entry e
        WHERE e.account_id = a.id
        ORDER BY e.occurred_at DESC, e.id DESC
        LIMIT 1
    ), 0),
    version = 1,
    updated_at = NOW()
WHERE a.id IN (SELECT local_demo_uuid('loyalty-acct', n) FROM generate_series(1, 40) n);

INSERT INTO sales_prescription_fulfillment (
    id, tenant_id, customer_id, doctor_id, prescription_reference, product_id,
    prescribed_quantity, fulfilled_quantity, created_at, updated_at
)
SELECT
    local_demo_uuid('rx-fill', i.n),
    i.tenant_id,
    i.customer_id,
    i.doctor_id,
    i.rx_ref,
    l.product_id,
    10,
    l.base_quantity,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
JOIN sales_invoice_line l ON l.sales_invoice_id = si.id
WHERE i.rx AND si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

INSERT INTO prescription_reference (
    id, tenant_id, branch_id, customer_id, doctor_id, prescription_reference,
    issued_at, expires_at, status, archive_reason, archived_at, first_invoice_id,
    version, created_at, updated_at
)
SELECT
    local_demo_uuid('rx-ref', i.n),
    i.tenant_id,
    i.branch_id,
    i.customer_id,
    i.doctor_id,
    i.rx_ref,
    si.completed_at,
    si.completed_at + INTERVAL '6 months',
    CASE WHEN i.n >= 376 THEN 'ARCHIVED' ELSE 'ACTIVE' END,
    CASE WHEN i.n >= 376 THEN 'FULFILLED' ELSE NULL END,
    CASE WHEN i.n >= 376 THEN si.completed_at ELSE NULL END,
    si.id,
    0,
    si.completed_at,
    si.completed_at
FROM demo_inv i
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
WHERE i.rx AND si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

INSERT INTO controlled_sale_register (
    id, tenant_id, branch_id, kind, product_id, product_name, sku, schedule_classification,
    batch_id, batch_number, quantity, prescription_reference, patient_id, patient_name,
    pharmacist_user_id, pharmacist_name, pharmacist_registration, occurred_at,
    sales_invoice_id, sales_invoice_line_id, created_at
)
SELECT
    local_demo_uuid('csr-sale', i.n),
    l.tenant_id,
    l.branch_id,
    'SALE',
    l.product_id,
    l.product_name,
    l.sku,
    l.schedule_classification,
    l.batch_id,
    l.batch_number,
    l.base_quantity,
    i.rx_ref,
    i.customer_id,
    c.name,
    d.pharmacist_id,
    'Priya Pharmacist',
    'KA-PCI-20418',
    si.completed_at,
    si.id,
    l.id,
    si.completed_at
FROM demo_inv i
JOIN demo_ctx d ON TRUE
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', i.n)
JOIN sales_invoice_line l ON l.sales_invoice_id = si.id
JOIN customer c ON c.id = i.customer_id
WHERE i.rx AND si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

INSERT INTO controlled_stock_register (
    id, tenant_id, branch_id, stock_movement_id, product_id, product_name, sku,
    schedule_classification, batch_id, batch_number, expires_on, quantity, balance_after,
    movement_type, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('csr-out', i.n * 10 + l.sort_order),
    m.tenant_id,
    m.branch_id,
    m.id,
    m.product_id,
    l.product_name,
    l.sku,
    l.schedule_classification,
    m.batch_id,
    l.batch_number,
    l.expires_on,
    m.quantity,
    m.balance_after,
    'STOCK_OUT',
    m.created_by_user_id,
    m.occurred_at,
    m.created_at
FROM demo_inv i
JOIN sales_invoice_line l ON l.sales_invoice_id = local_demo_uuid('inv', i.n)
JOIN stock_movement m ON m.id = local_demo_uuid('mov-out', i.n * 10 + l.sort_order)
WHERE i.rx
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_return (
    id, tenant_id, branch_id, sales_invoice_id, customer_id, reason, decision, refund_mode,
    refund_total_paise, cash_refund_paise, credit_note_paise, idempotency_key,
    created_by_user_id, created_at
)
SELECT
    local_demo_uuid('sret', n),
    si.tenant_id,
    si.branch_id,
    si.id,
    si.customer_id,
    'Customer changed mind',
    'APPROVED',
    CASE WHEN n % 2 = 0 THEN 'CREDIT_NOTE' ELSE 'CASH' END,
    l.line_total_paise,
    CASE WHEN n % 2 = 0 THEN 0 ELSE l.line_total_paise END,
    CASE WHEN n % 2 = 0 THEN l.line_total_paise ELSE 0 END,
    'demo-sret-' || n::text,
    d.staff_id,
    si.completed_at + INTERVAL '2 days'
FROM demo_ctx d
CROSS JOIN generate_series(20, 39) AS n
JOIN sales_invoice si ON si.id = local_demo_uuid('inv', n)
JOIN sales_invoice_line l ON l.sales_invoice_id = si.id AND l.sort_order = 1
WHERE si.status = 'COMPLETED'
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('mov-sret', n),
    l.tenant_id,
    l.branch_id,
    l.product_id,
    l.batch_id,
    sb.id,
    'SALES_RETURN',
    l.base_quantity,
    COALESCE((
        SELECT m2.balance_after
        FROM stock_movement m2
        WHERE m2.balance_id = sb.id
        ORDER BY m2.occurred_at DESC, m2.id DESC
        LIMIT 1
    ), sb.quantity) + l.base_quantity,
    b.purchase_price_paise,
    'demo-sret-in-' || n::text,
    d.staff_id,
    sr.created_at,
    sr.created_at
FROM demo_ctx d
CROSS JOIN generate_series(20, 39) AS n
JOIN sales_return sr ON sr.id = local_demo_uuid('sret', n)
JOIN sales_invoice_line l ON l.sales_invoice_id = sr.sales_invoice_id AND l.sort_order = 1
JOIN stock_batch b ON b.id = l.batch_id
JOIN stock_balance sb ON sb.tenant_id = l.tenant_id AND sb.branch_id = l.branch_id
    AND sb.product_id = l.product_id AND sb.batch_id = l.batch_id
WHERE NOT EXISTS (
    SELECT 1 FROM stock_movement m
    WHERE m.id = local_demo_uuid('mov-sret', n)
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales_return_line (
    id, tenant_id, branch_id, sales_return_id, sales_invoice_line_id, product_id,
    product_name, sku, batch_id, quantity, line_total_paise, refund_amount_paise,
    stock_movement_id, sort_order, created_at
)
SELECT
    local_demo_uuid('sret-line', n),
    l.tenant_id,
    l.branch_id,
    local_demo_uuid('sret', n),
    l.id,
    l.product_id,
    l.product_name,
    l.sku,
    l.batch_id,
    l.base_quantity,
    l.line_total_paise,
    l.line_total_paise,
    local_demo_uuid('mov-sret', n),
    1,
    sr.created_at
FROM generate_series(20, 39) AS n
JOIN sales_return sr ON sr.id = local_demo_uuid('sret', n)
JOIN sales_invoice_line l ON l.sales_invoice_id = sr.sales_invoice_id AND l.sort_order = 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_credit_ledger_entry (
    id, tenant_id, customer_id, account_id, type, amount_paise, balance_after_paise,
    invoice_id, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('credit-cn', n),
    sr.tenant_id,
    sr.customer_id,
    a.id,
    'CREDIT_NOTE',
    sr.credit_note_paise,
    GREATEST(a.balance_paise - sr.credit_note_paise, -sr.credit_note_paise),
    sr.sales_invoice_id,
    'demo-cn-' || n::text,
    sr.created_by_user_id,
    sr.created_at,
    sr.created_at
FROM generate_series(20, 39) AS n
JOIN sales_return sr ON sr.id = local_demo_uuid('sret', n)
JOIN customer_credit_account a ON a.customer_id = sr.customer_id
WHERE sr.refund_mode = 'CREDIT_NOTE' AND sr.customer_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Recalc balances from latest movement per balance row.
UPDATE stock_balance sb
SET quantity = m.balance_after,
    version = GREATEST(sb.version, 1),
    updated_at = NOW()
FROM (
    SELECT DISTINCT ON (balance_id)
        balance_id, balance_after
    FROM stock_movement
    ORDER BY balance_id, occurred_at DESC, created_at DESC, id DESC
) m
WHERE m.balance_id = sb.id
  AND sb.tenant_id = '11111111-1111-1111-1111-111111111111';

UPDATE sales_invoice_sequence s
SET next_value = GREATEST(
    s.next_value,
    1 + COALESCE((
        SELECT MAX(split_part(si.invoice_number, '/', 4)::int)
        FROM sales_invoice si
        WHERE si.tenant_id = s.tenant_id AND si.branch_id = s.branch_id
    ), 0)
)
WHERE s.financial_year = '2026-27'
  AND s.tenant_id = '11111111-1111-1111-1111-111111111111';
