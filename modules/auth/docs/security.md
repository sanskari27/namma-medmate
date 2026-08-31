# Auth security

- Tokens are issued by a custom OIDC-compatible issuer (RS256 + remote JWKS).
- `auth-api` verifies `iss`, `aud`, `exp`, `nbf`, and `sub`.
- Issuer, audience, and JWKS URI come from validated environment/SSM configuration.
- Roles and permissions are out of scope for this slice.
- No secrets are committed. Staging/prod values flow GitHub Environments → SSM.
