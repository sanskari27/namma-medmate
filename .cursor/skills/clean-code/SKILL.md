---
name: clean-code
description: Flag N+1 queries, missing await, pass-through layers, and oversized files. Use with ponytail during implementation and /code-review.
---

# Clean code

With Ponytail, flag:

- N+1 queries (must go through `db-services`, batched)
- Unbounded loops on the request path
- Missing `await`
- Copy-paste modules instead of a lib
- shadcn / Button / Input / Dialog copied into a module or app instead of `@namma-medmate/shared-ui`
- Files over ~200 lines that should split by role (controller vs mapper vs validator)

Do not add enterprise factories to “look clean”.
