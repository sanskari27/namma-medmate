---
name: e2e-kit-screen
description: Add a Playwright screen with selectors, locators, page, and steps via e2e-kit. Use when adding UI e2e or /add-e2e-screen. Specs must not import selectors.
---

# E2E kit screen

From `libs/e2e-kit/README.md`:

1. `tests/e2e/screens/{screen}/`
2. `{screen}.selectors.ts` — data only, no `Page`. Prefer role/label.
3. `{screen}.locators.ts` — `createLocators(page, selectors)`.
4. `{screen}.page.ts` — extends `BasePage`, `expectReady()`.
5. `{screen}.steps.ts` — functions taking page objects.
6. Register the page in `tests/e2e/fixtures/e2e-test.ts`.
7. Flows in `tests/e2e/flows/`.
8. Specs under `specs/{smoke,happy-path,failure-cases,a11y,visual}/` — import fixtures, steps, flows only.

API e2e: `request` only; no page objects. No Cypress. Export `./e2e` from module UI when apps traverse it.
