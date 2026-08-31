# System overview

Namma MedMate is a TypeScript monorepo:

- `apps/dispensary-app-web` is the first web app, hosted at a derived hostname under `nammamedmate.com`.
- `modules/auth/{ui,api,docs}` is the first domain module.
- `libs/*` holds shared capabilities. Persistence is only through `libs/db-services`.
- Local development uses Podman (Postgres, PgBouncer, LocalStack, mock OIDC).
- AWS environments are staging and production in `ap-south-1`.
