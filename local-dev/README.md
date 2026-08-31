# Local development

This is the canonical local environment. No real AWS account is required.

## Prerequisites

- Node.js 24 (`nvm use` from the repo root)
- pnpm 10
- Podman with `podman compose`

## First hour

```sh
git clone <repo>
cd namma-medmate
cp .env.example .env.local
pnpm install
pnpm local:up
pnpm exec nx serve auth-api
pnpm exec nx serve dispensary-app-web
```

Stack:

| Service               | Port |
| --------------------- | ---- |
| PostgreSQL            | 5432 |
| PgBouncer             | 6432 |
| LocalStack            | 4566 |
| Mock OIDC / JWKS      | 8081 |
| Auth API (host)       | 3001 |
| Dispensary app (host) | 5173 |

Useful commands:

```sh
pnpm local:up
pnpm local:down
pnpm exec nx run local-dev:seed
pnpm exec nx test auth-api
pnpm exec nx test dispensary-app-web
```

Mint a local JWT:

```sh
curl 'http://localhost:8081/token?sub=user-1'
```
