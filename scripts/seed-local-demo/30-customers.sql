-- Local-only CRM: ~96 patients, families, khata, loyalty, tags, refills, doctors.

INSERT INTO doctor (id, tenant_id, name, registration_number, phone, notes, created_at, updated_at)
SELECT
    local_demo_uuid('doctor', n),
    d.tenant_id,
    (ARRAY[
        'Dr Anika Rao','Dr Vikram Shetty','Dr Meera Iyer','Dr Farhan Khan','Dr Lakshmi Nair',
        'Dr Arjun Reddy','Dr Sneha Kulkarni','Dr Imran Ali','Dr Kavya Rao','Dr Rohan Das',
        'Dr Priya Menon','Dr Nikhil Joshi','Dr Asha Patil','Dr Sameer Gupta'
    ])[n],
    'KA-MCI-' || lpad(n::text, 4, '0'),
    '98400' || lpad(n::text, 5, '0'),
    'Local clinic ' || n::text,
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '70 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 14) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer (
    id, tenant_id, name, phone, email, date_of_birth, gender, address,
    blood_group, allergies, chronic_conditions, created_at, updated_at
)
SELECT
    local_demo_uuid('customer', n),
    d.tenant_id,
    CASE
        WHEN n = 1 THEN 'Anika Sharma'
        WHEN n = 2 THEN 'Rohan Sharma'
        WHEN n = 3 THEN 'Diya Sharma'
        ELSE
            (ARRAY[
                'Aarav','Vivaan','Aditya','Vihaan','Arjun','Sai','Reyansh','Ayaan','Krishna','Ishaan',
                'Ananya','Aadhya','Diya','Myra','Sara','Anvi','Pari','Navya','Kiara','Ira'
            ])[1 + ((n - 1) % 20)]
            || ' '
            || (ARRAY['Rao','Shetty','Iyer','Khan','Nair','Reddy','Kulkarni','Ali','Das','Menon','Joshi','Patil','Gupta','Mehta','Shah'])[1 + ((n - 1) % 15)]
    END
    || CASE WHEN n BETWEEN 91 AND 96 THEN ' (dup)' ELSE '' END,
    '9888' || lpad(n::text, 6, '0'),
    CASE WHEN n % 4 = 0 THEN NULL ELSE 'patient' || n::text || '@varshmaan.local' END,
    DATE '1975-01-01' + ((n * 37) % 15000),
    (ARRAY['Female','Male','Other'])[1 + ((n - 1) % 3)],
    (n % 40 + 1)::text || ' 12th Main, Indiranagar',
    (ARRAY['O+','A+','B+','AB+','O-'])[1 + ((n - 1) % 5)],
    CASE WHEN n IN (5, 8) THEN 'Amoxicillin' WHEN n = 12 THEN 'NSAIDs' ELSE NULL END,
    CASE WHEN n % 11 = 0 THEN 'Diabetes' WHEN n % 13 = 0 THEN 'Hypertension' ELSE NULL END,
    NOW() - INTERVAL '90 days' + (n || ' hours')::interval,
    NOW() - INTERVAL '20 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 96) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_family (id, tenant_id, label, created_at, updated_at)
SELECT
    local_demo_uuid('family', n),
    d.tenant_id,
    'Household ' || n::text,
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '60 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 9) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_family_member (id, tenant_id, family_id, customer_id, relationship, created_at)
SELECT
    local_demo_uuid('family-member', (n - 1) * 3 + m),
    d.tenant_id,
    local_demo_uuid('family', n),
    local_demo_uuid('customer', (n - 1) * 3 + m),
    (ARRAY['Self','Spouse','Child'])[m],
    NOW() - INTERVAL '60 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 9) AS n
CROSS JOIN generate_series(1, 3) AS m
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_credit_account (
    id, tenant_id, customer_id, limit_paise, balance_paise, version, created_at, updated_at
)
SELECT
    local_demo_uuid('credit-acct', n),
    d.tenant_id,
    local_demo_uuid('customer', n),
    5000000,
    0,
    0,
    NOW() - INTERVAL '80 days',
    NOW() - INTERVAL '80 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 25) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_loyalty_account (
    id, tenant_id, customer_id, balance_points, version, created_at, updated_at
)
SELECT
    local_demo_uuid('loyalty-acct', n),
    d.tenant_id,
    local_demo_uuid('customer', n),
    0,
    0,
    NOW() - INTERVAL '80 days',
    NOW() - INTERVAL '80 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 40) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_tag (id, tenant_id, name, created_at, updated_at)
SELECT
    local_demo_uuid('tag', n),
    d.tenant_id,
    (ARRAY[
        'Diabetes','Cardiac','Asthma','Pediatric','Geriatric','Staff family','VIP','Refill club'
    ])[n],
    NOW() - INTERVAL '70 days',
    NOW() - INTERVAL '70 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 8) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_tag_assignment (tenant_id, customer_id, tag_id, created_at)
SELECT
    d.tenant_id,
    local_demo_uuid('customer', n),
    local_demo_uuid('tag', 1 + ((n - 1) % 8)),
    NOW() - INTERVAL '50 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 80) AS n
ON CONFLICT DO NOTHING;

INSERT INTO customer_refill_schedule (
    id, tenant_id, customer_id, medicine_name, interval_days, next_due_on, version, created_at, updated_at
)
SELECT
    local_demo_uuid('refill', n),
    d.tenant_id,
    local_demo_uuid('customer', n),
    CASE WHEN n = 1 THEN 'Paracetamol 500mg' ELSE 'Glycomet 500mg' END,
    CASE WHEN n <= 8 THEN 30 ELSE 45 END,
    CASE
        WHEN n <= 6 THEN CURRENT_DATE - 3
        WHEN n <= 12 THEN CURRENT_DATE + 2
        ELSE CURRENT_DATE + 14
    END,
    0,
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '10 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 20) AS n
ON CONFLICT (id) DO NOTHING;
