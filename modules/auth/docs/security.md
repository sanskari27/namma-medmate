# Auth security

- Chemist sessions are opaque `nm_sess_` tokens hashed SHA-256 at rest. Idle TTL 12 hours with sliding `last_seen_at`.
- Passwords and PINs use bcrypt cost 12 (`hashSecret` / `verifySecret`). OTP hashes are SHA-256.
- Login is rate-limited per `login_id|ip` in addition to the 5-fail / 15-minute lock.
- WhatsApp OTP digits are never logged or written to audit snapshots.
- HQ OIDC JWTs remain valid on pharmacy APIs that still parse Bearer tokens; chemist login does not require OIDC.
- No secrets are committed. Staging/prod values flow GitHub Environments → SSM.
