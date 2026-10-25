# Local development

## Pharmacy dashboard

```bash
make dev
```

`make dev` starts local Postgres from `compose.yaml` when Docker or Podman is available, then runs `namma-pharmacy` at http://localhost:3000/. `make pharmacy` is the same application.

Sign in with any six-digit code while Cognito is not configured. A new pharmacy starts empty. Settings → Reset asks for confirmation, then loads the development sample store. If a sample staff mobile is already registered to another pharmacy, that person stays in the user list and the number still signs into the pharmacy that owns it. Two browsers signed in as the same phone see the same pharmacy.

## Public site

```bash
make website
```

The site runs at http://localhost:3200. `make up` runs it in the local Compose container instead. `make down` stops that container.

The public site is not the pharmacy product. It does not serve the dashboard.

## Checks

From the repository root, in this order:

```bash
cd namma-pharmacy && npm run typecheck && npm run build
cd medmate-website && SITE_URL=https://medmatepharmacy.com npm run build
make compose-config
```

Pharmacy production image, when Docker or Podman is available:

```bash
docker build -t namma-pharmacy:local namma-pharmacy
docker run --rm -p 3000:3000 namma-pharmacy:local
```

The container answers http://127.0.0.1:3000/.
