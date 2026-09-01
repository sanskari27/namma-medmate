# Testing

- API unit: Vitest + supertest against `createApp` with memory auth/tenancy and a local JWKS.
- API e2e: Playwright HTTP against `tests/e2e/serve-api.ts`.
- UI: Testing Library + e2e-kit Storybook suites (smoke, happy-path, failure-cases, a11y, visual).
- db-services: new AuthRepository methods. Auth login clears `temp_password_pending` after a successful password verify.
