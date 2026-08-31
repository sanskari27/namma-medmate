---
name: conventional-commit
description: Write Conventional Commits that pass commitlint. Use only when the user asks to commit.
---

# Conventional commit

Commitlint extends `@namma-medmate/commit-lint-config`.

```
feat(tenancy): create pharmacy with single location

fix(auth-ui): show unauthenticated widget on 401
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`. Scope = Nx project or slug. Do not commit secrets, Terraform state, or generated files that should come from `pnpm codegen`. Only commit when the user asks.
