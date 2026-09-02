ALTER TABLE app_user
    ADD COLUMN pin_hash VARCHAR(255);

ALTER TABLE user_session
    ADD COLUMN pin_failed_attempts INTEGER NOT NULL DEFAULT 0;
