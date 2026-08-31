# Event contract

UI bus (`@namma-medmate/event-bus`):

- `whatsapp.mandatory.changed` — `{ location_id, remaining }` after ack or status change that drops a banner row.

Domain log shapes (ids only until `audit` exists): `WhatsAppMessageQueued`, `WhatsAppMessageStatusChanged`, `WhatsAppMandatoryFailed`, `WhatsAppMandatoryAcknowledged`, `WhatsAppOtpUndeliverable`.
