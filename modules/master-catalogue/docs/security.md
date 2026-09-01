# Security

Writes are HQ principal only (`HQ_ONLY`). Pharmacy sessions cannot mutate the platform master. GET by id is allowed for pharmacy mapping/POS. Service token is for inventory/POS Lambdas.

No tenant_id on master rows. Do not log Rx text or secrets.
