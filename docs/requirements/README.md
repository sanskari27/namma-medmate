# Requirements execution contract

## Source precedence

1. Runtime/build files describe what the repository actually supports.
2. A story in this folder is the implementation contract for its scoped behavior.
3. `docs/product/product-compiled.md` defines consolidated product intent.
4. `docs/product/m1-*.md` through `m11-*.md` provide supporting rationale.
5. `DECISIONS.md` blocks ambiguity; agents never silently resolve it.

## Work unit and lifecycle

Implement exactly one vertical story at a time across every listed target app.
Status exists only in `AGENT-REQUIREMENT-IMPLEMENTATION.md`:

`ready → in_progress → implemented → verified → done`

Alternative states are `blocked` and `deferred`. Only one story may be
`in_progress`. A ready story is selectable only when all dependencies are
`done` and all linked decisions are closed.

## Delivery workflow

1. Select a named story or the first selectable tracker row.
2. Read its epic, product sources, architecture rules, dependencies, and decisions.
3. Inspect existing callers and reuse current code.
4. Write failing tests for every acceptance criterion.
5. Implement the smallest complete vertical slice.
6. Run all gates for touched targets.
7. Ask the independent story verifier for a verdict.
8. Update tracker evidence; mark `done` only after `PASS`.

## Non-negotiable product boundaries

- Shared database with mandatory tenant filtering and branch filtering where applicable.
- Customers and doctors have no Phase 1 login.
- POS is online-only and customer payment selection is manual.
- No shared product catalogue, offline sync, B2B lead pipeline, support ticketing,
  thermal invoices, SMS fallback, accounting-software integration, or Phase 2 workflow.
- Money persists in INR minor units; time persists in UTC and displays in IST.
- Schema changes use new Flyway migrations only.

## Target gates

- Server: `cd server && ./mvnw spotless:check test`
- Dispensary: `cd dispensary && npm run lint && npm run test -- --run && npm run build`
- Admin: `cd admin && npm run lint && npm run test -- --run && npm run build`
- Deployment/config changes: `make compose-config`

If a React test command does not exist when a UI story starts, that story must
install and configure the test runner before it can be completed.
