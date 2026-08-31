---
name: stitch-ui-design
description: Generate modern Pharmacy Partner Console or HQ screens with Google Stitch MCP before writing React. Use when implementing §7.5 UI, /design-screens, or any new module screen.
---

# Stitch UI design

Use **Google Stitch MCP** before writing module UI. Do not skip for “small” screens.

## When

Any new or materially changed screen in the requirement’s §7.5.

## Steps

1. Discover tools with `GetDynamicTools` on the Stitch namespace (`project-0-namma-medmate-stitch`). Workspace MCP is `.cursor/mcp.json` via `.cursor/stitch-mcp-proxy.mjs` (strips `outputSchema` so Cursor does not drop the tool list).
2. Read `docs/stitch.json`. Reuse that `projectId` and design system. Do not create a second Namma project. If the file is missing, `list_projects` then write the id there.
3. For each owned screen, `generate_screen_from_text` with a **3-layer prompt**:
   - **Anatomy:** layout from §7.5 (shell + badge, POS cart, list+detail).
   - **Vibe:** modern 2026 SaaS — whitespace, hierarchy, accessible contrast, POS tap targets. **Not** legacy hospital HIS, grey ERP, skeuomorphic clip-art, or spreadsheet-as-page.
   - **Content:** real entities and English copy from the spec (i18n keys, error strings, personas).
4. `get_screen` in the session to translate. Do **not** write `modules/*/docs/design/` (no SCREEN.md, HTML, or PNG in git). Stitch is the source of truth; the repo only keeps `docs/stitch.json`.
5. Implement in React + Tailwind using **shadcn primitives from `@namma-medmate/shared-ui`** (skill `shadcn-shared-ui`). Translate Stitch HTML; do not paste a parallel CSS universe or a second Button/Input.
6. If Stitch is disconnected (`needsAuth` / missing namespace): **stop the UI step**. Tell the user to reconnect Stitch. Do not guess a legacy layout.

## Modern bar

Pharmacy Partner Console + Platform Admin HQ. Contemporary SaaS density (task-focused, not 2010 portal). One token system: shadcn in `shared-ui` + Tailwind. Optional supplement: personal `ui-ux-pro-max`; Stitch remains the screen source of truth.
