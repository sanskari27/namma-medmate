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
screens
   |
   v
PharmaProvider
   |
   v
/api/v1  (same Next.js process)
   |
   +--> HTTP-only session cookie
   +--> Postgres pharmacy document
   +--> S3 or the files table for uploads
```

Sign-in proves the phone with Cognito when `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` are set. Local development without those variables accepts any six-digit code and does not send SMS. Signup and PIN reset use that code. After signup the pharmacy sets a 4-digit PIN and later signs in with the phone and PIN. The browser does not store a pharmacy id, a PIN, or a Cognito token.

Cart, navigation, toast, and the last invoice stay in memory. Business records are loaded from the API after sign-in and again when the tab regains focus.

## Server boundary

Route handlers live under `namma-pharmacy/src/app/api/v1/`. The same Node process that serves the dashboard serves those handlers. The production container runs `node server.js` from a Next.js standalone build.

Screens keep their current controls and call the internal API. Pure calculations in `src/app/data.ts` and `src/app/lib/` stay shared by the screen and the handler: invoice totals, scan lookup, report rows, customer aggregation, and hospital pricing.

## Release

A push to `main` runs pharmacy typecheck and build, the website build, and Compose validation. After those checks pass, the workflow tags that commit and deploys it to the existing EC2 host. See [../operations/deployment.md](../operations/deployment.md).
