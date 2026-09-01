---
name: implement-story
description: Implement one named Namma MedMate story as a tested vertical slice by dispatching spring-story and/or react-story from the story apps list, then update its tracker lifecycle.
---

# Implement one story

Input is a required `M#-S##` story ID.

## Preconditions

1. Locate the unique story and its epic.
2. Verify tracker status is `ready`, no other row is `in_progress`, every
   dependency is `done`, and every linked decision is closed.
3. Read product sources, architecture, current callers, and relevant tests.
4. Change only the selected tracker row to `in_progress` before runtime code.

## Dispatch from `apps`

Read frontmatter `apps`. Skip any stack that is not listed (example: M1-S08
is server + admin only). Do not implement a React screen with the Spring
checklist or a Java endpoint with the React checklist.

- `server` → follow the `spring-story` skill.
- `dispensary` and/or `admin` → follow the `react-story` skill once per
  listed SPA, including that app's uniqueness reference.

## Completion

1. Run only the listed target gates and fix failures.
2. Change tracker status to `implemented` with files, tests, and command output.
3. Dispatch `story-verifier` with the story path, diff, and evidence.
4. On `PASS`, record verdict and progress `verified → done`. On `FAIL`,
   return to `in_progress`, fix only reported gaps, rerun gates, and reverify.
5. Never self-approve or mark `done` without verifier evidence.
