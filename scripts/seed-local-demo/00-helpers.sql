-- Local-only demo helpers. Dropped at end of seed (90-checks.sql).
-- Never run against RDS / production.

CREATE OR REPLACE FUNCTION local_demo_uuid(kind text, n integer)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5('nmm-local-demo:' || kind || ':' || n::text)::uuid
$$;

CREATE OR REPLACE FUNCTION local_demo_tax(taxable_paise bigint, rate numeric)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN taxable_paise IS NULL OR taxable_paise <= 0 OR rate IS NULL OR rate <= 0 THEN 0
    ELSE round(taxable_paise * rate / 100.0)::bigint
  END
$$;

DROP TABLE IF EXISTS demo_ctx;
CREATE TEMP TABLE demo_ctx (
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  pharmacist_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  accountant_id uuid NOT NULL,
  master_id uuid NOT NULL,
  br01 uuid,
  br02 uuid,
  br03 uuid,
  terminal_id uuid NOT NULL
);

INSERT INTO demo_ctx (
  tenant_id,
  owner_id,
  staff_id,
  pharmacist_id,
  inventory_id,
  accountant_id,
  master_id,
  terminal_id
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'f70713e0-0e91-4bc3-a287-47ca3b819a25',
  'c0a1e5c0-1111-4000-8000-000000000001',
  'c0a1e5c0-1111-4000-8000-000000000002',
  'c0a1e5c0-1111-4000-8000-000000000003',
  'c0a1e5c0-1111-4000-8000-000000000004',
  'd0199133-19c9-49b0-a3bc-2bcf0bf531e9',
  'c0a1e5c0-1111-4000-8000-0000000000aa'
);
