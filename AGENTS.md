# Agent entry point

Read in this order:

1. [`CLAUDE.md`](CLAUDE.md) — concise project brief.
2. [`docs/architecture/README.md`](docs/architecture/README.md) — live architecture.
3. [`docs/requirements/README.md`](docs/requirements/README.md) — execution contract.
4. [`docs/requirements/_index.md`](docs/requirements/_index.md) — module epics.
5. [`docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`](docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md) — only status source.
6. [`docs/requirements/DECISIONS.md`](docs/requirements/DECISIONS.md) — product blockers.

Commands:

- `/implement-next-story`
- `/implement-story M1-S01`
- `/verify-story M1-S01`
- `/requirements-status`

Stack skills (dispatched from story frontmatter `apps`):

- `server` → `spring-story` / `verify-spring`
- `dispensary` and/or `admin` → `react-story` / `verify-react` (once per SPA)

Implementer runs listed full gates once, sequentially, before verify. Do not
spawn `story-implementer` from the loop agent. `story-verifier` reviews
evidence and must not re-run Maven/npm suites. After a FAIL, patch and
delta-test; do not loop `./mvnw spotless:check test`.

Work on one vertical story at a time. Never implement blocked or deferred work,
skip tests, invent product decisions, bypass tenant/branch scope, or claim a
story is done without an independent verifier `PASS`.
