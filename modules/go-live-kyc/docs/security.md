# Security

- Pharmacy tenant + location from the session, never the client body.
- Wizard and KYC mutations are Owner-only (`OWNER_ONLY`). Gate GET is any pharmacy staff.
- HQ approve/reject requires `principal_type=hq` (fine-grained Super/Ops/Compliance roles wait for admin-platform-settings).
- Bank account number encrypted at rest; never logged. HQ list masks all but last 4.
- Chemist cannot self-approve.
