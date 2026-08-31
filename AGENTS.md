# AGENTS

Namma MedMate TypeScript monorepo (`namma-medmate`) — Nx + pnpm, Node 24, React 19, Express on AWS Lambda.

## Contracts

- Read `docs/requirements/README.md`, `docs/requirements/00-glossary.md`, and `docs/requirements/00-decomposition-plan.md` before coding.
- Implement **one** numbered requirement file per run. Status lives only in `docs/requirements/AGENT-REQUIREMENT-IMPLEMENTATION.md`.
- Climb **Ponytail** (rule + skill `ponytail`) before writing code. Prefer an existing `@namma-medmate/*` lib (`reuse-platform-libs`).
- **TDD:** failing unit + e2e specs before runtime code (`tdd-enforcer`). Coverage stays at **100%** lines/branches/functions/statements.
- After every implementation, skill `verify-gates` must go green. Never mark the tracker `done` on a red gate.
- UI: skill `stitch-ui-design` before React; skill `shadcn-shared-ui` for controls. Compose pharmacy UI into `apps/dispensary-app-web`. Do not create a Platform Admin HQ app unless the user or requirement explicitly starts it.
- Current `modules/auth` is an OIDC session scaffold. Chemist login is `docs/requirements/06-auth.md` and depends on `tenancy`, `whatsapp`, and `audit`. Next module is **`01-tenancy`**.

## Layout

- `apps/` — product web apps (`dispensary-app-web`)
- `modules/{slug}/{ui,api,docs}` — domain modules
- `libs/` — shared libraries (workspace references, never published). shadcn lives in `libs/shared-ui`.
- `contracts/` — OpenAPI aggregation and codegen
- `boundaries/` — module-boundary validation
- `infra/terraform/` — staging/prod (state in S3, never git)
- `local-dev/` — Podman stack

Reference implementations: `modules/auth/ui` and `modules/auth/api`. Template layout only: `modules/_template`.

## When to use what (`.cursor/`)

| Need                                                   | Use                                                                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Pick + implement the next pending module               | `/next-module` → tracker → skill `implement-module`                                                                        |
| Implement one requirement file                         | `/implement-module` → skill `implement-module` → agent `module-implementer`                                                |
| Generate UI screens                                    | `/design-screens` → skill `stitch-ui-design` → agent `ui-designer`                                                         |
| Add a shadcn primitive                                 | `/add-ui-component` → skill `shadcn-shared-ui` (`libs/shared-ui` only)                                                     |
| Scaffold `modules/{slug}`                              | `/scaffold-module` → skill `scaffold-module`                                                                               |
| Pre-merge review                                       | `/review-module` → `code-reviewer` + agents `contract-guardian`, `boundary-guardian`, `security-reviewer`, `test-engineer` |
| Format / lint / typecheck / 100% coverage / Playwright | `/verify-gates` → skill `verify-gates` (`debug-quality-gate` if red)                                                       |
| Add a UI e2e screen                                    | `/add-e2e-screen` → `playwright-e2e` / `e2e-kit-screen`                                                                    |
| After swagger edits                                    | `/codegen` → skill `contract-first-api`                                                                                    |
| Env / Zod / SSM / port failures                        | `/env-doctor` → skill `env-doctor`                                                                                         |
| Security pass                                          | `/security-review` → `owasp-security` + `auth-patterns` + `security-review-medmate`                                        |
| Diff-only structural review                            | `/code-review` → `code-reviewer` + `clean-code`                                                                            |
| Local stack                                            | `/local-up` → skill `local-dev-serve`                                                                                      |
| Terraform                                              | `/tf-plan` → skill `terraform-change`                                                                                      |
| Optional multi-phase planning                          | global `/gsd/*` + skill `gsd-namma-adapter` (status still in the tracker)                                                  |

## Commands

See `.cursor/commands/` (`next-module`, `implement-module`, `design-screens`, `add-ui-component`, `scaffold-module`, `review-module`, `verify-gates`, `add-e2e-screen`, `codegen`, `security-review`, `env-doctor`, `code-review`, `local-up`, `tf-plan`).

## Agents

See `.cursor/agents/` (`module-implementer`, `ui-designer`, `contract-guardian`, `boundary-guardian`, `test-engineer`, `security-reviewer`).

## Skills

See `.cursor/skills/`. Primary loop: `implement-module` → `ponytail` → `tdd-enforcer` → `stitch-ui-design` → `shadcn-shared-ui` → `verify-gates`.
