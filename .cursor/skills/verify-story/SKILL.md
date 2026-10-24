---
name: verify-story
description: Independently verify one implemented Namma Pharmacy backend slice. Evidence-based PASS or FAIL only.
---

# Verify one pharmacy slice

1. Require a unique `B01`–`B15` ID whose roadmap status is `implemented` or `verified`.
2. Use the `story-verifier` agent. Do not edit implementation during review.
3. The verifier follows `verify-pharmacy` and cites the implementer's gate output.
4. Return exactly `PASS` or `FAIL`.
5. Only `PASS` may advance the row through `verified` to `done`.
