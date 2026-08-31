---
name: local-dev-serve
description: Start the Podman local stack and serve module API plus dispensary-app-web. Use for /local-up or when e2e/API needs running services.
---

# Local dev serve

See `local-dev/README.md`.

```sh
pnpm install
pnpm local:up
pnpm exec nx serve {slug}-api
pnpm exec nx serve dispensary-app-web
```

Node 24, pnpm 10. Env from `.env.example` via `env-doctor` — do not invent secrets. `pnpm local:down` when done.
