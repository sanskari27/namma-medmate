---
name: verify-react
description: Review-only verification of a Namma MedMate dispensary or admin story slice against unique UX, required UI states, accessibility, axios/RTK boundaries, and npm gates. Use when verifying a story whose apps list includes dispensary or admin.
---

# Verify React slice

Review only. Do not edit code or tracker status.

Skip this skill when neither `dispensary` nor `admin` is in the story `apps`
list. Apply once per listed SPA against [dispensary.md](../react-story/dispensary.md)
or [admin.md](../react-story/admin.md).

## Must hold

1. Every UI-facing AC has a cited interaction test in that app.
2. Named tests exist for loading, empty, validation, denied, conflict,
   failure, and success where the screen can enter those states.
3. Labels, keyboard use, visible focus, and focus restoration are covered.
   Status is not color-only.
4. HTTP goes through that app's axios service and `VITE_API_BASE_URL`.
   No `server/` import, no other-SPA import, no new shared package.
5. Redux Toolkit owns server/auth state; ephemeral UI is local.
6. UI guards are not treated as authorization. Server remains authoritative.
7. Apps are not interchangeable: copy, tokens, and layout match the target
   persona (`dispensary.md` / `admin.md`). Copy-paste across SPAs is an
   automatic `FAIL`. New UI uses `@theme` tokens, not `slate-*` /
   `emerald-600` / `sky-600`. Generic AI tells (ALL-CAPS eyebrows,
   arrow-suffix CTAs, identical shadowed card grids) are a `FAIL`.
   Weak hierarchy, jumpy status layout, or decorative card chrome on ERP
   screens is a `FAIL` against robust/clean design taste.
8. Composition: the screen orchestrates; major regions live under
   `screens/<name>/components/`. A new or heavily changed `*Screen.tsx`
   that still inlines list + form + status helpers (~300+ lines or two+
   visual regions in one file) is an automatic `FAIL`. Form field groups
   must be split when more than one section exists. Cite
   `react-story/composition.md`.
9. Scaffold `dev-token` login is gone when the story requires real auth.
10. First UI story in an app installed Vitest + Testing Library + `npm test`.
11. Listed app gates passed (`lint`, `test -- --run`, `build`). Evidence
    includes command output. Browser-check notes exist for the changed
    flow, including a screenshot self-critique against `design-taste` and
    composition splits.
12. Diff has no unlisted app, no Spring layering work claimed as UI evidence.

## Verdict input

Return `PASS` for this stack only when every listed SPA holds with cites.
Otherwise `FAIL` with the AC/app, the missing evidence, and the minimum fix.
Do not pass the story overall if this stack fails.
