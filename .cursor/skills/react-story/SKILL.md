---
name: react-story
description: Implement a Namma MedMate dispensary or admin story slice with React 19 TDD, app-unique UX, required UI states, accessibility, axios/RTK, and npm gates. Use when the story apps list includes dispensary or admin, or when changing those SPAs.
---

# React story slice

Use only when the selected story lists `dispensary` and/or `admin` in `apps`.
Do not implement screens with the Spring checklist. Run this skill once per
listed SPA.

Before coding, load the matching uniqueness reference:

- `dispensary` → [dispensary.md](dispensary.md)
- `admin` → [admin.md](admin.md)

## TDD

1. Map every UI-facing AC to interaction tests (user action → visible state).
2. If the target app has no test runner, install Vitest + jsdom + Testing
   Library and an `npm test` script in that app only. Missing tooling is
   implementation work, not a skip.
3. Write failing tests first. Observe the expected missing behavior.
4. Implement the smallest slice that makes those tests pass.

Required named cases per screen in the story: loading, empty, validation,
denied, conflict, failure, success.

## Boundaries

- Function components and hooks. Strict TypeScript. No `any`, no class
  components, no unsafe double assertions.
- HTTP only via that app's `src/services/axios.ts` and `VITE_API_BASE_URL`.
- Never import `server/` source or the other SPA. No shared package workspace.
- Redux Toolkit owns authenticated/server-derived state. Ephemeral UI stays local.
- Server remains authoritative for auth, tenant, branch, plan, totals, prices.
  UI guards improve UX only.

## UX and a11y

- Semantic labels on every field. Keyboard submit and escape. Visible focus.
  Restore focus after dialogs/routes.
- Status is not color-only. No emoji-as-icons. No unlabeled placeholders.
- When the story requires real auth, remove scaffold `dev-token` login.
- Do not copy pages, tokens, or copy between dispensary and admin.
- Use that app's `@theme` tokens, `src/components/ui` primitives, Lucide,
  and `motion/react` (one reveal per route). Charts go through Recharts
  helpers. Follow rule `design-taste`. No GSAP/Lenis/Rive/Lottie.

## Browser check

Exercise the changed flow in the browser before claiming the UI slice done.
Screenshot the result, critique generic tells, and fix before finishing.
A single screenshot is not evidence.

## Gates

For each listed SPA:

```sh
cd dispensary && npm run lint && npm run test -- --run && npm run build
cd admin && npm run lint && npm run test -- --run && npm run build
```

Run only the apps in `apps`. Return per-app files, failing-then-passing tests,
state/a11y coverage, uniqueness notes, browser-check notes, and exact output.
