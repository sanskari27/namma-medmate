# Local login accounts

Local-only identities for the Compose / host stack. Do not use these in
production, and do not point the local Spring profile at RDS.

Password for these accounts: `password`  
PIN (idle unlock): `123456`

| App | URL | Email | Role |
|-----|-----|-------|------|
| Dispensary (OWNER) | http://localhost:5173/login | `varshmaan.sonkar@gmail.com` | `pharmacy_owner` |
| Dispensary (cashier) | http://localhost:5173/login | `counter.staff@varshmaan.local` | `pharmacy_staff` / Cashier |
| Dispensary (pharmacist) | http://localhost:5173/login | `pharmacist@varshmaan.local` | `pharmacy_staff` / Pharmacist |
| Dispensary (inventory) | http://localhost:5173/login | `inventory@varshmaan.local` | `pharmacy_staff` / Inventory |
| Dispensary (accountant) | http://localhost:5173/login | `accountant@varshmaan.local` | `pharmacy_staff` / Accountant |
| Admin / MASTER | http://localhost:5174/login | `sanskarkumar85111@gmail.com` | `admin_super` |
| Admin / Verification Agent | http://localhost:5174/login | `verify.agent@nammamedmate.local` | `admin_verification` |

The pharmacy users belong to tenant `11111111-1111-1111-1111-111111111111`
(Varshmaan Pharmacy). Staff `created_by` is the OWNER. The MASTER user has no
`tenant_id`. The Verification Agent is a platform sub-account created by MASTER.

Local Varshmaan is on **PRO** after `make seed-local` so loyalty, kiosk, analytics,
custom reports, GST/P&L, and stockist dues are entitled. Outlets: Indiranagar
(`BR01`, default), Koramangala (`BR02`), and a kiosk (`BR03`). HQ also has extra
demo pharmacies (pending KYC, suspended, expired, mixed plans) for admin queues.

Staff passwords are reset by the owner on **Staff accounts**: select the
staff row, then open the temp-password dialog. There is no `/staff-password`
page. New staff created in the UI start PENDING until HQ approves the
registration; the seeded OWNER, counter staff, pharmacist, inventory,
accountant, MASTER, and Verification Agent stay ACTIVE for bootstrap.

## Recreate after a fresh local database

After Flyway has applied (`make dev`, `make up`, or `make backend`):

```bash
make seed-local
```

That waits for Postgres on `localhost:25432`, applies
`scripts/seed-local-accounts.sql`, then the idempotent demo dataset under
`scripts/seed-local-demo/`. Accounts-only:

```bash
PGPASSWORD=postgres psql -h localhost -p 25432 -U postgres -d nammamedmate \
  -f scripts/seed-local-accounts.sql
```
