---
name: shadcn-shared-ui
description: Add and reuse shadcn primitives only in libs/shared-ui. Use when implementing UI, adding a Button/Dialog/Input, or running /add-ui-component.
---

# shadcn in shared-ui

`@namma-medmate/shared-ui` is the **only** shadcn tree. Apps and modules compose those primitives; they do not vend their own copies.

## When

Any new screen control (button, input, dialog, table, …) or `/add-ui-component`.

## Add a primitive

```sh
pnpm dlx shadcn@latest add {name} --yes -c libs/shared-ui
```

Then:

1. If the CLI wrote `#lib/utils` (or other `#` aliases), rewrite to a relative import (`../lib/utils.ts`) so `@nx/enforce-module-boundaries` stays green.
2. Keep default control size at **44px** (`min-h-11` / `size-11`) unless the spec calls for dense chrome (`xs`/`sm`).
3. Re-export from `libs/shared-ui/src/index.ts` when the barrel should expose it.
4. Unit-test public variants in `libs/shared-ui/tests/unit/` (100% coverage). Do not widen `coverage.exclude`.

## Import

```tsx
import { Button, StatusBanner } from '@namma-medmate/shared-ui';
import { Button } from '@namma-medmate/shared-ui/components/button';
```

Tokens live in `libs/shared-ui/src/styles/globals.css` (pharmacy greens mapped onto shadcn `--primary` / `--background` / …). Apps import that file; do not add a second theme.

## Forbidden

- `components/ui` inside `modules/*/ui` or `apps/*`
- Hand-rolled Button/Input/Dialog that duplicates a shadcn primitive
- `npx shadcn add` without `-c libs/shared-ui`
- New CSS files, CSS modules, or a second design system

Config: `libs/shared-ui/components.json` (style `base-nova`, `rsc: false`). App file `apps/dispensary-app-web/components.json` only routes CLI `ui` / `utils` aliases at this package.
