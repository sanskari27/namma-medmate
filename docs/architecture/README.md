# Architecture

## Applications

| App | Role | Local | Production |
|-----|------|-------|------------|
| `namma-pharmacy/` | Pharmacy dashboard, the product | http://localhost:3000/ | https://pharmacy.nammamedmate.com |
| `medmate-website/` | Public marketing site | http://localhost:3200 | https://medmatepharmacy.com |

Each app has its own `package-lock.json`. There is no package workspace and no shared library.

The pharmacy app is Next.js 16 with React 19. It has one App Router page, `src/app/page.tsx`. Feature navigation is client state, not a URL per screen. `layout.tsx` is a server component for metadata and fonts. Every working screen is a client component.

## Current data flow

```text
seed data in data.ts and lib/*
        |
        v
PharmaProvider in pharmaState.tsx
        |
        +--> screens read state and call mutations
        |
        v
localStorage key namma-pharmacy-state
```

There is no database, session, or `src/app/api` route. Refresh restores the persisted blob. A second browser or staff member does not see the same data.

The POS cart, last invoice, pricing unlock, indent-billing target, navigation stack, and toast are memory-only. Closing the tab drops them.

## Planned server boundary

Future writes move into route handlers under `namma-pharmacy/src/app/api/v1/`. The same Node process that serves the dashboard will serve those handlers. The production container runs `node server.js` from a Next.js standalone build so this does not require a new host.

Screens keep their current controls. They will call the internal API instead of mutating only React state. Pure calculations in `src/app/data.ts` and `src/app/lib/` stay shared by the screen and the handler: invoice totals, scan lookup, report rows, customer aggregation, and hospital pricing.

## Release

A push to `main` runs pharmacy typecheck and build, the website build, and Compose validation. After those checks pass, the workflow tags that commit and deploys it to the existing EC2 host. See [../operations/deployment.md](../operations/deployment.md).
