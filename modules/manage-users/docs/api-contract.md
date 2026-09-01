# API contract

See `modules/manage-users/api/contract/swagger.yaml`. Base path `/manage-users`. Every pharmacy route requires `location_id`.

Primary operations: seats, list/create/get/patch/remove users, permissions, methods, password reset/copy, PIN, devices, share-link.

Error catalogue: `LOCATION_REQUIRED`, `SEAT_CAP_REACHED`, `LOGIN_ID_TAKEN`, `AUTH_METHOD_REQUIRED`, `OTP_MOBILE_REQUIRED`, `OWNER_ACCESS_IMMUTABLE`, `OWNER_ALREADY_EXISTS`, `OWNER_REQUIRED`, `TEMP_PASSWORD_UNAVAILABLE`, `EMPLOYEE_ALREADY_LINKED`, `UNKNOWN_MODULE_KEY`, `IDEMPOTENCY_CONFLICT`, `FORBIDDEN`.
