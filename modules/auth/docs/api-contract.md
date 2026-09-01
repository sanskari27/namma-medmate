# Auth API contract

Source of truth: `modules/auth/api/contract/swagger.yaml`.

Public: `POST /auth/login/password`, `POST /auth/login/otp/request`, `POST /auth/login/otp/verify`. PIN saved-device unlock may omit Bearer. Authenticated: `GET /auth/session`, `POST /auth/logout`, `GET|DELETE /auth/devices`.

Envelope `{ data }` / `{ error: { code, message, i18n_key } }`. `/health` is auto-mounted by `libs/lambda-bootstrap` and is not part of the generated client.
