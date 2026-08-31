# Add UI component

Usage: `/add-ui-component button` (or `dialog`, `input`, `table`, …)

Add a **shadcn** primitive into `libs/shared-ui` so every module and app can reuse it.

## Steps

1. Follow skill `shadcn-shared-ui`.
2. `pnpm dlx shadcn@latest add {name} --yes -c libs/shared-ui`
3. Rewrite `#` package imports to relative paths if lint flags them.
4. Re-export from `libs/shared-ui/src/index.ts` when needed.
5. Unit-test public variants. Coverage stays 100%.

## Guardrails

- One tree: `libs/shared-ui/src/components`. Never copy primitives into `modules/*/ui` or `apps/`.
- Import via `@namma-medmate/shared-ui` (or `@namma-medmate/shared-ui/components/{name}`).
- Keep default tap targets at 44px (`min-h-11`) unless the spec asks for dense chrome.
