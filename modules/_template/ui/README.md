# Template UI

Create `src/`, Storybook, and tests using `modules/auth/ui` as the reference implementation.

Call APIs through `@namma-medmate/api-client` (`queryEnvelope` + generated `createApiClient`). Do not add a per-module HTTP client wrapper.

UI e2e uses `@namma-medmate/e2e-kit`. Layout:

```text
tests/e2e/
  fixtures/e2e-test.ts
  screens/{screen}/{screen}.{selectors,locators,page,steps}.ts
  flows/
  data/
  specs/{smoke,happy-path,failure-cases,a11y,visual}/
```

Export pages and steps as `./e2e` when another app must traverse this module. Specs import fixtures, steps, and flows only. See `libs/e2e-kit/README.md`.
