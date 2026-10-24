<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Namma Pharmacy

This is the product app. It is a Next.js App Router dashboard.

- The browser URL is `/`. Feature screens switch through `route` in `src/app/pharmaState.tsx`.
- Screens live in `src/app/screens/`. The shell is `src/app/components/Shell.tsx`.
- Domain types, seeds, and pricing live in `src/app/data.ts` and `src/app/lib/`.
- The MVP persists one `localStorage` blob, `namma-pharmacy-state`. There is no database and no `/api` implementation yet.
- Planned handlers belong in `src/app/api/v1/` and must follow `docs/backend/`.
- Read `node_modules/next/dist/docs/` before using a Next.js API.

Checks: `npm run typecheck` and `npm run build`.
