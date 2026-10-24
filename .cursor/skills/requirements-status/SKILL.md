---
name: requirements-status
description: Report Namma Pharmacy backend roadmap progress from the delivery roadmap without changing files.
---

# Pharmacy roadmap status

Read `docs/backend/delivery-roadmap.md` and the target constraints in `docs/backend/README.md`.

Report:

- counts by `pending`, `ready`, `in_progress`, `implemented`, `verified`, `done`, and `blocked`;
- the in-progress slice, if any;
- the next selectable slice and why;
- dependency contradictions or more than one in-progress row.

Do not infer completion from code and do not change status.
