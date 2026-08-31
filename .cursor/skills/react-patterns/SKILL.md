---
name: react-patterns
description: React 19 function components, hooks, and RTK — no class components. Use when writing or reviewing module UI or app TSX.
---

# React patterns

Function components and hooks only. No class components, `defaultProps` on functions, or legacy lifecycles.

- Module state: RTK slices + RTK Query (`rtk-query-api-client`).
- Extract a hook when logic is reused; presentational components stay dumb.
- Copy `modules/auth/ui` (widget + slice + hook).
- Controls: skill `shadcn-shared-ui` — import from `@namma-medmate/shared-ui`, do not hand-roll primitives.

Pair with `tailwind-utility`, `shadcn-shared-ui`, and `typescript-strict`.
