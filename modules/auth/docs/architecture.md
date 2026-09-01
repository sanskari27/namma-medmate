# Auth architecture

```text
dispensary-app-web  (/login, /login/pin, session chip)
  └── auth-ui (RTK Query)
        └── @namma-medmate/api-client
              └── auth-api Lambda
                    ├── db-services users/otp/sessions/devices
                    ├── encryption-utils (bcrypt secrets, SHA-256 OTP/tokens)
                    ├── HTTP whatsapp login_otp
                    └── HTTP audit ingest
```

Downstream pharmacy APIs accept `nm_sess_` tokens via `verifyBearer` session lookup, then OIDC JWT for HQ.
