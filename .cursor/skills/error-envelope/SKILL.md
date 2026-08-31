---
name: error-envelope
description: Return success and error JSON via response-envelope and AppError using requirement §9 codes. Use when writing API controllers.
---

# Error envelope

Use `@namma-medmate/response-envelope` and `@namma-medmate/error-handling` (`AppError`).

- Success: `{ data: ... }`
- Failure: `{ error: { code, message, i18n_key } }`
- Codes and HTTP status from the spec §9 (e.g. `409 LOCATION_LIMIT_V1`, `400 LOCATION_ID_REQUIRED`).

Do not invent ad-hoc `{ success: false }` shapes. Do not leak other tenants’ `display_name` on mismatch errors.
