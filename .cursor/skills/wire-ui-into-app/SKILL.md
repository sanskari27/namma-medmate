---
name: wire-ui-into-app
description: Mount a module UI package in apps/dispensary-app-web. Use after scaffolding or when composing pharmacy console screens. Do not create a new app.
---

# Wire UI into app

Compose `@namma-medmate/{slug}-ui` into `apps/dispensary-app-web` (providers, routes, layout).

- Import public exports from `modules/{slug}/ui/src/index.ts`.
- Register RTK store/API like auth (`createAuthStore` / providers).
- Do **not** create a second product app for Platform Admin HQ unless the user or requirement explicitly starts HQ.
- Cross-module journeys: app e2e imports `@namma-medmate/{slug}-ui/e2e`.

See `apps/dispensary-app-web/src/app/` (`app-providers.tsx`, `app-routes.tsx`).
