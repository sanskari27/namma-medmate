# Agent entry point

`namma-pharmacy/` is the only product application. Read in this order:

1. [`CLAUDE.md`](CLAUDE.md) — product brief.
2. [`docs/README.md`](docs/README.md) — documentation map.
3. [`docs/architecture/README.md`](docs/architecture/README.md) — live runtime.
4. [`namma-pharmacy/AGENTS.md`](namma-pharmacy/AGENTS.md) — app conventions.

`medmate-website/` is the public marketing site. Change it only when the task
is about that site.

`make dev` runs the pharmacy dashboard at `http://localhost:3000/`.

Backend work follows [`docs/backend/delivery-roadmap.md`](docs/backend/delivery-roadmap.md).
Do not recreate a separate server, dispensary, or admin application.
