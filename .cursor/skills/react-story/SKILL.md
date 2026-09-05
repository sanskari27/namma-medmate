---
name: react-story
description: Implement a Namma MedMate dispensary or admin story slice with React 19 TDD, small composed components, robust clean UX, required UI states, accessibility, axios/RTK, and npm gates. Use when the story apps list includes dispensary or admin, or when changing those SPAs.
---

# React story slice

Use only when the selected story lists `dispensary` and/or `admin` in `apps`.
Do not implement screens with the Spring checklist. Run this skill once per
listed SPA.

Before coding, load the matching uniqueness reference:

- `dispensary` → [dispensary.md](dispensary.md)
- `admin` → [admin.md](admin.md)

Also load [composition.md](composition.md) before writing JSX. Follow rules
`design-taste` and `react-folder-structure`.

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

## Composition (hard rule)

A screen file **orchestrates**. It does not own the whole UI tree inline.

- Default: `Screen.tsx` + `Screen.utils.ts` + private
  `screens/<name>/components/<child>/` pieces. See [composition.md](composition.md).
- Split by region or concern (header, list, detail, form section, status
  banner, empty state, dialog body) — not one mega-component with every field.
- A component does **not** need everything in it. Prefer props-in / events-out
  children under ~120 lines of JSX each. Extract when a file grows past ~200
  lines or mixes two visual regions.
- Keep forms as section components (`ContactFields`, `HealthFields`,
  `AddressFields`) composed by a panel — not one 300-line form JSX block.
- Do not leave a 400+ line `*Screen.tsx` with markup, helpers, and status
  copy all inlined. That shape is incomplete work; split before gates.

Good reference shape: `dispensary/src/screens/customers/` (header / list /
profile / status as siblings). Bad shape: a single `BranchesScreen.tsx` that
embeds list + form + status + helpers in one file.

## Design quality

Ship **robust, clean** operational UI — not decorative dashboards.

- Clear hierarchy: one primary action, scannable secondary actions, quiet
  chrome. Consistent spacing rhythm (token-aligned gaps, aligned columns).
- Dense where the persona needs speed (dispensary tables/forms); calm scan
  density for admin oversight. No equal card grids, soft shadows, or
  marketing hero chrome on ERP screens.
- Stable states: loading / empty / error / success occupy reserved space so
  layout does not jump. Disabled + busy are explicit.
- Use that app's `@theme` tokens, `src/components/atoms` primitives, Lucide,
  and `motion/react` (one reveal per route). Charts via Recharts helpers in
  `src/components/molecules`. No GSAP/Lenis/Rive/Lottie.
- Do not copy pages, tokens, or copy between dispensary and admin.
- When the story requires real auth, remove scaffold `dev-token` login.

## UX and a11y

- Semantic labels on every field. Keyboard submit and escape. Visible focus.
  Restore focus after dialogs/routes.
- Status is not color-only. No emoji-as-icons. No unlabeled placeholders.

## Browser check

Probe the changed flow once (`:5173` dispensary, `:5174` admin, API `:8080`).
If the stack is unreachable, stop: record uniqueness from source (tokens,
copy, composition splits) and do not retry browser MCP.

If it is up, screenshot, critique density, hierarchy, contrast, composition
splits, and generic tells. Fix, then re-screenshot. A single screenshot is
not evidence.

## Gates

During TDD, run only the new/changed test files:

```sh
cd dispensary && npm run test -- --run src/screens/<name>/tests/<file>.test.tsx
```

Once those pass, run listed SPA gates **once** before the verifier:

```sh
cd dispensary && npm run lint && npm run test -- --run && npm run build
cd admin && npm run lint && npm run test -- --run && npm run build
```

If the full `npm run test` times out, retry **once**. Do not keep re-running
the full SPA suite. Prefer the story test files, then one full attempt.
After a verifier FAIL, re-run only the changed test files (plus `lint` if
the FAIL was lint), not another full `lint`/`test`/`build`, unless the FAIL
was missing/red/stale gate evidence or the fix changed shared code outside
this story's new tests.

Run only the apps in `apps`. Return per-app files (list each new child
component), failing-then-passing tests, state/a11y coverage, uniqueness
notes, browser-check notes, and exact gate output.
