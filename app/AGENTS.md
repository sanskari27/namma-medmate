# MedMate Customer App — agent notes

Native (React Native / Expo) rebuild of the MedMate customer app.

## Source of truth

| Thing        | Where                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Live web MVP | `https://medmate-india.netlify.app` — a Next.js App Router SPA           |
| Figma design | `figma.com/design/LUUi1nmQJys6HC5Gk1Kb7r/MedMate — Customer App UI & UX` |
| Scope        | **39 screens** across 5 sections (Figma cover page)                      |

The Figma file is a 1:1 mirror of the live MVP. Screens in Figma = screens in
the MVP, so **the MVP is the easier reference** (real DOM, exact geometry).

### Reading Figma without an API token

The file is public but the editor is behind a sign-up wall, and
`api.figma.com/v1/files/:key` returns `403 Invalid token` without a token.
What works:

1. Load the design URL, click **"Expand UI for file named …"** to open the
   layers panel (page + section names become readable).
2. `ctrl` + mouse-wheel over the canvas zooms toward the cursor — this is the
   only reliable way to zoom in. Figma's own zoom dropdown and `Shift+2` /
   `Shift+3` shortcuts do nothing in the anonymous view-only shell.
3. `page.mouse.wheel` **without** ctrl pans the canvas.

`tools/figma-nodes.js`, `tools/figma-frame2.js` and `tools/figma-frames.js`
implement this.

### Reaching the MVP's authenticated screens

The MVP is a front-end-only prototype: **no backend API calls at all**, and
every route except `/login` and `/otp` redirects to `/login` when signed out.

To get past it:

1. `/login` → enter any 10-digit number → **Get code**.
2. On `/otp`, submit a wrong code (e.g. `0000`). The page then reveals
   _"Demo build, no SMS is sent. Your code is 1234"_ — **the code rotates per
   session**, so read it out of the DOM, never hardcode it.
3. Enter that code → **Verify and continue** → `/home`.
4. The session persists in the browser context; navigate freely after that.

Useful routes: `/home` `/search` `/cart` `/orders` `/prescriptions` `/consult`
`/account` `/notifications` `/help` `/offers` `/location` `/upload-rx`
`/schedule` `/consent` `/otp` `/legal/terms` `/legal/privacy`
`/category/{fever,cold,stomach,antibiotic,diabetes,heart,vitamins,skin}`
`/product/{id}` `/pharmacies` `/pharmacy/{id}`

## Architecture

Feature-first. The dependency graph only ever points downwards, and ESLint
enforces it (`eslint.config.js` → `LAYERS`).

```
app/                              expo-router — thin route wrappers only
  _layout.tsx                     root stack + providers
  (onboarding)/                   splash → login → otp → consent → location
  (app)/                          signed-in area
    home.tsx  search.tsx  pharmacies.tsx
    category/[id].tsx  product/[id].tsx  pharmacy/[id].tsx

src/
  shell/                          app shell: AppProviders, ErrorBoundary
  navigation/                     route paths + typed params
  features/<feature>/             vertical slices
    screens/    components/  hooks/  constants.ts  index.ts
  components/                     reusable presentation
    ui/          Button, Text, Input, Card, Checkbox, Screen, BrandMark, Hero
    icons/       SVG registry + name→component map + NamedIcon
    feedback/    LoadingState, EmptyState, ErrorState
  store/                          client state (Zustand): auth, cart, location
  services/                       data access: http.ts + domain services + mocks
  preferences/                    persisted user preferences (text size)
  theme/                          design tokens + TypographyProvider
  types/  utils/  config/         shared contracts, pure helpers, env
  assets/products/                bundled catalogue imagery + resolveImage()
```

Rules:

- **A screen never lives in `app/`.** Route files re-export a screen from
  `src/features/<feature>/screens`. The router directory stays thin.
- **`src/app/` is reserved for Expo Router.** Expo Router prefers `src/app`
  over `app/` as the route root — creating `src/app/` silently hijacks
  routing. The shell lives in `src/shell/` for exactly this reason.
- **Never import `Text` from `react-native`.** Use the `<Text>` primitive from
  `@/components/ui` — it owns the font scale (see below). ESLint blocks the
  raw import inside features.
- **Route paths come from `@/navigation/routes`**, never a string literal.
- **Mock the API, don't fake the data.** `services/http.ts` has a single
  `request<T>()` entry point; `services/mocks/` answers behind it. Flipping
  `EXPO_PUBLIC_USE_MOCK_API=false` switches to the real API with no caller
  changes.
- **Never resolve a component from a map during render.** The React Compiler
  lint rules reject it ("components created during render"). Use the
  `<NamedIcon name="…" />` switch in `src/components/icons/NamedIcon.tsx`
  instead of `getIcon()`.
- **Don't call `Date.now()` in render.** Capture it in a lazy `useState`
  initialiser (`useState(() => Date.now())`) or inside an effect; the purity
  rule rejects it everywhere else.

## Conventions

| Thing          | Convention                                           | Example                                        |
| -------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Components     | `PascalCase.tsx`, one component per file             | `src/components/ui/Button.tsx`                 |
| Hooks          | `useThing.ts`                                        | `src/features/onboarding/hooks/useOtpTimer.ts` |
| Services       | `thing.service.ts`                                   | `src/services/auth.service.ts`                 |
| Stores         | `thing.store.ts`                                     | `src/store/cart.store.ts`                      |
| Types          | `thing.ts`                                           | `src/types/domain.ts`                          |
| Feature data   | `constants.ts` inside the feature                    | `src/features/onboarding/constants.ts`         |
| Imports        | the `@/` alias, never `../../`                       | `import { colors } from '@/theme'`             |
| Text           | a `variant` token + a `tone`, never raw hex          | `<Text variant="h3" tone="muted">`             |
| Colours & type | `src/theme` only                                     | `colors.green`, `typography.h3`                |
| Measurements   | `constants.ts` of the feature, with the source noted | `HERO_HEIGHT = 484`                            |

Geometry is **measured, not eyeballed** — every constant in
`src/features/*/constants.ts` was read off the MVP at a 390×844 viewport
(`tools/capture-dom-auth.js` dumps computed styles + rects for any route).

## The catalogue

`02 · Discover` ships the real MVP catalogue rather than placeholder rows:

- `src/types/domain.ts` — `Category`, `Pharmacy` (rating, reviews, open hours,
  delivery fee, photo strip) and `Product` (composition, subtitle, tags,
  pack/form/storage).
- `src/services/mocks/data.ts` — 34 categories, 38 products and 7 pharmacies,
  extracted from the live MVP. Prices, discounts and MRPs are internally
  consistent (asserted by `src/services/mocks/catalog.test.ts`).
- `src/services/mocks/index.ts` — the mock route table, including
  `GET /products/:id/offers`, which prices a product per store.
- `src/assets/products/` — 66 bundled catalogue photos.
  `resolveImage()` prefers the bundled file and falls back to the CDN URL, so
  the app works offline and the backend can serve its own URLs later.
  Regenerate the index with `node tools/gen-assets-index.js`.

## Extracting data from the MVP

| Tool                        | What it does                                           |
| --------------------------- | ------------------------------------------------------ |
| `tools/capture-dom-auth.js` | DOM + computed styles + rects for a set of routes      |
| `tools/mvp-products.js`     | Scrapes the product / category / pharmacy catalogue    |
| `tools/mvp-images.js`       | Collects every image URL with the routes it appears on |
| `tools/domtree.py`          | Geometry-first DOM view                                |
| `tools/domq.py`             | Query elements by text, class or tag                   |
| `tools/domrows.py`          | Row-by-row wireframe view of a captured page           |

All of them authenticate first (see "Reaching the MVP's authenticated screens"
above) and write into `_ref/mvp/`.

## The font-scale rule

React Native applies the OS font-size setting to every `<Text>` natively
(`allowFontScaling` defaults to `true`). Several Android OEM builds ship
`font_scale < 1.0`, which silently shrinks all copy while our containers keep
their measured heights — the same build then looks pixel-perfect on one
handset and broken on another.

The app owns its scale instead:

- `src/theme/typography.ts` — `fontScalePolicy` clamps the OS setting to
  `[1.0, 1.3]`: below 1.0 it is ignored, so every device renders the
  measured design.
- `src/theme/TypographyProvider.tsx` — resolves the effective scale and
  hands the scaled type tokens to the tree.
- `src/components/ui/Text.tsx` — the only text primitive; it sets
  `allowFontScaling={false}` so the scale is decided in exactly one place.
- `src/preferences/text-size.store.ts` — the user's in-app size (Small /
  Default / Large / Extra large), persisted and applied on top.

`src/theme/typography.test.ts` is the regression guard. Text-bearing
containers use `minHeight`, not `height`, so a larger size grows the box
instead of clipping the caption.

The in-app size picker (`src/preferences/text-size.store.ts`) is plumbed
through `AppProviders`; its UI lands with the Account screen in the
`05 · Orders and account` milestone.

## Local Android toolchain

Already installed on this machine — no downloads needed:

- JDK 17 → `/opt/homebrew/opt/openjdk@17`
- Android SDK → `~/Library/Android/sdk` (platforms 34/37, build-tools 34/36/37)
- Emulator AVD `medmate` (android-34 google_apis arm64-v8a)

```bash
source app/scripts/env.sh          # sets JAVA_HOME / ANDROID_HOME / npm cache
emulator -avd medmate -no-window -no-audio -no-boot-anim \
         -gpu host -memory 3072 -port 5554
adb shell wm size 1024x2216        # => exactly 390x844 dp
adb shell wm density 420
```

- **`-gpu host` is required.** With `-gpu swiftshader_indirect` the emulator's
  System UI ANRs within minutes.
- `npm`'s global cache (`~/.npm/_cacache`) has broken permissions — always
  install with `--cache` pointed at `tools/.npm-cache` (already in `env.sh`).
- `expo-router` replaced the root `App.tsx`; the entry point is
  `expo-router/entry` and routes live in `app/app/`.
- `npx expo export --platform android` is the fast way to catch resolution
  errors — it bundles in ~30s instead of the ~20 min a Gradle build takes.

## The parity loop (how to iterate fast)

A release Gradle build costs **~21–25 minutes** on this machine (measured:
`assembleDebug` finished in `21m 21s`). Rebuilding the release APK for every
visual fix is the single biggest time sink in this project — the 02 · Discover
parity pass alone needed 9+ corrections.

**Never rebuild the release APK to check a change.** Use the debug loop:

```bash
source app/scripts/env.sh
cd app/android && ./gradlew assembleDebug        # once, ~21 min
adb install -r app/build/outputs/apk/debug/app-debug.apk
npx expo start --port 8081 &                     # Metro serves the JS
adb reverse tcp:8081 tcp:8081                    # device -> host Metro
```

After that, a code change is live on the device in **~10–20 seconds**
(Metro rebundle → reload). Screenshot it with
`adb exec-out screencap -p > out.png` and diff it with
`python3 tools/pixdiff.py device.png ref.png`.

So the cycle becomes:

| step | debug + Metro | release APK |
| --- | --- | --- |
| apply a visual fix | ~20 s | ~21 min |
| see it on device | ~15 s | ~25 min |
| full parity sweep of a section | ~10 min | ~35 min |

**Rule: the signed release APK is a section-boundary deliverable**, not an
iteration tool. Build it once per Figma section
(`./scripts/build-apk.sh release`) and ship it.

**Measure every remaining route in one browser session.** Do not capture
route-by-route:

```bash
node tools/capture-dom-auth.js /cart /orders /prescriptions /consult /account \
     /notifications /help /offers /upload-rx /schedule /legal/terms /legal/privacy
```

12 routes take **2m 26s** in one session (auth once, then one `goto` each),
versus ~30–60 s of auth overhead *per route*. The output lands in
`_ref/mvp/dom_<route>.json` (+ `ref_<route>.png`), and the JSON is the tracked
audit trail for every constant in `constants.ts`.

The MVP's persisted state lives in `localStorage` under **`medmate-v1`**
(`profile, family, meds, medLog, addresses, orders, rx, consent, wallet, abha,
addressId`) and **`medmate-sync`** (a `{rev,last}` ping). The **cart is not
persisted** — to capture a populated `/cart`, add items through the UI before
screenshotting.

## Ground rules

- Build against **measured** geometry, not eyeballs.
- Iterate on the **debug** APK; ship the **release** APK at section boundaries.
- Keep `src/theme/` as the only source of colours and type.
- `scripts/prebuild.sh` (not raw `expo prebuild`) — it re-applies the release
  signing config and the trimmed ABI list.
- `npm run validate` (typecheck → lint → test) must pass before a build.
