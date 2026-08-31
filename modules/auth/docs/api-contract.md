# Auth API contract

Source of truth: `modules/auth/api/contract/swagger.yaml`.

- `GET /auth/session`
- Bearer JWT required
- Success: `{ success: true, data: { authenticated: true, sub } }`
- Errors use the shared error envelope
- `/health` is auto-mounted by `libs/lambda-bootstrap` and is not part of the generated client
