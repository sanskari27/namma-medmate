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
make up
# API http://localhost:8080  |  dispensary http://localhost:5173  |  admin http://localhost:5174
```

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

## Production deploy

Terraform provisions EC2 + RDS + ElastiCache (`infra/terraform/envs/prod`). On the EC2 host:

```bash
docker compose -f compose.prod.yaml up -d --build
```

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
