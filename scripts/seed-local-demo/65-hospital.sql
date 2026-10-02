-- Local-only M13 hospital pharmacy: Indiranagar IPD + ward supply + patient bills.

INSERT INTO access_role_module (id, role_id, module_code)
VALUES (
    local_demo_uuid('arm-hosp-cashier', 1),
    '11111111-1111-1111-1111-000000000002',
    'HOSPITAL'
)
ON CONFLICT (role_id, module_code) DO NOTHING;

UPDATE product p
SET default_mrp_paise = 5500 + ((n % 20) * 250)
FROM generate_series(1, 110) AS n
WHERE p.id = local_demo_uuid('product', n)
  AND p.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND p.default_mrp_paise IS NULL;

INSERT INTO hospital_credit_account (
    id, tenant_id, institution_name, gstin, stores_contact, billing_phone, billing_email,
    credit_terms, credit_limit_paise, uniform_discount_bps, balance_paise, version,
    created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-acct', 1),
    d.tenant_id,
    'Varshmaan Medical Centre',
    '29AABCV2222B1Z6',
    'Central Stores — Ramesh Naik',
    '08041230001',
    'stores@varshmaan-hospital.local',
    'NET_30',
    500000000,
    1000,
    0,
    0,
    NOW() - INTERVAL '80 days',
    NOW()
FROM demo_ctx d
WHERE NOT EXISTS (
    SELECT 1 FROM hospital_credit_account a WHERE a.tenant_id = d.tenant_id
)
ON CONFLICT (id) DO NOTHING;

UPDATE hospital_credit_account a
SET institution_name = 'Varshmaan Medical Centre',
    gstin = '29AABCV2222B1Z6',
    stores_contact = 'Central Stores — Ramesh Naik',
    billing_phone = '08041230001',
    billing_email = 'stores@varshmaan-hospital.local',
    credit_terms = 'NET_30',
    credit_limit_paise = 500000000,
    uniform_discount_bps = 1000,
    updated_at = NOW()
FROM demo_ctx d
WHERE a.tenant_id = d.tenant_id;

DROP TABLE IF EXISTS demo_hosp_acct;
CREATE TEMP TABLE demo_hosp_acct AS
SELECT a.id
FROM hospital_credit_account a
JOIN demo_ctx d ON d.tenant_id = a.tenant_id
LIMIT 1;

INSERT INTO hospital_product_price_rule (
    id, tenant_id, product_id, rule_type, value, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-price', n),
    d.tenant_id,
    local_demo_uuid('product', n),
    CASE n WHEN 81 THEN 'FLAT_PAISE' ELSE 'PERCENT' END,
    CASE n WHEN 1 THEN 2000 WHEN 16 THEN 1500 ELSE 800 END,
    0,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '40 days'
FROM demo_ctx d
CROSS JOIN (VALUES (1), (16), (81)) AS v(n)
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE demo_ward (
    n int PRIMARY KEY,
    branch_tag text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    floor text NOT NULL,
    category text NOT NULL,
    capacity int NOT NULL,
    nurse text NOT NULL
);

INSERT INTO demo_ward (n, branch_tag, name, code, floor, category, capacity, nurse)
VALUES
    (1, 'br01', 'General Ward', 'GEN', '2', 'GENERAL', 10, 'Sister Lakshmi'),
    (2, 'br01', 'ICU', 'ICU', '1', 'ICU', 6, 'Sister Anita'),
    (3, 'br01', 'Pediatric', 'PED', '3', 'PEDIATRIC', 8, 'Sister Kavya'),
    (4, 'br01', 'Maternity', 'MAT', '3', 'MATERNITY', 6, 'Sister Meena'),
    (5, 'br01', 'Surgical', 'SUR', '2', 'SURGICAL', 8, 'Sister Rohini'),
    (6, 'br01', 'Private Rooms', 'PVT', '4', 'PRIVATE', 4, 'Sister Divya'),
    (7, 'br02', 'Day Care', 'DAY', '1', 'GENERAL', 4, 'Sister Farah');

INSERT INTO hospital_ward (
    id, tenant_id, branch_id, name, code, floor, category, capacity, nurse_in_charge,
    version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-ward', w.n),
    d.tenant_id,
    CASE WHEN w.branch_tag = 'br01' THEN d.br01 ELSE d.br02 END,
    w.name,
    w.code,
    w.floor,
    w.category,
    w.capacity,
    w.nurse,
    0,
    NOW() - INTERVAL '50 days',
    NOW() - INTERVAL '2 days'
FROM demo_ctx d
JOIN demo_ward w ON TRUE
WHERE (w.branch_tag = 'br01' AND d.br01 IS NOT NULL)
   OR (w.branch_tag = 'br02' AND d.br02 IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE demo_bed AS
SELECT
    row_number() OVER (ORDER BY w.n, s)::int AS bed_n,
    w.n AS ward_n,
    s AS seq,
    w.code || '-' || s::text AS label,
    w.branch_tag
FROM demo_ward w
CROSS JOIN LATERAL generate_series(1, w.capacity) AS s;

INSERT INTO hospital_bed (
    id, tenant_id, branch_id, ward_id, sequence_no, label, occupancy_status,
    version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-bed', b.bed_n),
    d.tenant_id,
    CASE WHEN b.branch_tag = 'br01' THEN d.br01 ELSE d.br02 END,
    local_demo_uuid('hosp-ward', b.ward_n),
    b.seq,
    b.label,
    'FREE',
    0,
    NOW() - INTERVAL '50 days',
    NOW() - INTERVAL '50 days'
FROM demo_ctx d
JOIN demo_bed b ON TRUE
WHERE (b.branch_tag = 'br01' AND d.br01 IS NOT NULL)
   OR (b.branch_tag = 'br02' AND d.br02 IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_department (
    id, tenant_id, name, type, head_doctor_id, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-dept', n),
    d.tenant_id,
    v.name,
    v.type,
    local_demo_uuid('doctor', v.head_n),
    0,
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '10 days'
FROM demo_ctx d
CROSS JOIN (VALUES
    (1, 'General Medicine', 'IPD', 1),
    (2, 'Cardiology', 'OPD', 2),
    (3, 'Orthopaedics', 'OPD', 3),
    (4, 'Paediatrics', 'IPD', 5),
    (5, 'Obstetrics & Gynaecology', 'IPD', 6),
    (6, 'Radiology', 'DIAGNOSTIC', 11),
    (7, 'Emergency', 'OPD', 8)
) AS v(n, name, type, head_n)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_doctor (
    id, tenant_id, doctor_id, department_id, qualification, specialty, gender,
    experience_years, email, opd_room, consulting_days, consulting_hours,
    consultation_fee_paise, status, languages, notes, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-doc', n),
    d.tenant_id,
    local_demo_uuid('doctor', n),
    local_demo_uuid('hosp-dept', (ARRAY[1, 2, 3, 1, 4, 5, 3, 7, 2, 1, 6, 4, 5, 7])[n]),
    (ARRAY['MBBS, MD','MBBS, DM','MBBS, MS','MBBS, MD','MBBS, DCH',
           'MBBS, MS','MBBS, MS','MBBS, MD','MBBS, DM','MBBS, MD',
           'MBBS, MD','MBBS, DCH','MBBS, MS','MBBS'])[n],
    (ARRAY['General Medicine','Cardiology','Orthopaedics','Internal Medicine','Paediatrics',
           'Obstetrics','Orthopaedics','Emergency Medicine','Cardiology','General Medicine',
           'Radiology','Paediatrics','Gynaecology','Emergency Medicine'])[n],
    CASE WHEN n IN (1, 3, 5, 6, 9, 13) THEN 'Female' ELSE 'Male' END,
    6 + (n * 2),
    'doctor' || n::text || '@varshmaan-hospital.local',
    'OPD-' || lpad(n::text, 2, '0'),
    CASE WHEN n IN (8, 14) THEN 'Daily' WHEN n = 12 THEN 'Mon, Wed, Fri' ELSE 'Mon–Sat' END,
    CASE WHEN n IN (8, 14) THEN '08:00–20:00' ELSE '10:00–14:00' END,
    (40000 + n * 5000)::bigint,
    CASE WHEN n = 12 THEN 'ON_LEAVE' WHEN n = 14 THEN 'VISITING' ELSE 'AVAILABLE' END,
    'English, Kannada, Hindi',
    CASE WHEN n = 12 THEN 'On leave until next week' WHEN n = 14 THEN 'Visiting casualty consultant' ELSE NULL END,
    0,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '3 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 14) AS n
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE demo_adm (
    n int PRIMARY KEY,
    ward_n int NOT NULL,
    bed_seq int NOT NULL,
    status text NOT NULL,
    payer text NOT NULL,
    insurer text,
    policy text,
    diagnosis text NOT NULL,
    admitted_days int NOT NULL,
    discharged_days int
);

INSERT INTO demo_adm (
    n, ward_n, bed_seq, status, payer, insurer, policy, diagnosis, admitted_days, discharged_days
)
VALUES
    (1, 1, 1, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Community-acquired pneumonia', 6, NULL),
    (2, 1, 2, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Uncontrolled type 2 diabetes', 4, NULL),
    (3, 1, 3, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Dengue with warning signs', 3, NULL),
    (4, 1, 4, 'ACTIVE', 'INSURANCE_TPA', 'Star Health', 'STAR-KA-88421', 'Acute gastritis', 8, NULL),
    (5, 1, 5, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Hypertensive urgency', 2, NULL),
    (6, 1, 6, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Viral fever with dehydration', 1, NULL),
    (7, 2, 1, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Sepsis — watchers', 5, NULL),
    (8, 2, 2, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Acute coronary syndrome', 3, NULL),
    (9, 2, 3, 'ACTIVE', 'INSURANCE_TPA', 'ICICI Lombard', 'ICICI-H-10229', 'Post-op monitoring', 7, NULL),
    (10, 3, 1, 'ACTIVE', 'INSURANCE_TPA', 'Niva Bupa', 'NB-PED-44012', 'Acute bronchiolitis', 4, NULL),
    (11, 3, 2, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Enteric fever', 2, NULL),
    (12, 3, 3, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Febrile seizure workup', 1, NULL),
    (13, 4, 1, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'LSCS — day 2', 2, NULL),
    (14, 4, 2, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Threatened preterm labour', 3, NULL),
    (15, 5, 1, 'ACTIVE', 'INSURANCE_TPA', 'Star Health', 'STAR-SUR-33108', 'ORIF tibia', 5, NULL),
    (16, 5, 2, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Appendicectomy — day 1', 1, NULL),
    (17, 5, 3, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Cholecystectomy — day 3', 3, NULL),
    (18, 6, 1, 'ACTIVE', 'SELF_PAY', NULL, NULL, 'Elective hernia repair', 2, NULL),
    (19, 1, 7, 'DISCHARGED', 'SELF_PAY', NULL, NULL, 'UTI — completed course', 12, 2),
    (20, 2, 4, 'DISCHARGED', 'SELF_PAY', NULL, NULL, 'DKA — resolved', 14, 4),
    (21, 5, 4, 'DISCHARGED', 'INSURANCE_TPA', 'Niva Bupa', 'NB-SUR-11990', 'Laparoscopic cholecystectomy', 10, 3),
    (22, 6, 2, 'DISCHARGED', 'SELF_PAY', NULL, NULL, 'Observation — discharged well', 9, 1);

INSERT INTO hospital_admission (
    id, tenant_id, branch_id, uhid, patient_name, phone, age, gender, customer_id,
    ward_id, bed_id, attending_doctor_id, diagnosis, payer_type, insurer_name, policy_number,
    status, admitted_at, discharged_at, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-adm', a.n),
    d.tenant_id,
    d.br01,
    'UHID-' || lpad(a.n::text, 5, '0'),
    c.name,
    c.phone,
    GREATEST(1, EXTRACT(YEAR FROM age(CURRENT_DATE, c.date_of_birth))::int),
    c.gender,
    c.id,
    local_demo_uuid('hosp-ward', a.ward_n),
    local_demo_uuid('hosp-bed', b.bed_n),
    local_demo_uuid('hosp-doc', 1 + ((a.n - 1) % 11)),
    a.diagnosis,
    a.payer,
    a.insurer,
    a.policy,
    a.status,
    NOW() - (a.admitted_days || ' days')::interval,
    CASE WHEN a.status = 'DISCHARGED' THEN NOW() - (a.discharged_days || ' days')::interval ELSE NULL END,
    1,
    NOW() - (a.admitted_days || ' days')::interval,
    NOW() - COALESCE(a.discharged_days, 0) * INTERVAL '1 day'
FROM demo_ctx d
JOIN demo_adm a ON TRUE
JOIN demo_bed b ON b.ward_n = a.ward_n AND b.seq = a.bed_seq
JOIN customer c ON c.id = local_demo_uuid('customer', a.n)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

UPDATE hospital_bed b
SET occupancy_status = 'OCCUPIED',
    updated_at = NOW()
FROM hospital_admission a
WHERE a.bed_id = b.id
  AND a.status = 'ACTIVE'
  AND a.tenant_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO hospital_uhid_sequence (tenant_id, next_value)
SELECT d.tenant_id, 25
FROM demo_ctx d
ON CONFLICT (tenant_id) DO UPDATE
SET next_value = GREATEST(hospital_uhid_sequence.next_value, EXCLUDED.next_value);

CREATE TEMP TABLE demo_indent (
    n int PRIMARY KEY,
    ward_n int NOT NULL,
    bed_seq int,
    patient_n int,
    status text NOT NULL,
    requested_by text NOT NULL,
    hours_ago int NOT NULL,
    note text
);

INSERT INTO demo_indent (n, ward_n, bed_seq, patient_n, status, requested_by, hours_ago, note)
VALUES
    (1, 1, NULL, NULL, 'PENDING', 'Sister Lakshmi', 2, 'Floor stock — evening round'),
    (2, 2, 1, 7, 'PENDING', 'Sister Anita', 5, 'Patient-specific ICU refill'),
    (3, 5, NULL, NULL, 'APPROVED', 'Sister Rohini', 20, 'Ready to issue — surgical trolley'),
    (4, 3, NULL, NULL, 'REJECTED', 'Sister Kavya', 30, 'Duplicate of yesterday''s indent'),
    (5, 1, NULL, NULL, 'ISSUED', 'Sister Lakshmi', 24 * 69, 'Issued as WS/2026-27/BR01/00001'),
    (6, 2, NULL, NULL, 'ISSUED', 'Sister Anita', 24 * 40, 'Issued as WS/2026-27/BR01/00002'),
    (7, 5, NULL, NULL, 'ISSUED', 'Sister Rohini', 24 * 20, 'Issued as WS/2026-27/BR01/00003'),
    (8, 1, 1, 1, 'ISSUED', 'Sister Lakshmi', 24 * 5, 'Patient refill UHID-00001');

INSERT INTO hospital_indent (
    id, tenant_id, branch_id, indent_number, ward_id, bed_id, patient_name, note,
    requested_by, requested_at, status, hospital_invoice_ref, issued_at,
    version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-ind', i.n),
    d.tenant_id,
    d.br01,
    'IND-' || lpad(i.n::text, 5, '0'),
    local_demo_uuid('hosp-ward', i.ward_n),
    CASE WHEN i.bed_seq IS NULL THEN NULL ELSE local_demo_uuid(
        'hosp-bed',
        (SELECT b.bed_n FROM demo_bed b WHERE b.ward_n = i.ward_n AND b.seq = i.bed_seq)
    ) END,
    CASE WHEN i.patient_n IS NULL THEN NULL ELSE (
        SELECT c.name FROM customer c WHERE c.id = local_demo_uuid('customer', i.patient_n)
    ) END,
    i.note,
    i.requested_by,
    NOW() - (i.hours_ago || ' hours')::interval,
    i.status,
    CASE i.n WHEN 5 THEN 'WS/2026-27/BR01/00001' WHEN 6 THEN 'WS/2026-27/BR01/00002'
             WHEN 7 THEN 'WS/2026-27/BR01/00003' WHEN 8 THEN 'WS/2026-27/BR01/00004' ELSE NULL END,
    CASE WHEN i.status = 'ISSUED' THEN NOW() - (i.hours_ago || ' hours')::interval + INTERVAL '2 hours' ELSE NULL END,
    1,
    NOW() - (i.hours_ago || ' hours')::interval,
    NOW() - (i.hours_ago || ' hours')::interval
FROM demo_ctx d
JOIN demo_indent i ON TRUE
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_indent_sequence (id, tenant_id, branch_id, next_value)
SELECT local_demo_uuid('hosp-ind-seq', 1), d.tenant_id, d.br01, 9
FROM demo_ctx d
WHERE d.br01 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM hospital_indent_sequence s
      WHERE s.tenant_id = d.tenant_id AND s.branch_id = d.br01
  )
ON CONFLICT (id) DO NOTHING;

UPDATE hospital_indent_sequence
SET next_value = GREATEST(next_value, 9)
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

CREATE TEMP TABLE demo_ind_line (
    indent_n int NOT NULL,
    sort_order int NOT NULL,
    prod_n int NOT NULL,
    qty numeric NOT NULL
);

INSERT INTO demo_ind_line (indent_n, sort_order, prod_n, qty)
VALUES
    (1, 0, 81, 10), (1, 1, 85, 8),
    (2, 0, 83, 6),
    (3, 0, 89, 12), (3, 1, 90, 8),
    (4, 0, 82, 20),
    (5, 0, 81, 12), (5, 1, 82, 10),
    (6, 0, 83, 8), (6, 1, 84, 8),
    (7, 0, 85, 10),
    (8, 0, 86, 4);

INSERT INTO hospital_indent_line (
    id, tenant_id, branch_id, indent_id, product_id, product_name, sku,
    requested_qty, issued_qty, sort_order, created_at
)
SELECT
    local_demo_uuid('hosp-ind-line', l.indent_n * 10 + l.sort_order),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-ind', l.indent_n),
    p.id,
    p.name,
    p.sku,
    l.qty,
    CASE WHEN i.status = 'ISSUED' THEN l.qty ELSE 0 END,
    l.sort_order,
    NOW() - (i.hours_ago || ' hours')::interval
FROM demo_ctx d
JOIN demo_ind_line l ON TRUE
JOIN demo_indent i ON i.n = l.indent_n
JOIN product p ON p.id = local_demo_uuid('product', l.prod_n)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE demo_price AS
SELECT
    n AS prod_n,
    (5500 + ((n % 20) * 250))::bigint AS mrp,
    CASE
        WHEN n = 81 THEN 800
        WHEN n = 1 THEN round((5500 + ((n % 20) * 250)) * 0.20)::bigint
        WHEN n = 16 THEN round((5500 + ((n % 20) * 250)) * 0.15)::bigint
        ELSE round((5500 + ((n % 20) * 250)) * 0.10)::bigint
    END AS discount
FROM generate_series(1, 110) AS n;

CREATE TEMP TABLE demo_issue (
    n int PRIMARY KEY,
    ward_n int NOT NULL,
    indent_n int,
    reason text NOT NULL,
    uhid text,
    patient_n int,
    issued_at timestamptz NOT NULL
);

INSERT INTO demo_issue (n, ward_n, indent_n, reason, uhid, patient_n, issued_at)
SELECT * FROM (VALUES
    (1, 1, 5, 'FLOOR_STOCK', NULL, NULL, NOW() - INTERVAL '69 days'),
    (2, 2, 6, 'FLOOR_STOCK', NULL, NULL, NOW() - INTERVAL '40 days'),
    (3, 5, 7, 'CONSUMPTION', NULL, NULL, NOW() - INTERVAL '20 days'),
    (4, 1, 8, 'PATIENT_REFILL', 'UHID-00001', 1, NOW() - INTERVAL '5 days'),
    (5, 1, NULL, 'FLOOR_STOCK', NULL, NULL, NOW() - INTERVAL '2 days'),
    (6, 3, NULL, 'PATIENT_REFILL', 'UHID-00010', 10, NOW() - INTERVAL '8 hours')
) AS v(n, ward_n, indent_n, reason, uhid, patient_n, issued_at);

CREATE TEMP TABLE demo_issue_line (
    issue_n int NOT NULL,
    sort_order int NOT NULL,
    prod_n int NOT NULL,
    qty numeric NOT NULL
);

INSERT INTO demo_issue_line (issue_n, sort_order, prod_n, qty)
VALUES
    (1, 0, 81, 12), (1, 1, 82, 10),
    (2, 0, 83, 8), (2, 1, 84, 8),
    (3, 0, 85, 10),
    (4, 0, 86, 4),
    (5, 0, 87, 12),
    (6, 0, 88, 5);

INSERT INTO hospital_issue (
    id, tenant_id, branch_id, invoice_number, ward_id, indent_id, reason, uhid, patient_name,
    pharmacy_name, pharmacy_address, pharmacy_gstin, pharmacy_drug_license,
    hospital_name, hospital_gstin, credit_terms, mrp_value_paise, billed_paise,
    issued_at, idempotency_key, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-iss', i.n),
    d.tenant_id,
    d.br01,
    'WS/2026-27/BR01/' || lpad(i.n::text, 5, '0'),
    local_demo_uuid('hosp-ward', i.ward_n),
    CASE WHEN i.indent_n IS NULL THEN NULL ELSE local_demo_uuid('hosp-ind', i.indent_n) END,
    i.reason,
    i.uhid,
    CASE WHEN i.patient_n IS NULL THEN NULL ELSE (
        SELECT c.name FROM customer c WHERE c.id = local_demo_uuid('customer', i.patient_n)
    ) END,
    'Varshmaan Pharmacy',
    '14 100 Feet Road, Indiranagar, Bengaluru 560038',
    '29AABCV1111A1Z5',
    'KA-DL20-B-12345',
    'Varshmaan Medical Centre',
    '29AABCV2222B1Z6',
    'NET_30',
    (SELECT SUM(pr.mrp * l.qty)::bigint
     FROM demo_issue_line l JOIN demo_price pr ON pr.prod_n = l.prod_n
     WHERE l.issue_n = i.n),
    (SELECT SUM((pr.mrp - pr.discount) * l.qty)::bigint
     FROM demo_issue_line l JOIN demo_price pr ON pr.prod_n = l.prod_n
     WHERE l.issue_n = i.n),
    i.issued_at,
    'demo-hosp-issue-' || i.n::text,
    0,
    i.issued_at,
    i.issued_at
FROM demo_ctx d
JOIN demo_issue i ON TRUE
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_issue_line (
    id, tenant_id, branch_id, issue_id, product_id, product_name, sku,
    batch_id, batch_number, expiry_on, hsn_code, gst_rate, quantity,
    mrp_paise, credit_price_paise, discount_bps, amount_paise, sort_order, created_at
)
SELECT
    local_demo_uuid('hosp-iss-line', l.issue_n * 10 + l.sort_order),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-iss', l.issue_n),
    p.id,
    p.name,
    p.sku,
    local_demo_uuid('batch-a', l.prod_n),
    'A26-' || lpad(l.prod_n::text, 4, '0'),
    DATE '2027-08-01',
    p.hsn_code,
    p.gst_rate,
    l.qty,
    pr.mrp,
    pr.mrp - pr.discount,
    CASE WHEN pr.mrp = 0 THEN 0 ELSE round(pr.discount * 10000.0 / pr.mrp)::int END,
    (pr.mrp - pr.discount) * l.qty,
    l.sort_order,
    i.issued_at
FROM demo_ctx d
JOIN demo_issue_line l ON TRUE
JOIN demo_issue i ON i.n = l.issue_n
JOIN demo_price pr ON pr.prod_n = l.prod_n
JOIN product p ON p.id = local_demo_uuid('product', l.prod_n)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_ws_invoice_sequence (id, tenant_id, branch_id, financial_year, next_value)
SELECT local_demo_uuid('hosp-ws-seq', 1), d.tenant_id, d.br01, '2026-27', 7
FROM demo_ctx d
WHERE d.br01 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM hospital_ws_invoice_sequence s
      WHERE s.tenant_id = d.tenant_id AND s.branch_id = d.br01 AND s.financial_year = '2026-27'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE hospital_ws_invoice_sequence
SET next_value = GREATEST(next_value, 7)
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  AND financial_year = '2026-27';

INSERT INTO hospital_ward_stock (
    id, tenant_id, branch_id, ward_id, product_id, quantity, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-wstock', i.ward_n * 100 + l.prod_n),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-ward', i.ward_n),
    local_demo_uuid('product', l.prod_n),
    SUM(l.qty) - CASE WHEN i.ward_n = 1 AND l.prod_n = 81 THEN 3 ELSE 0 END,
    1,
    MIN(i.issued_at),
    NOW()
FROM demo_ctx d
JOIN demo_issue i ON TRUE
JOIN demo_issue_line l ON l.issue_n = i.n
WHERE d.br01 IS NOT NULL
GROUP BY d.tenant_id, d.br01, i.ward_n, l.prod_n
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_ledger_entry (
    id, tenant_id, branch_id, account_id, kind, debit_paise, credit_paise,
    issue_id, occurred_at, idempotency_key, particulars, created_at
)
SELECT
    local_demo_uuid('hosp-led-iss', i.n),
    d.tenant_id,
    d.br01,
    (SELECT id FROM demo_hosp_acct),
    'ISSUE',
    iss.billed_paise,
    0,
    iss.id,
    i.issued_at,
    'hospital-issue:' || iss.id::text,
    iss.invoice_number || ' issued',
    i.issued_at
FROM demo_ctx d
JOIN demo_issue i ON TRUE
JOIN hospital_issue iss ON iss.id = local_demo_uuid('hosp-iss', i.n)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_return (
    id, tenant_id, branch_id, issue_id, ward_id, credit_paise, occurred_at,
    idempotency_key, version, created_at, updated_at
)
SELECT
    local_demo_uuid('hosp-ret', 1),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-iss', 1),
    local_demo_uuid('hosp-ward', 1),
    (SELECT (mrp - discount) * 3 FROM demo_price WHERE prod_n = 81),
    NOW() - INTERVAL '3 days',
    'demo-hosp-return-1',
    0,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
FROM demo_ctx d
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_return_line (
    id, tenant_id, branch_id, return_id, issue_line_id, product_id, batch_id,
    quantity, credit_price_paise, amount_paise, sort_order, created_at
)
SELECT
    local_demo_uuid('hosp-ret-line', 1),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-ret', 1),
    local_demo_uuid('hosp-iss-line', 10),
    local_demo_uuid('product', 81),
    local_demo_uuid('batch-a', 81),
    3,
    pr.mrp - pr.discount,
    (pr.mrp - pr.discount) * 3,
    0,
    NOW() - INTERVAL '3 days'
FROM demo_ctx d
JOIN demo_price pr ON pr.prod_n = 81
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_ledger_entry (
    id, tenant_id, branch_id, account_id, kind, debit_paise, credit_paise,
    issue_id, return_id, occurred_at, idempotency_key, particulars, created_at
)
SELECT
    local_demo_uuid('hosp-led-ret', 1),
    d.tenant_id,
    d.br01,
    (SELECT id FROM demo_hosp_acct),
    'RETURN',
    0,
    r.credit_paise,
    r.issue_id,
    r.id,
    r.occurred_at,
    'hospital-return:' || r.id::text,
    'Return of WS/2026-27/BR01/00001',
    r.occurred_at
FROM demo_ctx d
JOIN hospital_return r ON r.id = local_demo_uuid('hosp-ret', 1)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_ledger_entry (
    id, tenant_id, branch_id, account_id, kind, debit_paise, credit_paise,
    payment_mode, payment_reference, particulars, occurred_at, idempotency_key, created_at
)
SELECT
    local_demo_uuid('hosp-led-pay', n),
    d.tenant_id,
    d.br01,
    (SELECT id FROM demo_hosp_acct),
    'PAYMENT',
    0,
    v.amount,
    v.mode,
    v.ref,
    'Payment ' || v.mode || ' ' || v.ref,
    v.at,
    'demo-hosp-pay-' || n::text,
    v.at
FROM demo_ctx d
CROSS JOIN (VALUES
    (1, 200000::bigint, 'NEFT', 'NEFT-VMC-8841', NOW() - INTERVAL '20 days'),
    (2, 150000::bigint, 'UPI', 'UPI-VMC-2290', NOW() - INTERVAL '1 day')
) AS v(n, amount, mode, ref, at)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

UPDATE hospital_credit_account a
SET balance_paise = COALESCE((
        SELECT SUM(e.debit_paise) - SUM(e.credit_paise)
        FROM hospital_ledger_entry e
        WHERE e.account_id = a.id
    ), 0),
    version = 4,
    updated_at = NOW()
WHERE a.id = (SELECT id FROM demo_hosp_acct);

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('hosp-mov-out', l.issue_n * 10 + l.sort_order),
    d.tenant_id,
    d.br01,
    local_demo_uuid('product', l.prod_n),
    local_demo_uuid('batch-a', l.prod_n),
    local_demo_uuid('bal-a-br01', l.prod_n),
    'STOCK_OUT',
    l.qty,
    COALESCE((
        SELECT m2.balance_after
        FROM stock_movement m2
        WHERE m2.balance_id = local_demo_uuid('bal-a-br01', l.prod_n)
        ORDER BY m2.occurred_at DESC, m2.id DESC
        LIMIT 1
    ), sb.quantity)
    - SUM(l.qty) OVER (
        PARTITION BY l.prod_n
        ORDER BY i.issued_at, l.sort_order
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    b.purchase_price_paise,
    'hospital-issue:' || local_demo_uuid('hosp-iss', l.issue_n)::text
        || ':' || local_demo_uuid('hosp-iss-line', l.issue_n * 10 + l.sort_order)::text,
    d.pharmacist_id,
    i.issued_at,
    i.issued_at
FROM demo_ctx d
JOIN demo_issue_line l ON TRUE
JOIN demo_issue i ON i.n = l.issue_n
JOIN stock_batch b ON b.id = local_demo_uuid('batch-a', l.prod_n)
JOIN stock_balance sb ON sb.id = local_demo_uuid('bal-a-br01', l.prod_n)
WHERE d.br01 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM stock_movement m
      WHERE m.id = local_demo_uuid('hosp-mov-out', l.issue_n * 10 + l.sort_order)
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('hosp-mov-in', 1),
    d.tenant_id,
    d.br01,
    local_demo_uuid('product', 81),
    local_demo_uuid('batch-a', 81),
    local_demo_uuid('bal-a-br01', 81),
    'STOCK_IN',
    3,
    COALESCE((
        SELECT m2.balance_after
        FROM stock_movement m2
        WHERE m2.balance_id = local_demo_uuid('bal-a-br01', 81)
        ORDER BY m2.occurred_at DESC, m2.id DESC
        LIMIT 1
    ), sb.quantity) + 3,
    b.purchase_price_paise,
    'hospital-return:' || local_demo_uuid('hosp-ret', 1)::text
        || ':' || local_demo_uuid('hosp-ret-line', 1)::text,
    d.inventory_id,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
FROM demo_ctx d
JOIN stock_batch b ON b.id = local_demo_uuid('batch-a', 81)
JOIN stock_balance sb ON sb.id = local_demo_uuid('bal-a-br01', 81)
WHERE d.br01 IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM stock_movement m WHERE m.id = local_demo_uuid('hosp-mov-in', 1)
  )
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE demo_hosp_inv (
    n int PRIMARY KEY,
    source text NOT NULL,
    admission_n int,
    casualty_uhid text,
    unpaid boolean NOT NULL,
    billed_at timestamptz NOT NULL
);

INSERT INTO demo_hosp_inv (n, source, admission_n, casualty_uhid, unpaid, billed_at)
SELECT n, source, admission_n, casualty_uhid, unpaid,
       NOW() - ((n % 9) || ' days')::interval - ((n % 5) || ' hours')::interval
FROM (VALUES
    (1, 'WARD', 1, NULL, TRUE),
    (2, 'WARD', 2, NULL, TRUE),
    (3, 'WARD', 3, NULL, FALSE),
    (4, 'WARD', 4, NULL, FALSE),
    (5, 'WARD', 5, NULL, TRUE),
    (6, 'WARD', 6, NULL, FALSE),
    (7, 'WARD', 7, NULL, FALSE),
    (8, 'WARD', 8, NULL, TRUE),
    (9, 'WARD', 9, NULL, FALSE),
    (10, 'WARD', 10, NULL, FALSE),
    (11, 'WARD', 11, NULL, FALSE),
    (12, 'WARD', 12, NULL, FALSE),
    (13, 'OPD_RX', NULL, NULL, FALSE),
    (14, 'OPD_RX', NULL, NULL, FALSE),
    (15, 'OPD_RX', NULL, NULL, FALSE),
    (16, 'OPD_RX', NULL, NULL, FALSE),
    (17, 'OPD_RX', NULL, NULL, FALSE),
    (18, 'OPD_RX', NULL, NULL, FALSE),
    (19, 'OPD_RX', NULL, NULL, FALSE),
    (20, 'OPD_RX', NULL, NULL, FALSE),
    (21, 'EMERGENCY', 13, NULL, FALSE),
    (22, 'EMERGENCY', 14, NULL, FALSE),
    (23, 'EMERGENCY', 15, NULL, FALSE),
    (24, 'EMERGENCY', 16, NULL, FALSE),
    (25, 'EMERGENCY', NULL, 'UHID-00023', TRUE),
    (26, 'EMERGENCY', NULL, 'UHID-00024', TRUE),
    (27, 'WARD', 19, NULL, FALSE),
    (28, 'WARD', 19, NULL, FALSE),
    (29, 'WARD', 18, NULL, FALSE),
    (30, 'OPD_RX', NULL, NULL, FALSE)
) AS v(n, source, admission_n, casualty_uhid, unpaid);

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
    completed_at, complete_idempotency_key, idempotency_key, version, created_at, updated_at,
    sale_source, uhid, ward_id, admission_id, insurer_name, policy_number
)
SELECT
    local_demo_uuid('hosp-inv', h.n),
    d.tenant_id,
    d.br01,
    'INV/2026-27/BR01/' || lpad((800 + h.n)::text, 5, '0'),
    'COMPLETED',
    CASE WHEN h.source = 'OPD_RX' THEN d.staff_id ELSE d.pharmacist_id END,
    d.terminal_id,
    CASE
        WHEN h.admission_n IS NOT NULL THEN local_demo_uuid('customer', h.admission_n)
        WHEN h.source = 'OPD_RX' THEN local_demo_uuid('customer', 40 + (h.n % 20))
        ELSE NULL
    END,
    CASE WHEN h.source = 'OPD_RX' THEN local_demo_uuid('doctor', 1 + ((h.n - 1) % 14)) ELSE NULL END,
    CASE WHEN h.source = 'OPD_RX' THEN 'RX-HOSP-' || lpad(h.n::text, 3, '0') ELSE NULL END,
    h.source = 'OPD_RX',
    0, 0, 0, 0,
    'NONE', 0,
    NULL,
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
    h.billed_at,
    'demo-hosp-complete-' || h.n::text,
    'demo-hosp-inv-' || h.n::text,
    3,
    h.billed_at,
    h.billed_at,
    h.source,
    COALESCE(
        h.casualty_uhid,
        CASE WHEN h.admission_n IS NOT NULL THEN 'UHID-' || lpad(h.admission_n::text, 5, '0') ELSE NULL END
    ),
    CASE
        WHEN h.source = 'WARD' AND h.admission_n IS NOT NULL THEN local_demo_uuid(
            'hosp-ward', (SELECT a.ward_n FROM demo_adm a WHERE a.n = h.admission_n)
        )
        WHEN h.source = 'EMERGENCY' AND h.admission_n IS NOT NULL THEN local_demo_uuid(
            'hosp-ward', (SELECT a.ward_n FROM demo_adm a WHERE a.n = h.admission_n)
        )
        ELSE NULL
    END,
    CASE WHEN h.admission_n IS NOT NULL THEN local_demo_uuid('hosp-adm', h.admission_n) ELSE NULL END,
    CASE WHEN h.admission_n IS NOT NULL THEN (SELECT a.insurer FROM demo_adm a WHERE a.n = h.admission_n) ELSE NULL END,
    CASE WHEN h.admission_n IS NOT NULL THEN (SELECT a.policy FROM demo_adm a WHERE a.n = h.admission_n) ELSE NULL END
FROM demo_ctx d
JOIN demo_hosp_inv h ON TRUE
WHERE d.br01 IS NOT NULL
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
    local_demo_uuid('hosp-inv-line', h.n * 10 + k),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-inv', h.n),
    p.id,
    p.name,
    p.sku,
    local_demo_uuid('batch-a', x.prod_n),
    'A26-' || lpad(x.prod_n::text, 4, '0'),
    DATE '2027-08-01',
    1,
    p.base_unit,
    1,
    CASE WHEN h.source = 'OPD_RX' THEN 10 ELSE NULL END,
    x.mrp,
    x.selling,
    0, 'NONE', 0, 0,
    p.hsn_code,
    'GST',
    p.gst_rate,
    'PRODUCT',
    p.gst_rate,
    local_demo_tax(x.selling, p.gst_rate) / 2,
    local_demo_tax(x.selling, p.gst_rate) - (local_demo_tax(x.selling, p.gst_rate) / 2),
    0,
    x.selling,
    local_demo_tax(x.selling, p.gst_rate),
    x.selling + local_demo_tax(x.selling, p.gst_rate),
    p.schedule_classification,
    p.controlled_substance,
    k,
    h.billed_at,
    0
FROM demo_ctx d
JOIN demo_hosp_inv h ON TRUE
CROSS JOIN generate_series(1, 2) AS k
CROSS JOIN LATERAL (
    SELECT
        30 + ((h.n + k - 2) % 12) AS prod_n,
        (5000 + ((30 + ((h.n + k - 2) % 12)) % 20) * 250) AS selling,
        (5500 + ((30 + ((h.n + k - 2) % 12)) % 20) * 250) AS mrp
) x
JOIN product p ON p.id = local_demo_uuid('product', x.prod_n)
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

UPDATE sales_invoice si
SET
    subtotal_paise = s.subtotal,
    tax_paise = s.tax,
    total_paise = s.total,
    cgst_paise = s.cgst,
    sgst_paise = s.sgst,
    amount_paid_paise = CASE WHEN h.unpaid THEN 0 ELSE s.total END,
    amount_due_paise = CASE WHEN h.unpaid THEN s.total ELSE 0 END
FROM demo_hosp_inv h
JOIN LATERAL (
    SELECT
        COALESCE(SUM(l.line_taxable_paise), 0) AS subtotal,
        COALESCE(SUM(l.line_tax_paise), 0) AS tax,
        COALESCE(SUM(l.line_total_paise), 0) AS total,
        COALESCE(SUM(l.cgst_paise), 0) AS cgst,
        COALESCE(SUM(l.sgst_paise), 0) AS sgst
    FROM sales_invoice_line l
    WHERE l.sales_invoice_id = local_demo_uuid('hosp-inv', h.n)
) s ON TRUE
WHERE si.id = local_demo_uuid('hosp-inv', h.n);

INSERT INTO sales_invoice_payment (
    id, tenant_id, branch_id, sales_invoice_id, mode, amount_paise, reference, sort_order, created_at
)
SELECT
    local_demo_uuid('hosp-inv-pay', h.n),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-inv', h.n),
    CASE
        WHEN a.payer = 'INSURANCE_TPA' THEN 'INSURANCE_TPA'
        WHEN h.n % 3 = 0 THEN 'UPI'
        WHEN h.n % 3 = 1 THEN 'CARD'
        ELSE 'CASH'
    END,
    si.total_paise,
    CASE
        WHEN a.payer = 'INSURANCE_TPA' THEN a.policy
        WHEN h.n % 3 = 0 THEN 'UPI-H-' || h.n::text
        ELSE NULL
    END,
    1,
    h.billed_at
FROM demo_ctx d
JOIN demo_hosp_inv h ON TRUE
JOIN sales_invoice si ON si.id = local_demo_uuid('hosp-inv', h.n)
LEFT JOIN demo_adm a ON a.n = h.admission_n
WHERE d.br01 IS NOT NULL
  AND NOT h.unpaid
  AND si.total_paise > 0
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_movement (
    id, tenant_id, branch_id, product_id, batch_id, balance_id, type, quantity,
    balance_after, purchase_price_paise, idempotency_key, created_by_user_id, occurred_at, created_at
)
SELECT
    local_demo_uuid('hosp-sale-out', h.n * 10 + l.sort_order),
    l.tenant_id,
    l.branch_id,
    l.product_id,
    l.batch_id,
    sb.id,
    'STOCK_OUT',
    l.base_quantity,
    COALESCE((
        SELECT m2.balance_after
        FROM stock_movement m2
        WHERE m2.balance_id = sb.id
        ORDER BY m2.occurred_at DESC, m2.id DESC
        LIMIT 1
    ), sb.quantity)
    - SUM(l.base_quantity) OVER (
        PARTITION BY sb.id
        ORDER BY si.completed_at, l.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ),
    b.purchase_price_paise,
    'demo-hosp-sale-out:' || h.n::text || ':' || l.sort_order::text,
    si.staff_user_id,
    si.completed_at,
    si.completed_at
FROM demo_hosp_inv h
JOIN sales_invoice si ON si.id = local_demo_uuid('hosp-inv', h.n)
JOIN sales_invoice_line l ON l.sales_invoice_id = si.id
JOIN stock_batch b ON b.id = l.batch_id
JOIN stock_balance sb ON sb.tenant_id = l.tenant_id
    AND sb.branch_id = l.branch_id
    AND sb.product_id = l.product_id
    AND sb.batch_id = l.batch_id
WHERE NOT EXISTS (
    SELECT 1 FROM stock_movement m
    WHERE m.id = local_demo_uuid('hosp-sale-out', h.n * 10 + l.sort_order)
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hospital_patient_settlement (
    id, tenant_id, branch_id, admission_id, uhid, payment_mode, amount_paise,
    insurer_name, policy_number, idempotency_key, created_by, created_at
)
SELECT
    local_demo_uuid('hosp-settle', 1),
    d.tenant_id,
    d.br01,
    local_demo_uuid('hosp-adm', 19),
    'UHID-00019',
    'CASH',
    COALESCE((
        SELECT SUM(si.total_paise)
        FROM demo_hosp_inv h
        JOIN sales_invoice si ON si.id = local_demo_uuid('hosp-inv', h.n)
        WHERE h.admission_n = 19
    ), 1),
    NULL,
    NULL,
    'demo-hosp-settle-19',
    d.pharmacist_id,
    NOW() - INTERVAL '2 days'
FROM demo_ctx d
WHERE d.br01 IS NOT NULL
ON CONFLICT (id) DO NOTHING;

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
