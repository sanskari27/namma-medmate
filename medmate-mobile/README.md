# MedMate — Customer App (React Native)

Cross-platform iOS + Android app built from the MedMate design system.
One codebase, native builds (no webview wrapper).

Frontend only for now — the API is mocked behind a single service boundary
and swapped in later without touching any screen.

## Stack

| Layer        | Choice                                                                |
| ------------ | --------------------------------------------------------------------- |
| Runtime      | Expo SDK 58 · React Native 0.88 · React 19.3                          |
| Architecture | New Architecture (Fabric) + Hermes                                    |
| Language     | TypeScript (strict, `noUncheckedIndexedAccess`)                       |
| Navigation   | expo-router (file-based, `app/` directory, route groups)              |
| Styling      | Plain `StyleSheet` + a token module (no CSS-in-JS)                    |
| State        | Zustand 5 (`src/store`, `src/preferences`)                            |
| Icons        | `react-native-svg` with the MVP's original Feather paths              |
| Fonts        | Outfit, static instances 400–800                                      |
| Quality      | ESLint 9 (flat, with layer boundaries) · Prettier · Jest 30 + RNTL 14 |
| Local build  | Gradle + JDK 17 + Android SDK 36 — no EAS, no cloud build             |

## Layout

```
app/                                # expo-router — thin route wrappers only
├── _layout.tsx                     # root stack + AppProviders
├── (onboarding)/                   # splash → login → otp → consent → location
│   ├── _layout.tsx
│   ├── index.tsx  login.tsx  otp.tsx  consent.tsx  location.tsx
└── (app)/                          # signed-in area
    ├── home.tsx  search.tsx  pharmacies.tsx
    ├── category/[id].tsx  product/[id].tsx  pharmacy/[id].tsx

src/
├── shell/                          # AppProviders, ErrorBoundary
├── navigation/                     # route paths + typed params
├── features/onboarding/            # a vertical slice
│   ├── screens/                    # the five onboarding screens
│   ├── components/                 # FeatureStrip, ProductCollage, OtpInput, AddressCard
│   ├── hooks/                      # useOtpTimer, usePhoneValidation
│   ├── constants.ts                # every measured dimension
│   └── index.ts
├── features/discover/              # 02 · Discover
│   ├── screens/                    # Home, Search, Category, Product, Pharmacies, Pharmacy
│   ├── components/                 # ProductCard, ProductTile, PharmacyCard, CategoryTile, …
│   ├── hooks/                      # useFlashCountdown, useCatalogFilters
│   ├── constants.ts                # the measured geometry of all seven frames
│   └── index.ts
├── components/                     # reusable presentation
│   ├── ui/                         # Button, Text, Input, Card, Checkbox, Screen, BrandMark, Hero
│   ├── icons/                      # SVG registry + name→component map
│   └── feedback/                   # LoadingState, EmptyState, ErrorState
├── store/                          # auth, cart, location (Zustand)
├── services/                       # http.ts + domain services + mocks/
├── assets/products/                # bundled catalogue photos + resolveImage()
├── preferences/                    # persisted user preferences (text size)
├── theme/                          # colours, type, layout, TypographyProvider
└── types/  utils/  config/         # contracts, helpers, env

assets/                             # app icon, splash, fonts (build-time)
src/assets/                         # images used by app code
```

`src/app/` is deliberately **not** used — Expo Router prefers it over `app/`
as the route root and would silently take over routing.

## Design tokens

`src/theme/` is a 1:1 port of the live MVP stylesheet
(`https://medmate-india.netlify.app` → Tailwind v4 `--color-*` properties) and
is cross-checked against the Figma **Design system → Colour** page — every hex
matches (forest `#1B3D29`, green `#2F7D52`, green-700 `#256B46`, gold `#D9A648`,
mint `#8FD4A8`, gold/ink `#855B0C`, neutral/faint `#9AA59F`, …).

- **Colours** — 24 tokens: forest, green, green-700, mint 50→300, gold 50→200
  - goldInk, ink, ink2, muted, faint, line, line2, surface 1→3, red, redBg.
- **Type** — the MVP's `t-*` scale (`display`…`btnS`); `letterSpacing` is
  resolved from the CSS `em` values to absolute px.
- **Gradients** — `brand` (`forest → green700`, the onboarding hero),
  `tint`, `art`, `mint`.
- **Motion** — `ease.settle` = `cubic-bezier(.2,.8,.2,1)`.

### Fonts

`Outfit.ttf` (variable) is the upstream file. Static instances are generated
with fontTools because React Native maps `fontFamily` → **file name** on
Android and → **PostScript name** on iOS; the name tables are normalised so
both platforms resolve `Outfit-Regular` … `Outfit-ExtraBold` identically.

### Text size

React Native applies the OS font-size setting to every `<Text>` by default,
and some Android handsets ship a scale below 1.0 — which shrinks all copy and
breaks the measured layouts on that device only. The app owns its scale
instead:

- the OS setting is honoured only **above** 1.0 and capped at 1.3, so every
  device renders the same design;
- `<Text>` from `@/components/ui` is the only text primitive, and it sets
  `allowFontScaling={false}` so the scale is decided in one place;
- an in-app size (Small / Default / Large / Extra large) lives in
  `@/preferences` and is persisted.

`src/theme/typography.test.ts` guards the behaviour.

## Commands

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint . (includes the layer boundaries)
npm run lint:fix
npm run format         # prettier --write .
npm run test           # jest
npm run test:coverage
npm run validate       # typecheck → lint → test
```

## Build

Everything runs locally — no EAS account and no cloud build.

```bash
source scripts/env.sh        # JDK 17 + Android SDK + npm cache
./scripts/prebuild.sh        # regenerate android/ + re-apply local customisations
./scripts/build-apk.sh debug # debug APK
./scripts/build-apk.sh release # signed release APK
```

Outputs land in `android/app/build/outputs/apk/{debug,release}/` and are
copied to the repo root.

> **Note:** `expo prebuild` wipes `android/`, including the release-signing
> block. `scripts/prebuild.sh` re-applies it (and the trimmed ABI list), so
> always prebuild through that script.

### Signing

`android/app/keystore.properties` (git-ignored) points at
`android/app/medmate-release.keystore`. If the file is absent, release builds
fall back to the debug key so they still produce an installable APK.

## Dev loop (screen-by-screen)

```bash
npx expo start                      # Metro
adb reverse tcp:8081 tcp:8081      # so the device can reach Metro
./scripts/capture-screens.sh        # install, launch, screenshot all 5 screens
```

`tools/compare.js <device.png> [ref.png]` renders reference vs native vs a
difference view, so visual drift is obvious.

For a fast check that the bundle resolves (30s instead of a 20-minute Gradle
build):

```bash
npx expo export --platform android --output-dir /tmp/check
```

The local emulator is pinned to **390×844 dp** (`wm size 1024x2216`,
`wm density 420`) — the exact viewport the MVP was measured at. Use
`-gpu host`; the software renderer ANRs the emulator's System UI.

## Screens

Figma's `01 · Onboarding` section has five frames; all five are built.

| #   | Screen            | Route       | Source of truth         |
| --- | ----------------- | ----------- | ----------------------- |
| 01  | Splash            | `/`         | Figma `01 · Onboarding` |
| 02  | Login             | `/login`    | MVP `/login`            |
| 03  | Verify OTP        | `/otp`      | MVP `/otp`              |
| 04  | Terms and consent | `/consent`  | MVP `/consent`          |
| 05  | Delivery location | `/location` | MVP `/location`         |

`02 · Discover` adds six more route screens covering its seven frames.

| #   | Screen              | Route           | Source of truth   |
| --- | ------------------- | --------------- | ----------------- |
| 06  | Home                | `/home`         | MVP `/home`       |
| 07  | Search              | `/search`       | MVP `/search`     |
| 08  | Category            | `/category/:id` | MVP `/category/*` |
| 09  | Product             | `/product/:id`  | MVP `/product/*`  |
| 10  | Product · Rx        | `/product/:id`  | MVP `/product/*`  |
| 11  | Pharmacies near you | `/pharmacies`   | MVP `/pharmacies` |
| 12  | Pharmacy            | `/pharmacy/:id` | MVP `/pharmacy/*` |

**09 and 10 are one screen in two states.** The Rx state is driven by the
product's `requiresPrescription` flag — exactly how the MVP does it — and adds
the pack/form/storage facts, the prescription notice and the detail tabs.

Still to build: `03 · Checkout and fulfilment`, `04 · Prescriptions and care`,
`05 · Orders and account` — **39 screens total**, per the Figma cover page.
