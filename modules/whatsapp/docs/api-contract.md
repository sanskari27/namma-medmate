# API contract

See `modules/whatsapp/api/contract/swagger.yaml`.

- Send: `POST /whatsapp/messages`
- Inbox: `GET /whatsapp/messages`
- Mandatory banner: `GET /whatsapp/mandatory-failures`, `POST /whatsapp/messages/{message_id}/acknowledge`
- Share: `POST /whatsapp/share-deeplink`
- Catalogue: `GET /whatsapp/templates`
- Webhook: `POST /whatsapp/webhooks/meta`

Error catalogue: `LOCATION_ID_REQUIRED`, `INVALID_WHATSAPP_TO`, `UNKNOWN_TEMPLATE`, `IDEMPOTENCY_KEY_REQUIRED`, `TEXT_TOO_LONG`, `LOCATION_TENANT_MISMATCH`, `FORBIDDEN_ROLE`, `NOT_MANDATORY_FAILURE`. `WHATSAPP_OTP_UNDELIVERABLE` is an async OTP result after retries.
