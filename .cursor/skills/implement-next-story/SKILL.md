---
name: implement-next-story
description: Select and complete the first dependency-ready vertical story from the Namma MedMate tracker.
---

# Implement next story

1. Read `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md` and
   `DECISIONS.md`.
2. Stop if any row is already `in_progress`; report its ID.
3. In tracker order, select the first `ready` row whose dependencies are all
   `done` and whose decisions are closed or absent.
4. Follow the `implement-story` skill for that exact ID.
5. Complete only one story per invocation.
