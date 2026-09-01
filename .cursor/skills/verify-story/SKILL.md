---
name: verify-story
description: Independently verify an implemented Namma MedMate story by dispatching verify-spring and/or verify-react from the story apps list. Evidence-based PASS or FAIL only.
---

# Verify one story

1. Require a unique story ID with tracker status `implemented` or `verified`.
2. Read the story, epic, product sources, decisions, dependencies, architecture,
   implementation diff, tests, and tracker evidence.
3. Use the `story-verifier` agent. Do not edit implementation during review.
4. Dispatch from frontmatter `apps`. Skip unlisted stacks.
   - `server` → follow the `verify-spring` skill.
   - `dispensary` and/or `admin` → follow the `verify-react` skill once per
     listed SPA.
5. Return exactly `PASS` or `FAIL`. Overall `PASS` only when every dispatched
   stack skill passed. Cite evidence; list actionable gaps on `FAIL`.
6. Only a `PASS` may advance tracker status through `verified` to `done`.
