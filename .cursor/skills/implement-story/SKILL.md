---
name: implement-story
description: Implement one named Namma MedMate story as a tested vertical slice and update its tracker lifecycle.
---

# Implement one story

Input is a required `M#-S##` story ID.

## Preconditions

1. Locate the unique story and its epic.
2. Verify tracker status is `ready`, no other row is `in_progress`, every
   dependency is `done`, and every linked decision is closed.
3. Read product sources, architecture, current callers, and relevant tests.
4. Change only the selected tracker row to `in_progress` before runtime code.

## TDD implementation

1. Convert each acceptance criterion and rule into explicit test cases.
2. Write tests in every target app and observe the new tests fail for the
   expected missing behavior.
3. Implement the smallest complete vertical slice; reuse current patterns.
4. Protect tenant/branch isolation, authorization, validation, transaction
   rollback, idempotency, and concurrency at the server.
5. Handle all required UI states and accessibility behavior.
6. Avoid adjacent cleanup, speculative abstractions, and Phase 2 behavior.

## Completion

1. Run all story target gates and fix failures.
2. Change tracker status to `implemented` with files, tests, and command output.
3. Dispatch `story-verifier` with the story path, diff, and evidence.
4. On `PASS`, record verdict and progress `verified → done`. On `FAIL`,
   return to `in_progress`, fix only reported gaps, rerun gates, and reverify.
5. Never self-approve or mark `done` without verifier evidence.
