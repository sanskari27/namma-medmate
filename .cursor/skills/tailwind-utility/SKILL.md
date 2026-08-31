---
name: tailwind-utility
description: Style with Tailwind utilities and shadcn shared-ui — no extra CSS files. Use when implementing Stitch screens or changing UI layout.
---

# Tailwind utility

Use Tailwind utilities + `libs/shared-ui/src/styles/globals.css` + shadcn primitives from `@namma-medmate/shared-ui` (skill `shadcn-shared-ui`). `cn()` from that package merges classes.

No new component `.css`, CSS modules, or styled-components. Translate Stitch HTML into Tailwind + existing primitives; do not paste a second stylesheet or hand-roll Button/Input/Dialog.
