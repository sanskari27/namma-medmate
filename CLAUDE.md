# Namma MedMate project brief

`namma-pharmacy/` is the product. It is a Next.js pharmacy dashboard.
Local development serves it at `http://localhost:3000/`.

`medmate-website/` is the secondary public site for medmatepharmacy.com.
It has no test suite. Locally, `make website` serves it at
`http://localhost:3200`. Production serves it from the same EC2 host.

The pharmacy dashboard deploys to `https://pharmacy.nammamedmate.com` only
after checks pass on `main`. Its MVP stores data in browser state. Planned
internal APIs live under Next.js `/api/v1` and are documented, not implemented.

Each app keeps its own build files and lockfile.
Follow [`docs/README.md`](docs/README.md).

## Commands

```text
make dev
```

Pharmacy dashboard: `http://localhost:3000/`.
Public site: `make website` → `http://localhost:3200`.
