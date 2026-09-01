# Namma MedMate — Claude Project Brief

## What This Is

B2B **pharmacy ERP** (dispensary app) + **platform CRM / SaaS** (admin app) for Namma MedMate. Multi-tenant: every pharmacy is a tenant with one or more locations.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Spring Boot 3.4, Java 17, Maven |
| Frontend | React 19, TypeScript, Vite 6, Redux Toolkit |
| Database | PostgreSQL 16 + Flyway |
| Cache | Redis 7 |
| Auth | JWT |
| Deploy | Docker Compose, EC2, Terraform (RDS + ElastiCache) |

## Repository Structure

```
namma-medmate/
├── compose.yaml / compose.prod.yaml
├── server/                 ← Spring Boot API
│   └── src/main/java/com/nammamedmate/server/
│       ├── feature/        ← REST controllers
│       ├── application/    ← services
│       ├── domain/         ← entities
│       ├── persistence/    ← repositories
│       ├── infrastructure/ ← security, config
│       └── shared/         ← ApiResponse, exceptions
├── dispensary/             ← pharmacy ERP SPA
├── admin/                  ← HQ CRM SPA
├── docs/requirements/      ← feature specs + implementation docs
└── infra/terraform/        ← prod only
```

## Backend Layering (strict)

```
feature/ → application/ → persistence/ + domain/
              ↑ supported by infrastructure/ + shared/
```

**Tenant isolation:** every query must scope by `tenant_id` (and `location_id` where applicable). Never bypass.

## Local Development

```bash
make deps && make backend   # API :8080
cd dispensary && npm run dev  # :5173
cd admin && npm run dev       # :5174
```

## API Conventions

- Base path: `/api/v1`
- Envelope: `ApiResponse<T>` with `success`, `data`, `message`, `code`
- Currency: INR (paise in DB where needed)
- Timezone: IST display, UTC storage

## Flyway

Schema changes only via new `V{n}__description.sql`. Never edit existing migrations.

## Agent Pipeline

`/orchestrate-features` — see `.cursor/skills/orchestrate-features/SKILL.md`

Default scope: **server/** backend only unless user asks for dispensary/admin UI.
