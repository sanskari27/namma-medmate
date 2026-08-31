# Auth testing

```sh
pnpm exec nx test auth-api
pnpm exec nx test auth-ui
pnpm exec nx e2e auth-api
pnpm exec nx e2e auth-ui
pnpm exec nx e2e-smoke auth-ui
pnpm exec nx visual auth-ui
```

Playwright UI suites live in `tests/e2e/specs/{smoke,happy-path,failure-cases,a11y}/`. Screens, locators, and steps live beside them under `tests/e2e/screens/` and `tests/e2e/flows/`. Auth UI exports `@namma-medmate/auth-ui/e2e` for app journeys.

API Playwright specs stay request-only under `tests/e2e/specs/{happy-path,failure-cases}/`.

Visual snapshots run against generated Storybook states (`nx visual auth-ui`).
