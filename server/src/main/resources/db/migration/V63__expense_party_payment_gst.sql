-- Expenses redesign: party, payment mode, GST, human expense number, richer categories

ALTER TABLE expense
    ADD COLUMN party_name VARCHAR(120),
    ADD COLUMN payment_mode VARCHAR(16) NOT NULL DEFAULT 'CASH',
    ADD COLUMN gst_percent SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN gst_paise BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN expense_no VARCHAR(32);

UPDATE expense e
SET expense_no = numbered.expense_no
FROM (
    SELECT
        id,
        'EXP-' || LPAD((ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id))::text, 4, '0') AS expense_no
    FROM expense
    WHERE expense_no IS NULL
) AS numbered
WHERE e.id = numbered.id;

ALTER TABLE expense
    ALTER COLUMN expense_no SET NOT NULL;

ALTER TABLE expense
    ADD CONSTRAINT chk_expense_payment_mode
        CHECK (payment_mode IN ('CASH', 'UPI', 'CARD', 'COD')),
    ADD CONSTRAINT chk_expense_gst_percent
        CHECK (gst_percent IN (0, 5, 12, 18, 28)),
    ADD CONSTRAINT chk_expense_gst_paise
        CHECK (gst_paise >= 0 AND gst_paise < amount_paise);

CREATE UNIQUE INDEX uq_expense_tenant_expense_no
    ON expense (tenant_id, expense_no);

CREATE INDEX idx_expense_tenant_party
    ON expense (tenant_id, party_name);

UPDATE expense_category
SET label = CASE code
    WHEN 'RENT' THEN 'Rent Expense'
    WHEN 'ELECTRICITY' THEN 'Electricity Bill'
    WHEN 'SALARIES' THEN 'Employee Salaries & Advances'
    WHEN 'MISCELLANEOUS' THEN 'Miscellaneous'
    ELSE label
END
WHERE tenant_id IS NULL
  AND code IN ('RENT', 'ELECTRICITY', 'SALARIES', 'MISCELLANEOUS');

INSERT INTO expense_category (id, tenant_id, code, label, system, created_at)
SELECT v.id, NULL, v.code, v.label, TRUE, TIMESTAMPTZ '2026-09-15 00:00:00+00'
FROM (
    VALUES
        ('51000000-0000-0000-0000-000000000005'::uuid, 'TELECOM', 'Telephone & Internet Expense'),
        ('51000000-0000-0000-0000-000000000006'::uuid, 'STATIONERY', 'Printing and Stationery'),
        ('51000000-0000-0000-0000-000000000007'::uuid, 'REPAIR', 'Repair & Maintenance'),
        ('51000000-0000-0000-0000-000000000008'::uuid, 'TRAVEL', 'Transportation & Travel'),
        ('51000000-0000-0000-0000-000000000009'::uuid, 'RAW_MATERIAL', 'Raw Material'),
        ('51000000-0000-0000-0000-000000000010'::uuid, 'MARKETING', 'Marketing & Promotion'),
        ('51000000-0000-0000-0000-000000000011'::uuid, 'BANK', 'Bank Charges')
) AS v(id, code, label)
WHERE NOT EXISTS (
    SELECT 1
    FROM expense_category existing
    WHERE existing.tenant_id IS NULL
      AND existing.code = v.code
);
