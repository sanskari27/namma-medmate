# Local login accounts

Local-only identities for the Compose / host stack. Do not use these in
production, and do not point the local Spring profile at RDS.

Password for these accounts: `password`

| App | URL | Email | Role |
|-----|-----|-------|------|
| Dispensary (OWNER) | http://localhost:5173/login | `varshmaan.sonkar@gmail.com` | `pharmacy_owner` |
| Dispensary (staff) | http://localhost:5173/login | `counter.staff@varshmaan.local` | `pharmacy_staff` |
| Admin / MASTER | http://localhost:5174/login | `sanskarkumar85111@gmail.com` | `admin_super` |
| Admin / Verification Agent | http://localhost:5174/login | `verify.agent@nammamedmate.local` | `admin_verification` |

The pharmacy owner and staff belong to tenant `11111111-1111-1111-1111-111111111111`
(Varshmaan Pharmacy). Staff `created_by` is the OWNER. The MASTER user has no
`tenant_id`. The Verification Agent is a platform sub-account created by MASTER.

Staff passwords are reset by the owner on **Staff accounts**: select the
`counter.staff` row, then open the temp-password dialog. There is no
`/staff-password` page. New staff created in the UI start PENDING until HQ
approves the registration; the seeded OWNER, counter staff, MASTER, and
Verification Agent stay ACTIVE for bootstrap.

## Recreate after a fresh local database

After Flyway has applied (`make dev`, `make up`, or `make backend`):

```bash
PGPASSWORD=postgres psql -h localhost -p 25432 -U postgres -d nammamedmate \
  -f scripts/seed-local-accounts.sql
```
