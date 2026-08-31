# Design screens

Usage: `/design-screens 01-tenancy`

Generate or update Stitch screens for a module’s §7.5 UI. No production React in this command — implementation uses shadcn via `/implement-module` and skill `shadcn-shared-ui`.

## Steps

1. Read the spec §7.5.
2. Follow skill `stitch-ui-design` (agent `ui-designer`).
3. Reuse `docs/stitch.json`. Do not write `modules/*/docs/design/`.

If Stitch MCP is disconnected, stop and ask the user to reconnect. Do not invent a legacy layout.
