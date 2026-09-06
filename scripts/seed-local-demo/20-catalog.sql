-- Local-only catalogue: 12 categories, 10 manufacturers, 110 SKUs.

INSERT INTO product_category (id, tenant_id, name, created_at, updated_at)
SELECT
    local_demo_uuid('category', n),
    d.tenant_id,
    (ARRAY[
        'Analgesics',
        'Antibiotics',
        'Antacids',
        'Cough and cold',
        'Diabetes',
        'Cardiac',
        'Vitamins',
        'Dermatology',
        'OTC',
        'FMCG',
        'Devices',
        'Controlled'
    ])[n],
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '90 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 12) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO manufacturer (id, tenant_id, name, created_at, updated_at)
SELECT
    local_demo_uuid('mfr', n),
    d.tenant_id,
    (ARRAY[
        'Sun Pharma',
        'Cipla',
        'Dr Reddy''s',
        'Alkem',
        'GSK',
        'Abbott',
        'Intas',
        'Lupin',
        'Mankind',
        'Micro Labs'
    ])[n],
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '90 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO product (
    id, tenant_id, sku, barcode, name, generic_name, brand_name, manufacturer_id, category_id,
    product_type, dosage_form, therapeutic_class, composition, strength, route,
    prescription_required, schedule_classification, hsn_code, gst_rate,
    base_unit, pack_size, pack_unit, pack_description, quantity_precision,
    requires_cold_storage, rack_location, reorder_level, reorder_quantity, minimum_stock,
    is_discontinued, is_returnable, is_taxable, requires_batch_tracking, requires_expiry_tracking,
    requires_serial_tracking, controlled_substance, is_active, created_at, updated_at
)
SELECT
    local_demo_uuid('product', n),
    d.tenant_id,
    'VM-' || lpad(n::text, 4, '0'),
    '890' || lpad(n::text, 10, '0'),
    CASE
        WHEN n = 1 THEN 'Paracetamol 500mg'
        WHEN n BETWEEN 96 AND 100 THEN
            (ARRAY['Alprazolam 0.5mg','Tramadol 50mg','Codeine syrup','Morphine 10mg','Lorazepam 1mg'])[n - 95]
        WHEN n >= 101 THEN
            (ARRAY['Dettol 125ml','Colgate 100g','Stayfree 8s','Horlicks 500g','Ensure 400g',
                   'Glucometer strips','Digital thermometer','Face mask 50s','Hand sanitizer 100ml','ORS orange'])[n - 100]
        ELSE
            (ARRAY[
                'Dolo','Crocin','Azithral','Augmentin','Pantop','Rantac','Asthalin','Montair',
                'Glycomet','Telma','Ecosprin','Atorva','Shelcal','Becosules','Cetrizine','Allegra',
                'Sinarest','Benadryl','Ibugesic','Calpol'
            ])[1 + ((n - 2) % 20)]
            || ' '
            || (ARRAY['250mg','500mg','650mg','10mg','20mg'])[1 + ((n - 2) % 5)]
    END,
    CASE
        WHEN n = 1 THEN 'Paracetamol'
        WHEN n BETWEEN 96 AND 100 THEN
            (ARRAY['Alprazolam','Tramadol','Codeine','Morphine','Lorazepam'])[n - 95]
        WHEN n >= 101 THEN NULL
        ELSE (ARRAY['Paracetamol','Azithromycin','Amoxicillin','Pantoprazole','Metformin'])[1 + ((n - 2) % 5)]
    END,
    CASE WHEN n = 1 THEN 'Dolo' ELSE 'Varshmaan' END,
    local_demo_uuid('mfr', 1 + ((n - 1) % 10)),
    local_demo_uuid(
        'category',
        CASE
            WHEN n BETWEEN 96 AND 100 THEN 12
            WHEN n >= 101 THEN 10
            ELSE 1 + ((n - 1) % 9)
        END
    ),
    CASE
        WHEN n BETWEEN 96 AND 100 THEN 'Medicine'
        WHEN n >= 107 THEN 'Device'
        WHEN n >= 101 THEN 'FMCG'
        ELSE 'Medicine'
    END::varchar,
    CASE
        WHEN n IN (98) THEN 'Syrup'
        WHEN n >= 107 THEN 'Device'
        WHEN n >= 101 THEN 'Other'
        ELSE 'Tablet'
    END::varchar,
    CASE WHEN n BETWEEN 96 AND 100 THEN 'CNS' ELSE 'General' END,
    CASE
        WHEN n = 1 THEN 'Paracetamol 500 mg'
        WHEN n BETWEEN 96 AND 100 THEN
            (ARRAY['Alprazolam','Tramadol','Codeine phosphate','Morphine sulphate','Lorazepam'])[n - 95]
        ELSE 'Standard composition ' || n::text
    END,
    CASE WHEN n >= 101 THEN NULL ELSE (ARRAY['250mg','500mg','650mg','10mg','20mg'])[1 + ((n - 1) % 5)] END,
    CASE WHEN n >= 101 THEN 'Other' ELSE 'Oral' END::varchar,
    n BETWEEN 16 AND 100,
    CASE
        WHEN n BETWEEN 96 AND 97 THEN 'H1'
        WHEN n BETWEEN 98 AND 100 THEN 'NDPS'
        WHEN n BETWEEN 16 AND 95 THEN 'H'
        ELSE 'OTC'
    END::varchar,
    CASE WHEN n >= 101 THEN '3304' ELSE '3004' END,
    CASE WHEN n >= 101 THEN 18 ELSE 12 END,
    CASE
        WHEN n BETWEEN 1 AND 10 THEN 'Tablet'
        WHEN n = 98 THEN 'ml'
        WHEN n >= 107 THEN 'piece'
        WHEN n >= 101 THEN 'piece'
        ELSE 'Tablet'
    END::varchar,
    CASE WHEN n BETWEEN 1 AND 10 THEN 10 ELSE 1 END,
    CASE
        WHEN n BETWEEN 1 AND 10 THEN 'strip'
        WHEN n = 98 THEN 'bottle'
        WHEN n >= 101 THEN 'piece'
        ELSE 'Tablet'
    END::varchar,
    CASE WHEN n BETWEEN 1 AND 10 THEN 'Strip of 10' ELSE 'Single pack' END,
    0,
    FALSE,
    'R' || lpad((1 + ((n - 1) % 12))::text, 2, '0'),
    CASE WHEN n BETWEEN 1 AND 15 THEN 20 WHEN n BETWEEN 81 AND 95 THEN 5 ELSE 40 END,
    CASE WHEN n BETWEEN 1 AND 15 THEN 60 ELSE 80 END,
    CASE WHEN n BETWEEN 1 AND 15 THEN 10 ELSE 20 END,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    n BETWEEN 96 AND 100,
    TRUE,
    NOW() - INTERVAL '80 days',
    NOW() - INTERVAL '80 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 110) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_unit_conversion (
    id, tenant_id, product_id, unit, factor_to_base, version, created_at, updated_at
)
SELECT
    local_demo_uuid('uom', n),
    d.tenant_id,
    local_demo_uuid('product', n),
    'strip',
    10,
    1,
    NOW() - INTERVAL '80 days',
    NOW() - INTERVAL '80 days'
FROM demo_ctx d
CROSS JOIN generate_series(1, 10) AS n
ON CONFLICT (id) DO NOTHING;

INSERT INTO branch_product_stock_level (
    id, tenant_id, branch_id, product_id, reorder_level, reorder_quantity, minimum_stock,
    created_at, updated_at
)
SELECT
    local_demo_uuid('stock-level-' || b.tag, n),
    d.tenant_id,
    b.branch_id,
    local_demo_uuid('product', n),
    CASE WHEN n BETWEEN 1 AND 15 THEN 20 ELSE 40 END,
    80,
    CASE WHEN n BETWEEN 1 AND 15 THEN 10 ELSE 20 END,
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
