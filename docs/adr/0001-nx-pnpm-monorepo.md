# ADR 0001: Nx + pnpm monorepo

- Status: Accepted
- Date: 2026-08-31

## Decision

Use Nx with pnpm workspaces. Libraries are consumed as `workspace:*` references. There is no internal semver publishing pipeline.
