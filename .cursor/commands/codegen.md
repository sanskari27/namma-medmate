# Codegen

Usage: `/codegen`

After OpenAPI (`swagger.yaml`) edits:

```sh
pnpm codegen
pnpm exec nx run contracts:check
```

Follow skill `contract-first-api`. Never hand-edit `libs/*/src/generated`.
