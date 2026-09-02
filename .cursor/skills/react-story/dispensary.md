# Dispensary UI contract

Pharmacy-floor app for OWNER and staff (pharmacist, cashier, inventory,
accountant). Not a generic SaaS dashboard and not the admin console.

## Voice and chrome

- Copy: operational and local — sign in, branch, counter, stock, patient,
  bill. Avoid “platform”, “tenant admin”, “HQ”, “master”.
- Visual: light clinic paper, high-density forms and tables, viridian accent.
  Keep contrast for a bright shop floor. Dense lists beat card grids.
- Layout: 4px brand rail, compact 44px header, left nav. Branch context
  visible once the story introduces it. Prefer speed over marketing chrome.

## Tokens (from `dispensary/src/index.css`)

| Role | Token | Hex |
| --- | --- | --- |
| Canvas | `canvas` | `#e8efe9` |
| Surface | `surface` | `#f7faf7` |
| Ink | `ink` | `#13241b` |
| Muted | `muted` | `#3a5248` |
| Brand | `brand` | `#0a6b47` |
| Soft | `brand-soft` | `#d7eee3` |
| Line | `line` | `#b3c6ba` |
| Warn / danger | `warn` / `danger` | `#b45309` / `#b42318` |

Type: **Noto Sans** (UI), **Noto Serif** (wordmark only), **IBM Plex Mono**
(batch, GSTIN, paise). Radius 4–8px. No card shadows. Tabular nums.

## Libraries (this app only)

- Motion: `motion/react` — one reveal per route; respect reduced motion.
- Charts: `recharts` via `src/components/molecules/area-metric-chart`.
- Primitives: Radix in `src/components/atoms`, restyled to the tokens above.
- Screens live in `src/screens/<name>/`. Shared domain blocks go in
  `src/components/templates` when two screens need the same application UI.
- Icons: `lucide-react`.

Do not add GSAP, Lenis, Rive, Lottie, visx, Nivo, Tremor, or D3 here.

## Uniqueness

- Implement screens in `dispensary/` only. Do not paste admin pages or reuse
  admin class names, dark tokens, IBM Plex Sans UI, or HQ copy.
- Personas are pharmacy staff. MASTER-only flows do not belong here unless
  the story lists dispensary for a staff-facing part of that flow.

## States

Every story screen still needs loading, empty, validation, denied, conflict,
failure, and success with chemist-facing messages (what to do next at the
counter), not platform-operator jargon.
