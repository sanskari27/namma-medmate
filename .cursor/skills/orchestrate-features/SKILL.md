---
name: orchestrate-features
description: >-
  Runs the server requirements verification pipeline: discovers features
  in docs/requirements/, dispatches feature-verifier subagents one at a time,
  tracks gaps, implements missing code, and updates .implementation.md docs.
  Use when asked to verify features, audit requirement coverage, process requirements,
  or check what's complete vs missing. Tests are skipped unless explicitly requested.
---

# Orchestrate Features Pipeline

End-to-end workflow for verifying and completing `server` features against `docs/requirements/`.

## When to use

- "Verify all features against requirements"
- "What's missing in auth?"
- "Process P0 features one by one"
- "Run the requirements pipeline"

## Quick start

1. Read this skill
2. Invoke `/feature-orchestrator` (or act as orchestrator using `.cursor/agents/feature-orchestrator.md`)
3. Confirm feature list with user
4. For each feature, invoke `/feature-verifier` with spec + implementation paths
5. Update `docs/requirements/reports/master-status.md`

## File layout

```
docs/requirements/
├── _index.md                      ← feature registry (priorities)
├── _template.md                   ← requirements spec template
├── _implementation-template.md      ← implementation living doc template
├── auth/
│   ├── auth.md                    ← requirements (WHAT)
│   └── auth.implementation.md     ← implementation status (HOW + coverage)
├── reports/
│   ├── master-status.md           ← orchestrator aggregate
│   └── <feature>-gap-analysis.md  ← per-feature gap report
context-data/
├── orchestrator.md                ← full orchestrator prompt
├── feature-subagent.md            ← full verifier prompt
└── test-subagent.md               ← Phase 2 (tests — disabled)
.cursor/agents/
├── feature-orchestrator.md
├── feature-verifier.md
└── test-scenario-writer.md        ← disabled unless user enables
```

## Pairing rule

| Requirements spec | Implementation doc |
|-------------------|------------------|
| `auth/auth.md` | `auth/auth.implementation.md` |
| `broadcast/series.md` | `broadcast/series.implementation.md` |

Same basename, `.implementation.md` suffix, same folder.

## Default behaviour

| Setting | Default |
|---------|---------|
| Processing order | One feature at a time |
| Priority | P0 → P1 → P2 (from `_index.md`) |
| Scope | `server` backend only |
| Tests | **Skipped** — do not run test phase |
| Parallel features | Only if user explicitly requests |

## User commands

```
/orchestrate-features                    → full pipeline, ask which features
/orchestrate-features auth               → single feature
/orchestrate-features P0                 → all P0 features sequential
/feature-verifier auth                   → verify+implement auth only
```

## After each feature

Verifier must deliver:
1. `docs/requirements/reports/<feature>-gap-analysis.md`
2. Updated `*.implementation.md` with rule checklist
3. Code changes for MISSING/PARTIAL rules (non-blocked)
4. `./mvnw -DskipTests compile` passing

## Enabling tests (Phase 2)

Only when user says "enable tests" or "run test phase for X":
→ Dispatch `/test-scenario-writer` for that feature
→ See `context-data/test-subagent.md` for 100–300 scenario targets

## Detailed prompts

- Orchestrator: [context-data/orchestrator.md](../../context-data/orchestrator.md)
- Verifier: [context-data/feature-subagent.md](../../context-data/feature-subagent.md)
- Tests (future): [context-data/test-subagent.md](../../context-data/test-subagent.md)
