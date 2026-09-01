# Admin UI contract

MASTER / platform CRM for Namma MedMate operators. Not the pharmacy POS and
not a clone of dispensary with a dark theme swapped in.

## Voice and chrome

- Copy: platform and tenant — HQ sign in, tenant, KYC, impersonation, plan.
  Avoid chemist-floor words (counter, bill, patient) unless the story truly
  shows tenant data in those terms.
- Visual: midnight navy canvas, steel-cyan accent, IBM Plex Serif wordmark.
  Hairline borders, no drop shadows. Scan many pharmacies, not one counter.
- Layout: compact command header + narrow rail. Oversight density.

## Tokens (from `admin/src/index.css`)

| Role | Token | Hex |
| --- | --- | --- |
| Canvas | `canvas` | `#0c1018` |
| Surface | `surface` | `#181f2e` |
| Elevated | `elevated` | `#232c3f` |
| Ink | `ink` | `#e8eef6` |
| Muted | `muted` | `#9aa6bb` |
| Brand | `brand` | `#5ba4cf` |
| Soft | `brand-soft` | `#1a3344` |
| Line | `line` | `#3a4860` |
| Warn / danger | `warn` / `danger` | `#d4a054` / `#e35d5d` |

Type: **IBM Plex Sans** (UI), **IBM Plex Serif** (HQ wordmark), **IBM Plex
Mono** (tenant IDs, plan codes). Radius 2–6px. Dark `color-scheme`.

Do not import dispensary light/viridian tokens or Noto families.

## Libraries (this app only)

- Motion: `motion/react` — one reveal per route (horizontal, not the
  dispensary vertical lift); respect reduced motion.
- Charts: `recharts` via `src/components/charts/AreaMetricChart.tsx`.
- Primitives: Radix in `src/components/ui`, restyled to the tokens above.
- Icons: `lucide-react`.

Do not add GSAP, Lenis, Rive, Lottie, visx, Nivo, Tremor, or D3 here.

## Uniqueness

- Implement screens in `admin/` only. Do not paste dispensary pages, light
  shop-floor chrome, or “Pharmacy sign in” copy.
- Personas are MASTER / platform staff. Do not add OWNER/staff branch-switch
  chrome unless the story lists admin for that behavior.

## States

Every story screen still needs loading, empty, validation, denied, conflict,
failure, and success with operator-facing messages (tenant, permission,
lockout), not counter instructions.
