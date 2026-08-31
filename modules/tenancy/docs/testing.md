# Testing

- API unit: Vitest + supertest against `createApp` with an in-memory tenancy repository and a local JWKS.
- API e2e: Playwright HTTP against `local.ts` (`TENANCY_PERSISTENCE=memory`).
- UI: Testing Library + e2e-kit Storybook suites (smoke, happy-path, failure-cases, a11y, visual).
