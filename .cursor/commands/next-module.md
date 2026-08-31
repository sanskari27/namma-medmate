# Next module

Usage: `/next-module` — or `/next-module 01-tenancy` to force a slug.

Pick the next pending module, plan it, implement it, and mark it done in the tracker.

## Steps

1. **Pick.** Open `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`. Take the first `pending` row whose Depends-on slugs are all `done`. Default after this kit: **`01-tenancy`**. If args were given, use that slug. If deps are unmet, set `blocked` with reason and continue.
2. **Claim.** Set status to `in_progress`.
3. **Plan.** Read the spec fully. State target `modules/{slug}`, endpoints, entities, Stitch screens, and which tests cover each AC.
4. **Implement.** Follow `/implement-module` (skill `implement-module`, agent `module-implementer`). UI controls come from `@namma-medmate/shared-ui` (shadcn).
5. **Verify.** Skill `verify-gates` to green.
6. **Mark done** only after gates are green. Update Progress counts.

## Guardrails

- One module per run. Never batch rows to `done`.
- Never mark `done` on a red gate.
- Status lives only in the tracker.
- Auth (`06`) is OIDC scaffold only — do not treat chemist login as done.
