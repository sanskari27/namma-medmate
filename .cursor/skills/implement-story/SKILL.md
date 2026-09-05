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

Apply these skills **in this agent**. Do not spawn `story-implementer`,
`requirement-orchestrator`, or any other implement subagent.

- `server` → follow the `spring-story` skill.
- `dispensary` and/or `admin` → follow the `react-story` skill once per
  listed SPA, including that app's uniqueness reference.

## Completion

1. After story tests are green, run listed **full** gates **once**,
   **sequentially** (server, then each SPA). Do not start Maven and npm test
   at the same time — that times out the SPA suite and triggers retry loops.
   Fix failures. Attach exact command output.
2. Pre-verify self-check (cheap; do this before spawning the verifier):
   every AC has a named test; UI stories have loading/empty/validation/
   denied/conflict/failure/success; new `*Screen.tsx` orchestrates (regions
   under `components/`, not a 300+ line monolith). Fix misses with delta
   tests. Do not call the verifier until this list holds.
3. Change tracker status to `implemented` with files, tests, and gate output.
4. Dispatch `story-verifier` **once** with the story path, diff, and gate
   evidence. Wait for it. Do not start a second verify while one is running.
   Do not instruct it to re-run listed full gates.
5. On `PASS`, record verdict and progress `verified → done`.
   On `FAIL`, return to `in_progress`, fix only reported gaps, then:
   - Re-run **delta tests** for those ACs / changed test files
     (`./mvnw -Dtest=ThisStory* test` or `npm run test -- --run <file>`).
   - Re-run `spotless:check` or app `lint` only if the FAIL was format/lint.
   - Re-run listed **full** gates only if the FAIL was missing/red/stale gate
     evidence, or the fix changed shared code outside this story's new tests.
   Then reverify **once** (review only).
6. Never self-approve or mark `done` without verifier evidence.
