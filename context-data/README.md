# server — AI Agent System
## Feature Verification, Implementation & Test Generation

---

## Overview

This system uses **coordinated AI agents** to verify, complete, and (optionally) test every feature in `server` against specs in `docs/requirements/`.

```
┌──────────────────────────────────────────────────────────────┐
│              FEATURE ORCHESTRATOR (.cursor/agents/)          │
│  Reads docs/requirements/_index.md → one feature-verifier    │
│  per feature (sequential) → writes master-status.md          │
└───────────────┬──────────────────────────────────────────────┘
                │  dispatches one sub-agent at a time
    ┌───────────▼──────────────┐   ┌────────────────────────┐
    │  FEATURE VERIFIER        │   │  TEST SCENARIO WRITER   │
    │  (per feature)           │   │  (Phase 2 — DISABLED)   │
    │  • Parse requirements    │   │  • test-scenarios.md    │
    │  • Gap analysis          │   │  • JUnit 5 + TestCont.  │
    │  • Implement missing code│   │  • 100–300 cases/feature│
    │  • Update .implementation│   │                         │
    └──────────────────────────┘   └────────────────────────┘
```

**Current policy:** Implementation + verification only. **Tests are skipped** until explicitly enabled.

---

## Project File Structure

```
docs/requirements/
├── _index.md                           ← feature registry + priorities
├── _template.md                        ← requirements spec template
├── _implementation-template.md         ← implementation living doc template
├── auth/
│   ├── auth.md                         ← requirements (WHAT)
│   └── auth.implementation.md          ← agent-maintained (HOW + coverage)
├── broadcast/
│   ├── broadcast.md
│   ├── broadcast.implementation.md
│   ├── series.md
│   └── series.implementation.md
└── reports/
    ├── master-status.md                ← orchestrator aggregate
    ├── auth-gap-analysis.md            ← per-feature gap report
    └── auth-test-scenarios.md          ← Phase 2 only

server/
├── src/main/java/com/wautopilot/core/
│   ├── application/    ← services
│   ├── domain/         ← entities
│   ├── feature/        ← controllers
│   ├── persistence/    ← repositories
│   └── infrastructure/ ← security, external APIs
└── src/test/java/      ← Phase 2 only

context-data/                           ← full agent prompts (reference)
.cursor/
├── agents/                             ← Cursor subagents (executable)
└── skills/                             ← Cursor skills (workflow entry)
```

---

## Agent & Skill Files

| File | Purpose |
|------|---------|
| `.cursor/agents/feature-orchestrator.md` | Top-level orchestrator (Cursor subagent) |
| `.cursor/agents/feature-verifier.md` | Per-feature verify + implement (Cursor subagent) |
| `.cursor/agents/test-scenario-writer.md` | Phase 2 tests (disabled by default) |
| `.cursor/skills/orchestrate-features/SKILL.md` | Workflow entry skill |
| `.cursor/skills/verify-single-feature/SKILL.md` | Single-feature shortcut |
| `context-data/orchestrator.md` | Full orchestrator prompt (reference) |
| `context-data/feature-subagent.md` | Full verifier prompt (reference) |
| `context-data/test-subagent.md` | Full test prompt (Phase 2) |

---

## How to Trigger (Cursor)

### Full pipeline (recommended)
```
/orchestrate-features
```
Or in chat:
> "Run the requirements pipeline for P0 features, one at a time"

### Single feature
```
/feature-verifier auth
```
Or:
> "Verify auth against docs/requirements/auth/auth.md and implement gaps"

### Claude Code (alternative)
```bash
claude --system-prompt context-data/orchestrator.md \
       "Process auth feature from docs/requirements/"
```

---

## Conventions the Agents Follow

- **Java 17**, **Spring Boot 4.0.5**, **Maven**, **PostgreSQL**, **Flyway**
- Strict layering: `feature/` → `application/` → `persistence/` + `domain/`
- DTOs as records; `ApiResponse<T>`; `ApiException` for errors
- `AccountPermissionService` / `@PreAuthorize` — never bypass tenant checks
- New schema only via new Flyway migration (never edit existing `V*.sql`)
- Rule IDs: `{DOMAIN}-R{nn}` from specs (e.g. `AUTH-R01`)
- Implementation docs use `[x]` / `[ ]` / `[~]` / `[!]` checkboxes
- Agent code marker:
  ```java
  // [AGENT-IMPL] Feature: auth | Rule: AUTH-R03 | Date: 2026-05-31
  ```

---

## Phase 2 — Tests (when enabled)

Per feature:
1. `docs/requirements/reports/<feature>-test-scenarios.md` — 100–300 scenarios
2. JUnit 5 + Mockito + AssertJ + Testcontainers tests
3. `./mvnw test` for feature package

Enable with: *"Run test phase for auth"*

| Feature size | Min scenarios |
|--------------|---------------|
| Small (tags, links) | 100 |
| Medium (templates, phonebook) | 150 |
| Large (auth, conversations, broadcast) | 300 |
