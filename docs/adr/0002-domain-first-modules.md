# ADR 0002: Domain-first modules

- Status: Accepted
- Date: 2026-08-31

## Decision

Every business domain lives at `modules/{domain}/{ui,api,docs}`. UI and API are separate Nx projects and never import each other.
