# Auth testing

```sh
pnpm exec nx test auth-api
pnpm exec nx test auth-ui
pnpm exec nx e2e auth-api
pnpm exec nx e2e auth-ui
pnpm exec nx visual auth-ui
```

Playwright suites live in `tests/e2e/playwright/{happy-path,failure-cases}/`.
Visual snapshots run against generated Storybook states.
