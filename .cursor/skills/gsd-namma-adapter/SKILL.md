---
name: gsd-namma-adapter
description: Map global /gsd/* phases to one docs/requirements slug and execute via implement-module. Use when the user runs GSD commands in this repo.
---

# GSD namma adapter

- One phase = one requirement slug. Do not invent modules.
- CONTEXT from spec §1–§3. Execute with skill `implement-module`.
- Status: `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`, not only `.planning/STATE.md`.
- Still required: Ponytail, TDD, Stitch for UI, `verify-gates`, 100% coverage.
- Do not copy `~/.cursor/commands/gsd/` into this repo.
