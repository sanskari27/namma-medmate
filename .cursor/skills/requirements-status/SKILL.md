---
name: requirements-status
description: Report Namma MedMate epic and story progress from the canonical tracker without changing files.
---

# Requirements status

Read `_index.md`, every epic index, the tracker, and `DECISIONS.md`.
Report:

- counts by ready, in_progress, implemented, verified, done, blocked, deferred;
- the current in-progress story, if any;
- the next selectable story and why;
- blocked stories grouped by open decision;
- dependency inconsistencies, missing tracker rows, or more than one in-progress row;
- epic completion counts.

Do not infer completion from code and do not mutate status.
