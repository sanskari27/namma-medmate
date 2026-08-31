# @namma-medmate/e2e-kit

Shared Playwright primitives for every app and module UI. Product screens do not live here.

Prefer **role and label queries**. Use `testId` only when the accessible name is unstable. CSS is last resort.

## Add a screen

1. Create `tests/e2e/screens/{screen}/`.
2. `{screen}.selectors.ts` — data only, no `Page`.
3. `{screen}.locators.ts` — `createLocators(page, selectors)`.
4. `{screen}.page.ts` — extends `BasePage`, constructor takes `page`.
5. `{screen}.steps.ts` — functions that take page objects as params.
6. Register the page class in `tests/e2e/fixtures/e2e-test.ts`.
7. Compose cross-screen journeys in `tests/e2e/flows/`.
8. Write specs under `tests/e2e/specs/{smoke,happy-path,failure-cases,a11y,visual}/`. Specs import fixtures, steps, and flows only.

```ts
import { createE2eTest } from '@namma-medmate/e2e-kit';
import { LoginPage } from '../screens/login/login.page.ts';
import { PosPage } from '../screens/pos/pos.page.ts';

export const test = createE2eTest({
  loginPage: LoginPage,
  posPage: PosPage,
});
```

```ts
export async function reachPos(deps: { loginPage: LoginPage; posPage: PosPage }) {
  await submitValidLogin(deps);
  await openPos(deps);
  await deps.posPage.expectReady();
}
```

## Suites

| Folder                | Nx / CLI                                       |
| --------------------- | ---------------------------------------------- |
| `specs/smoke`         | `nx e2e-smoke {project}`                       |
| `specs/happy-path`    | `nx e2e {project} -- --project=happy-path`     |
| `specs/failure-cases` | `--project=failure-cases`                      |
| `specs/a11y`          | `--project=a11y` — `a11y.scan()` (WCAG 2.2 AA) |
| `specs/visual`        | `nx visual {project}` — `visual.screenshot()`  |

Visual snapshots are platform-specific. App and Storybook visual suites run via `nx visual {project}`, not the default `e2e` target.

Module UI that other apps must traverse should export `@namma-medmate/{domain}-ui/e2e` (pages + steps + flows). Journeys that cross modules live in the app.
