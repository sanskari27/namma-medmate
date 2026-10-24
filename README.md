# Namma MedMate

`namma-pharmacy` is the pharmacy dashboard. `medmate-website` is the public site.

| App | Audience | Local | Production |
|-----|----------|-------|------------|
| [`namma-pharmacy/`](namma-pharmacy/) | Pharmacy staff | http://localhost:3000/ | https://pharmacy.nammamedmate.com |
| [`medmate-website/`](medmate-website/) | Public | http://localhost:3200 | https://medmatepharmacy.com |

```bash
make dev
```

The dashboard MVP keeps its data in the browser. The planned internal API is
documented in [`docs/backend/api-catalog.md`](docs/backend/api-catalog.md).
See [`docs/README.md`](docs/README.md).
