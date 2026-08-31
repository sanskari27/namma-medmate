---
name: verify-gates
description: Run format, lint, typecheck, 100% Vitest coverage, and Playwright after implementation. Use after coding a module or when running /verify-gates. Never mark the tracker done on a red gate.
---

# Verify gates

Blocking post-implementation loop on **touched** Nx projects. Do not skip Playwright because unit passed.

## Order

```sh
pnpm exec prettier --write <touched-files>
pnpm exec nx run boundaries:validate
pnpm exec nx run contracts:check              # if swagger / client changed
pnpm exec nx affected -t lint,typecheck,test  # Vitest includes 100% coverage
pnpm exec nx e2e {project}                    # UI: smoke+happy+failure+a11y; API: happy+failure
pnpm exec nx visual {ui-project}              # when UI screens changed
```

Coverage in `tools/vitest-config` is **100%** lines, branches, functions, statements. Do not lower thresholds. Do not widen `coverage.exclude`.

`passWithNoTests: false` is already set. A project with zero tests is a fail.

## On red

1. Skill `debug-quality-gate` — read the error, smallest fix.
2. Re-run **from the failed step**, then the rest.
3. Keep looping until green, or set tracker `blocked` with a real product reason.

Never mark `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md` `done` while any step is red.
