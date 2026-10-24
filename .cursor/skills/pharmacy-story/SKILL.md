---
name: pharmacy-story
description: Implement one Namma Pharmacy backend roadmap slice in namma-pharmacy with Next.js App Router route handlers, current MVP behavior as the contract, and pharmacy quality gates. Use when implementing a B-slice, internal /api route, or pharmacy backend story.
---

# Pharmacy story

The product is `namma-pharmacy`. Add backend behavior as Next.js route handlers in that app.

## Contract

1. Read the named row in `docs/backend/delivery-roadmap.md`.
2. Read its current behavior in `docs/product/mvp-feature-catalog.md`, `docs/product/domain-model.md`, and `docs/backend/api-catalog.md`.
3. Confirm the behavior in `namma-pharmacy/src/app`. Code wins if a doc is stale; correct the doc.
4. Put handlers in `namma-pharmacy/src/app/api/v1/`. Keep the existing client screens working.
5. Use integer paise at the API boundary. Scope every query and mutation to the signed-in pharmacy. Ignore a pharmacy id supplied by the client.
6. Checkout, goods receipt, stock edits, order cancel/pack, and ward issue/return commit once and require an idempotency key.

## Check

The first handler added to the app also adds one focused test and a `test` script in the existing Node toolchain. Later slices add one test for the changed behavior. Do not add a second test framework.

## Completion

1. Set only that roadmap row to `in_progress` before runtime code, then to `implemented` with files and command output.
2. Run the listed gates in `.cursor/rules/quality-gates.mdc` once, sequentially.
3. Dispatch `story-verifier` once with the diff and gate output. Do not mark `done` before its `PASS`.
