-- Public website waitlist. Platform data, not a pharmacy tenant.

CREATE TABLE waitlist_signup (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(32) NOT NULL,
    consent BOOLEAN NOT NULL,
    source VARCHAR(80) NOT NULL,
    lang VARCHAR(16) NOT NULL,
    offer VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_waitlist_signup_name CHECK (length(btrim(name)) > 0),
    CONSTRAINT chk_waitlist_signup_phone CHECK (phone ~ '^[6-9][0-9]{9}$'),
    CONSTRAINT chk_waitlist_signup_pincode CHECK (pincode ~ '^5[0-9]{5}$'),
    CONSTRAINT chk_waitlist_signup_age CHECK (age BETWEEN 18 AND 120),
    CONSTRAINT chk_waitlist_signup_gender
        CHECK (gender IN ('female', 'male', 'other', 'prefer-not-to-say')),
    CONSTRAINT chk_waitlist_signup_consent CHECK (consent)
);

CREATE INDEX idx_waitlist_signup_created_at ON waitlist_signup (created_at DESC);
