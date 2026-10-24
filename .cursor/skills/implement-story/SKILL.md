---
name: implement-story
description: Implement one named Namma Pharmacy backend slice from the delivery roadmap as a tested vertical slice in namma-pharmacy, then update its lifecycle.
---

# Implement one pharmacy slice

Input is a required `B01`–`B15` slice ID.

1. Read that row in `docs/backend/delivery-roadmap.md`.
2. Stop unless its status is `ready` or `pending` with every dependency `done`, and no other row is `in_progress`.
3. Follow `pharmacy-story` in this agent. Do not spawn `story-implementer`.
4. After gates pass, dispatch `story-verifier` once. It follows `verify-pharmacy` and must not re-run listed full gates.
5. On `PASS`, move the row through `verified` to `done` and set newly unblocked rows to `ready`.
6. On `FAIL`, return the row to `in_progress`, fix only the reported gap, re-run the focused test, and reverify once.
