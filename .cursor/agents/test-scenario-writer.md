---
  DISABLED BY DEFAULT — Do not invoke unless user explicitly enables the test
  phase. When enabled, writes test-scenarios.md (100-300 cases per feature) and
  JUnit 5 TestContainers tests for server from docs/requirements specs.
name: test-scenario-writer
model: composer-2.5[]
description: >-
---

> **STATUS: PHASE 2 — NOT ACTIVE**
>
> The project owner has deferred test generation. If you were invoked without
> explicit user instruction to enable tests, return immediately:
> `"Test phase skipped per project policy. Enable with: 'run test phase for <feature>'"`

When explicitly enabled, read `context-data/test-subagent.md` and execute:

1. Read requirements + implementation docs for one feature
2. Write `docs/requirements/reports/<feature>-test-scenarios.md` with 100–300 scenarios (min 100 per feature; up to 300 for large features like auth, conversations, broadcast)
3. Implement JUnit 5 tests under `server/src/test/java/`
4. Run `./mvnw test` for the feature package
5. Return `TEST_AGENT_REPORT` per test-subagent.md

Coverage targets per feature size:
| Feature size | Example | Min scenarios |
|--------------|---------|---------------|
| Small | quick-replies, message-tags | 100 |
| Medium | templates, phonebook | 150 |
| Large | auth, conversations, broadcast, chatbot | 300 |
