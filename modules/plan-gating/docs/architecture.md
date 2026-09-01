# Architecture

`plan-gating-api` is an Express Lambda (`lambda-bootstrap`) with pharmacy routes under `/plan-gating`.

```
dispensary-app-web
  └── plan-gating-ui (PlanGate + Paywall + NavLockIcon)
                    └── @namma-medmate/api-client
                          └── plan-gating-api Lambda
```

Plan catalogue and role defaults live in `src/catalogue.ts` (v1 code constants). Subscription, seats, and overrides are injected:

- missing subscription ⇒ Free + `status=active`
- missing seats ⇒ `seatsUsed=0` and `seats_used_unknown=true`
- missing overrides ⇒ `{}`

No `saas_module_overrides` table until HQ writes one. ponytail: skip 30s entitlements cache; compute is in-process constants.

Stitch MCP was not available in this environment; Paywall / PlanGate / NavLockIcon follow spec §7.5 anatomy with `@namma-medmate/shared-ui`.
