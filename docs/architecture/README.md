# Namma MedMate architecture

Build files and source win if this note becomes stale.

```text
namma-pharmacy/     Next.js pharmacy dashboard, route `/`
medmate-website/    public site, medmatepharmacy.com
```

- `namma-pharmacy/`: Next.js 16, React 19. `npm run dev` → `http://localhost:3000/`.
- `medmate-website/`: static Next.js site (`output: "export"`). Build with
  `SITE_URL=https://medmatepharmacy.com`.
- `infra/terraform/`: AWS host for the public site.
- No shared package workspace. Each app has its own lockfile.

Local pharmacy dashboard: `make dev`.
Public site container: `make website` or `make up`.
