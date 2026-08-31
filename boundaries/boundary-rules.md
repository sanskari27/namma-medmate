# Module boundary rules

Allowed dependency graph:

- `apps/*` may depend on `modules/*/ui` and `libs/*`
- `apps/*` must not depend on `modules/*/api`
- `modules/*/ui` may depend on `libs/*` only
- `modules/*/ui` must not import another module's UI or API internals
- `modules/*/api` may depend on `libs/*` only
- `modules/*/api` must not import UI projects or other APIs
- `libs/*` may depend on other `libs/*` only
- No API project may contain a `db/` folder

Enforcement:

- `@nx/enforce-module-boundaries` in ESLint
- `nx run boundaries:validate` on every PR
