ALTER TABLE location
    ADD COLUMN IF NOT EXISTS branch_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS drug_license_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS gstin VARCHAR(20),
    ADD COLUMN IF NOT EXISTS operating_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS branch_type VARCHAR(16),
    ADD COLUMN IF NOT EXISTS status VARCHAR(16),
    ADD COLUMN IF NOT EXISTS opening_date DATE,
    ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS linked_warehouse BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pricing_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS tax_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

WITH numbered AS (
    SELECT id,
           'BR' || LPAD(
               ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id)::text,
               2,
               '0'
           ) AS generated_code
    FROM location
)
UPDATE location l
SET branch_code = COALESCE(l.branch_code, n.generated_code),
    drug_license_number = COALESCE(NULLIF(TRIM(l.drug_license_number), ''), 'PENDING-LICENSE'),
    branch_type = COALESCE(l.branch_type, 'RETAIL'),
    status = COALESCE(l.status, 'ACTIVE'),
    opening_date = COALESCE(l.opening_date, (l.created_at AT TIME ZONE 'UTC')::date)
FROM numbered n
WHERE l.id = n.id;

WITH first_per_tenant AS (
    SELECT DISTINCT ON (tenant_id) id
    FROM location
    WHERE deleted_at IS NULL
    ORDER BY tenant_id, created_at, id
)
UPDATE location l
SET is_default = TRUE
FROM first_per_tenant f
WHERE l.id = f.id
  AND NOT EXISTS (
      SELECT 1
      FROM location other
      WHERE other.tenant_id = l.tenant_id
        AND other.deleted_at IS NULL
        AND other.is_default = TRUE
  );

ALTER TABLE location
    ALTER COLUMN branch_code SET NOT NULL,
    ALTER COLUMN drug_license_number SET NOT NULL,
    ALTER COLUMN branch_type SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN opening_date SET NOT NULL;

ALTER TABLE location
    DROP CONSTRAINT IF EXISTS chk_location_branch_type,
    DROP CONSTRAINT IF EXISTS chk_location_branch_status;

ALTER TABLE location
    ADD CONSTRAINT chk_location_branch_type CHECK (branch_type IN ('RETAIL', 'KIOSK')),
    ADD CONSTRAINT chk_location_branch_status CHECK (status IN ('ACTIVE', 'INACTIVE'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_location_tenant_branch_code
    ON location (tenant_id, branch_code)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_location_tenant_one_active_default
    ON location (tenant_id)
    WHERE deleted_at IS NULL AND is_default = TRUE AND status = 'ACTIVE';
