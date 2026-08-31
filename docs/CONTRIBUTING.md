# Contributing

1. Use Node 24 and pnpm 10.
2. Create a feature branch from `main`.
3. Keep domain code in `modules/{domain}/{ui,api,docs}`.
4. Do not import across domain UI/API internals.
5. Open a PR. All PR checks must pass before rebase-and-merge to `main`.
6. `main` deploys staging, runs post-deploy/smoke checks, then promotes the same artifacts to production. Tests do not re-run on `main`.

Commit messages follow Conventional Commits via commitlint.
