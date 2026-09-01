---
name: verify-story
description: Independently verify an implemented Namma MedMate story against acceptance, architecture, tests, and scope.
---

# Verify one story

1. Require a unique story ID with tracker status `implemented` or `verified`.
2. Read the story, epic, product sources, decisions, dependencies, architecture,
   implementation diff, tests, and tracker evidence.
3. Use the `story-verifier` agent. Do not edit implementation during review.
4. Require evidence for every AC, business rule, target app, tenant/branch
   boundary, failure case, migration, and target gate.
5. Return exactly `PASS` or `FAIL` with concise evidence and actionable gaps.
6. Only a `PASS` may advance tracker status through `verified` to `done`.
