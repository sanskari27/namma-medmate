# Namma MedMate project brief

Namma MedMate is an Indian pharmacy product.

- `namma-pharmacy/`: Next.js pharmacy dashboard. Local dev serves it at
  `http://localhost:3000/`.
- `medmate-website/`: static Next.js public site for medmatepharmacy.com.
  No test suite.
- Local site container: `make up` (port 3200). Production website uses EC2
  and Terraform.

Each app uses its own committed build files and dependency manager.
Follow [`docs/architecture/README.md`](docs/architecture/README.md).

## Commands

```text
make dev
```

Pharmacy dashboard: `http://localhost:3000/`.
Public site: `make website` → `http://localhost:3200`.
