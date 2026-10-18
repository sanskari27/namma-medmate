# MedMate India website (main website)

The complete source for **https://medmateindia.netlify.app**, the main MedMate website: code, data, images, build scripts and brand files. The desktop and phone versions are the same code: pages adapt to the screen size (phone layout below 640px). This folder does not depend on any other folder; copy it anywhere and it builds on its own.

The D2C customer app is a separate project in `../MedMate-D2C-App`.

In this repository the same static site is the public site for **https://medmatepharmacy.com**. Production builds set `SITE_URL=https://medmatepharmacy.com`, serve `out/` from the EC2 website container (`127.0.0.1:10082`), and Route 53 points the domain at that host. The waitlist form posts to the Spring API (`NEXT_PUBLIC_API_BASE_URL`, default `https://api.nammamedmate.com` in production). Contact and pharmacy-partner stay Netlify forms (`data-netlify`).

It is a static Next.js 16 site. `npm run build` turns it into plain HTML pages in `out/` (about 440 pages), which any static host can serve.

## What is in the folder

| Path | What it is |
|---|---|
| `src/app/` | Every page: home, medicines A–Z and categories, one page per medicine, Bengaluru and its 92 area pages, blog, For pharmacies, About, contact, privacy, terms, download/waitlist, search, sitemap, robots, RSS, llms.txt |
| `src/components/` | Shared parts: header, footer, menus, waitlist and pincode forms, product cards, language switch (English, Kannada, Hindi) |
| `src/lib/` | Content and data: blog posts, partner page copy, About page, Bengaluru areas, translations, site settings (`site.ts`), and the data files below |
| `src/lib/catalogue.json`, `details.json` | Medicine list and full product information |
| `src/lib/compliance.json` | Which products are prescription-only or hidden (keep in step with the app's copy) |
| `src/lib/pincodes.json` | Bengaluru pincodes and India Post localities |
| `public/products/` | 314 pack photos |
| `public/screens/` | App screenshots used in phone mockups (marked "App preview · sample data") |
| `public/partner/`, `public/people/` | Partner console screens, pharmacy photo, founder photo |
| `public/og.png`, `public/logo.png` | Share image and logo |
| `scripts/` | `make-images.py` (share image, logo, Apple icon), `make-favicons.py` (favicon.ico, icon.png, apple-icon.png, icon-192.png, logo.png from the MedMate wordmark icon), `build-pincodes.py` + `pincodes-raw.json` (pincode data), `sync-from-app.mjs` (optional catalogue refresh from the app) |
| `brand/` | Logo brand sheet (PDF), logo files, Outfit font with its licence (SIL OFL 1.1) |
| `netlify.toml` | Hosting settings (caching headers, publish folder) |

## Run it on your computer

Needs Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3200. The waitlist posts to `http://localhost:8080` unless `NEXT_PUBLIC_API_BASE_URL` is set. Contact and pharmacy-partner still submit only on Netlify.

## Build

```bash
SITE_URL=https://medmateindia.netlify.app npm run build
```

`SITE_URL` must be the address the site will live at: canonical links, the sitemap, robots.txt and every QR code are built from it. If you move to your own domain, build with that domain instead.

Other build-time settings (all optional):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Spring API for waitlist sign-ups. Default `http://localhost:8080`. Production images use `https://api.nammamedmate.com`. |
| `NEXT_PUBLIC_APP_URL` | The customer app. Default `https://medmate-india.netlify.app`. |
| `NEXT_PUBLIC_PLAY_URL`, `NEXT_PUBLIC_IOS_URL` | Store links. Empty shows "Coming soon". |

## Deploy to Netlify

The live site is **medmateindia** (site id `c2f42f53-0791-4e46-8e32-28b96bc81ef5`) in the youthbharat01@gmail.com Netlify account.

```bash
npx netlify-cli deploy --prod --no-build --dir out --site c2f42f53-0791-4e46-8e32-28b96bc81ef5
```

Build first (above). `--no-build` uploads the finished `out/` folder as it is. Without it, the Netlify CLI rebuilds the site itself, which can lose `SITE_URL`.

To start a brand-new Netlify site instead: create the site, turn on **Form detection** (Forms settings), set **Visitor access** to Public, then deploy as above with its id. Contact and pharmacy-partner are detected on the first deploy. Waitlist sign-ups are stored by the API and listed in the admin Waitlist screen, not under Netlify Forms.

## Common changes

- **Launch day:** set `LAUNCHED = true` in `src/lib/site.ts`. "Launching soon" wording and waitlist buttons switch to the live app and download flow.
- **Contact details:** fill `CIN`, `SUPPORT` and `GRIEVANCE_OFFICER` in `src/lib/site.ts`; they then appear in the footer and on `/contact`.
- **Blog:** posts are in `src/lib/blog.ts` and `src/lib/posts-more.ts`; the order is set in `ORDER` in `blog.ts`.
- **Medicines:** edit the JSON files in `src/lib/`, or refresh them from the customer app with `node scripts/sync-from-app.mjs ../MedMate-D2C-App`.
- **Share image or logo:** `npm run images` (uses the Outfit font in `brand/fonts/`).
- **Pincodes:** edit `scripts/pincodes-raw.json` and run `npm run pincodes`.

## Content rules

The site is in "launching soon" mode: it does not claim live delivery, offers or partner numbers until they are real, and prescription medicines carry no order button. Kannada and Hindi text in `src/lib/i18n.ts` should be read by a native speaker. See `MedMate_Website_Compliance_Review.docx` in the MedMate project for the reasoning.
