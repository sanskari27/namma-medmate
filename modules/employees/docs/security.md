# Security

- Tenant + location from the pharmacy session, never the client body.
- Plan key `employees` required except pharmacist-eligible which also accepts `statutory-registers`.
- PAN / Aadhaar / account number encrypted at rest; never logged.
- Presigned uploads expire in 10 minutes and must match an issued key.
