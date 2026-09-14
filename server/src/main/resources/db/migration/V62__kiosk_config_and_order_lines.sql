CREATE TABLE kiosk_config (
    tenant_id UUID NOT NULL REFERENCES tenant(id),
    branch_id UUID NOT NULL REFERENCES location(id),
    display_name VARCHAR(160) NOT NULL DEFAULT '',
    welcome_message VARCHAR(240) NOT NULL DEFAULT '',
    staff_exit_pin VARCHAR(16) NOT NULL DEFAULT '0000',
    idle_reset_seconds INT NOT NULL DEFAULT 60,
    accent_theme VARCHAR(16) NOT NULL DEFAULT 'green',
    show_prices BOOLEAN NOT NULL DEFAULT TRUE,
    allow_rx_upload BOOLEAN NOT NULL DEFAULT TRUE,
    accept_cash BOOLEAN NOT NULL DEFAULT TRUE,
    accept_upi BOOLEAN NOT NULL DEFAULT TRUE,
    accept_card BOOLEAN NOT NULL DEFAULT TRUE,
    accept_cod BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, branch_id),
    CONSTRAINT chk_kiosk_config_theme CHECK (accent_theme IN ('green', 'dark', 'gold')),
    CONSTRAINT chk_kiosk_config_idle CHECK (idle_reset_seconds BETWEEN 15 AND 600)
);

ALTER TABLE kiosk_ticket
    ADD COLUMN payment_method VARCHAR(32),
    ADD COLUMN requires_rx BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN items_json JSONB NOT NULL DEFAULT '[]'::jsonb;
