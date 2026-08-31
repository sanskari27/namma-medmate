# ADR 0003: Contract-first APIs

- Status: Accepted
- Date: 2026-08-31

## Decision

Each module API owns `contract/swagger.yaml`. Codegen writes types and the client SDK. Apps and UIs consume APIs only through `@namma-medmate/api-client`.
