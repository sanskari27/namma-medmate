# Namma Pharmacy documentation

`namma-pharmacy` is the product. These documents describe the dashboard that exists today and the internal API planned for it. They do not describe a separate backend application.

## Precedence

1. `namma-pharmacy/package.json`, Compose, the Makefile, and GitHub Actions are runtime truth.
2. `namma-pharmacy/src/app` is product truth for current behavior.
3. These documents explain that behavior and the planned `/api/v1` contract.
4. If a document and the code disagree, the code wins. Update the document in the same change.

## Current and target

| Label | Meaning |
|-------|---------|
| Current | Implemented in the browser MVP. Data is dummy seed data plus `localStorage`. |
| Planned | Required to replace that behavior with internal Next.js route handlers. No handler exists yet. |
| Target constraint | A rule the planned API must keep. It is not a claim that the MVP enforces it on a server. |

## Map

| Document | Use it for |
|----------|------------|
| [architecture/README.md](architecture/README.md) | Apps, state, deployment, and client/server boundary |
| [product/mvp-feature-catalog.md](product/mvp-feature-catalog.md) | Every current screen, gate, and demo limitation |
| [product/domain-model.md](product/domain-model.md) | Entities, mutations, derived data, and persistence |
| [backend/README.md](backend/README.md) | Planned route-handler architecture and constraints |
| [backend/api-catalog.md](backend/api-catalog.md) | Every planned endpoint |
| [backend/delivery-roadmap.md](backend/delivery-roadmap.md) | Implementation order and slice status |
| [operations/local-development.md](operations/local-development.md) | Local commands |
| [operations/deployment.md](operations/deployment.md) | Production release, DNS, and TLS |

Start backend work at [backend/delivery-roadmap.md](backend/delivery-roadmap.md). Do not implement an endpoint that the API catalog does not list.
