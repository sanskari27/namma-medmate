ALTER TABLE kiosk_config
    ALTER COLUMN staff_exit_pin TYPE VARCHAR(100);

UPDATE kiosk_config
SET staff_exit_pin = ''
WHERE staff_exit_pin = '0000';

ALTER TABLE kiosk_config
    ALTER COLUMN staff_exit_pin SET DEFAULT '';

ALTER TABLE kiosk_ticket
    ADD COLUMN idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX uq_kiosk_ticket_tenant_branch_idempotency
    ON kiosk_ticket (tenant_id, branch_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
