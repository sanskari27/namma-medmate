# Security

- Pharmacy queries require `location_id` and session pairing.
- WABA token and Meta app secret stay in platform env/SSM. They never appear in inbox JSON or logs.
- OTP digits are not stored on `WhatsAppMessage` and are not logged.
- Meta webhook verifies `X-Hub-Signature-256` with the platform app secret.
- Internal send from other Lambdas uses `WHATSAPP_SERVICE_TOKEN` plus `tenant_id` + `location_id`.
