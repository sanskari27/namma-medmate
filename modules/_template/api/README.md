# Template API

Create `src/`, `contract/swagger.yaml`, and tests using `modules/auth/api` as the reference implementation. Do not add a `db/` folder.

HTTP routes are `/<module-name>/...` (for example `/auth/session`). `/health` is mounted by `@namma-medmate/lambda-bootstrap` and is not part of the module contract.

Shared request parsing, OpenAPI middleware, Lambda handler wrapping, and local listen helpers live in `libs/lambda-bootstrap`. Domain controllers stay in the module.
