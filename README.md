# Namma MedMate

**Dispensary / pharmacy ERP + platform CRM** for Indian chemists and MedMate HQ.

| App | Audience | Purpose |
|-----|----------|---------|
| [`server/`](server/) | API | Multi-tenant Spring Boot backend |
| [`dispensary/`](dispensary/) | Pharmacy staff | POS, inventory, procurement, invoices, Rx |
| [`admin/`](admin/) | Platform operators | KYC, subscriptions, tenant administration |

## Quick start (local)

```bash
cp .env.example .env
make dev
# API http://localhost:8080  |  dispensary http://localhost:5173  |  admin http://localhost:5174
# Postgres/Redis in Compose; Spring + Vite on the host (Vite HMR, Java DevTools restart)
```

Containerized stack (rebuilds images — slower): `make up`.

Local sign-in (password `password` for both): see
[`docs/local-accounts.md`](docs/local-accounts.md).

| App | Email |
|-----|-------|
| Dispensary | `varshmaan.sonkar@gmail.com` |
| Admin / MASTER | `sanskarkumar85111@gmail.com` |

Or run on the host:

```bash
make deps
make backend    # terminal 1
make dispensary # terminal 2
make admin      # terminal 3
```

## Prod → local database (one-way)

Prod data is never written from local. Refresh a disposable local copy:

```bash
make db-tunnel   # SSM forward to RDS (requires AWS CLI + IAM)
make clone-db    # pg_dump prod → restore local Postgres :25432
```

See [`scripts/clone-prod-db.env.example`](scripts/clone-prod-db.env.example).

## CI / CD

| Workflow | When | What |
|---|---|---|
| **CI Tests** | Every PR to `main`, and again on a `main` push before release | Server `spotless:check test`; dispensary + admin `lint` + test + Vite build (`VITE_API_BASE_URL=https://api.nammamedmate.com`); `make compose-config`; requirements validator |
| **Main deploy** | Push to `main` (after CI) or **Run workflow** | Cuts `vN` (empty tag) or redeploys an existing tag; EC2 rebuilds **server + dispensary + admin** images, waits for health, curls API `:18080`, pharmacy `:10080`, admin `:10081` |
| **Prod env (SSM)** | Manual | `set` / `unset` / `keys` on `/namma-medmate-prod/compose.env` |
| **Clone Prod DB to S3** | Manual | `pg_dump` to the dumps bucket |
| **Feature Tag** | Push `feature/**` | Force-updates the `feature` tag for a later manual deploy |

Terraform provisions EC2 + RDS + ElastiCache and seeds SSM. Redeploy after an SSM change so compose picks it up.

Host Nginx TLS: [`deploy/HOST_NGINX.md`](deploy/HOST_NGINX.md).

## Requirements pipeline

```text
/implement-next-story          # next dependency-ready story
/implement-story M1-S01        # one named story
/verify-story M1-S01           # independent verification
/requirements-status           # roadmap summary
```

See [`docs/requirements/README.md`](docs/requirements/README.md),
[`docs/architecture/README.md`](docs/architecture/README.md), and
[`CLAUDE.md`](CLAUDE.md).

The backlog mirrors product Modules 1–12. Status lives only in
[`docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`](docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md);
open product choices remain blocked in
[`docs/requirements/DECISIONS.md`](docs/requirements/DECISIONS.md).

## Environments

| | Local | Prod |
|---|-------|------|
| Compose | `compose.yaml` | `compose.prod.yaml` (EC2 only) |
| Postgres | Docker :25432 | RDS (private) |
| Redis | Docker :16379 | ElastiCache |

**Never point the local Spring profile at RDS** — guards fail fast if misconfigured.
