---
name: scaffold-module
description: Create modules/{slug}/{ui,api,docs} by copying the auth Nx tree and registering CI/workspace files. Use when a domain folder does not exist yet.
---

# Scaffold module

Copy **`modules/auth/{ui,api}`** (working Nx/Vitest/Playwright/Storybook), not README-only `_template` internals. Keep `_template` layout contract (`ui` / `api` / `docs`).

## Checklist

1. `modules/{slug}/{ui,api,docs}` with kebab-case slug.
2. Packages `@namma-medmate/{slug}-ui` and `@namma-medmate/{slug}-api`. Nx `project.json` tags: `type:module-ui|module-api` + `domain:{slug}`.
3. Copy vitest, playwright, eslint, tsconfig, Storybook (UI), `handler`/`local`/`app` (API).
4. Empty `contract/swagger.yaml` + `implemented-routes.json`. UI `events.contract.ts` stub.
5. Register `{slug}-ui` / `{slug}-api` in `.github/change-detection/workspace-map.json`.
6. Path alias `@namma-medmate/{slug}-ui/e2e` in `tsconfig.base.json`.
7. Add Playwright projects to `.github/workflows/pr-checks.yml` when e2e exists.
8. Routes `/<slug>/...`. No `api/db/`.

Then follow skill `implement-module` (TDD, swagger, Stitch, shadcn via `shared-ui`). Do not add a per-module shadcn tree.
