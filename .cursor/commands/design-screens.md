# Design screens

Usage: `/design-screens 01-tenancy`

Generate or update Stitch screens for a module’s §7.5 UI. No production React in this command.

## Steps

1. Read the spec §7.5.
2. Follow skill `stitch-ui-design` (agent `ui-designer`).
3. Write `modules/{slug}/docs/design/SCREEN.md` per screen.

If Stitch MCP is disconnected, stop and ask the user to reconnect. Do not invent a legacy layout.
