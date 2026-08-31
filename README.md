# Namma MedMate

Production-grade TypeScript monorepo for Namma MedMate web apps, domain modules, and Express Lambdas.

## Stack

Nx + pnpm, Node 24, React, Vite, Redux Toolkit, Tailwind, Vitest, Playwright, Terraform, GitHub Actions.

## First run

See [local-dev/README.md](local-dev/README.md) and [docs/onboarding/local-dev-setup.md](docs/onboarding/local-dev-setup.md).

```sh
pnpm install
pnpm local:up
pnpm exec nx serve auth-api
pnpm exec nx serve dispensary-app-web
```

## Layout

- `apps/` product web apps
- `modules/{domain}/{ui,api,docs}` domain modules
- `libs/` shared libraries (workspace references, never published)
- `contracts/` OpenAPI aggregation and codegen
- `infra/terraform/` staging/prod only (state and provider locks live in S3; see `infra/terraform/README.md`)
- `local-dev/` Podman stack

## Quality gates

PR-only: lint, typecheck, 100% unit coverage on authored runtime source, Playwright happy/failure paths, visual regression, a11y, bundle budgets, Lighthouse, contract drift, module boundaries.

Vulnerability scanning is deferred (see `docs/adr/0007-vuln-scan-deferred.md`).
