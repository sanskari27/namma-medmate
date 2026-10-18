// Shared components. They hold no state, so they render on the server; get-app.tsx also uses a few in the browser.
// Keep catalogue imports out of this file so the client bundle stays small (product parts live in product.tsx).
import Link from "next/link";
import { IC } from "@/lib/icons";
import { IOS_URL, PLAY_URL, downloadHref, ld } from "@/lib/site";

export function Icon({ name, size = 20, className = "", fill = false }: { name: string; size?: number; className?: string; fill?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden
      fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: IC[name] ?? "" }}
    />
  );
}

/**
 * Text-only wordmark (brand sheet v1.2): "Med" forest or white, "Mate" always gold. With `tagline`, the primary lockup:
 * "CARE · DELIVERED IN MINUTES" letter-spaced beneath, justified to the wordmark's width (mid green on light, mint on dark).
 * The sheet drops the slogan below 20px, so it is only drawn when the wordmark is 20px or larger.
 */
export function Wordmark({ size = 26, dark = false, tagline = false }: { size?: number; dark?: boolean; tagline?: boolean }) {
  const mark = (
    <span className="font-bold leading-none tracking-[-0.035em]" style={{ fontSize: size }}>
      <span className={dark ? "text-white" : "text-forest"}>Med</span>
      <span className="text-gold">Mate</span>
    </span>
  );
  if (!tagline || size < 20) return mark;
  return (
    // w-fit: never stretch to a flex parent's width, or the justified slogan spreads out across it.
    <span className="inline-flex w-fit max-w-full flex-col" style={{ gap: Math.round(size * 0.14) }}>
      {mark}
      <span aria-label="Care, delivered in minutes" className={`block w-full whitespace-nowrap font-semibold uppercase leading-none [text-align-last:justify] ${dark ? "text-mint" : "text-green"}`} style={{ fontSize: Math.max(6.5, size * 0.235), letterSpacing: "0.08em" }}>
        Care · Delivered in minutes
      </span>
    </span>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

/** Section title with the last word in green ("Shop by **category**"). */
export function Heading({ eyebrow, title, accent, lead, center, as: Tag = "h2" }: { eyebrow?: string; title: string; accent?: string; lead?: string; center?: boolean; as?: "h1" | "h2" }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? "sm:items-center sm:text-center" : ""}`}>
      {eyebrow && <p className="d-eyebrow text-green-700">{eyebrow}</p>}
      <Tag className={Tag === "h1" ? "d-h1" : "d-h2"}>
        {title}{accent && <> <span className="text-green">{accent}</span></>}
      </Tag>
      {lead && <p className={`d-lead max-w-[640px] text-ink-2 ${center ? "sm:mx-auto" : ""}`}>{lead}</p>}
    </div>
  );
}

export function Badge({ children, tone = "mint" }: { children: React.ReactNode; tone?: "mint" | "gold" | "red" | "forest" | "plain" }) {
  const t = { mint: "bg-mint-100 text-green-700", gold: "bg-gold text-forest", red: "bg-red-bg text-red", forest: "bg-forest text-white", plain: "bg-surface-2 text-ink-2" }[tone];
  return <span className={`d-tag inline-flex items-center gap-1 rounded-md px-2 py-0.5 ${t}`}>{children}</span>;
}

/** Primary action: opens the get-the-app dialog on desktop and the waitlist sheet on a phone (/download without JavaScript). */
export function GetAppLink({ from, to, children, variant = "primary", className = "" }: { from: string; to?: string; children: React.ReactNode; variant?: "primary" | "gold" | "white" | "outline" | "outlineDark"; className?: string }) {
  const v = {
    primary: "bg-green text-white hover:bg-green-700",
    gold: "bg-gold text-forest hover:bg-gold-200",
    white: "bg-surface text-forest hover:bg-mint-50",
    outline: "border-[1.5px] border-green text-green hover:bg-mint-50",
    outlineDark: "border-[1.5px] border-white/40 text-white hover:bg-white/10",
  }[variant];
  return (
    <a href={downloadHref(from, to)} data-get-app={from} data-to={to} className={`press d-btn inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 max-sm:w-full ${v} ${className}`}>
      {children}
    </a>
  );
}

const PlayGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M4 2.8v18.4c0 .6.6 1 1.2.7l15.9-9.2c.5-.3.5-1.1 0-1.4L5.2 2.1C4.6 1.8 4 2.2 4 2.8z" /></svg>
);
const AppleGlyph = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9c-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.9-1.1-2.9-4.2zM13.9 5.1c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" /></svg>
);

/** Store buttons. Until a listing exists the button says "Coming soon" and is not a link. */
export function StoreButtons({ dark = false, from }: { dark?: boolean; from: string }) {
  const stores = [
    { name: "Google Play", top: "Get it on", url: PLAY_URL, glyph: <PlayGlyph /> },
    { name: "App Store", top: "Download on the", url: IOS_URL, glyph: <AppleGlyph /> },
  ];
  const base = `flex h-12 items-center gap-2 whitespace-nowrap rounded-xl px-3 sm:gap-2.5 sm:px-4 ${dark ? "bg-white/10 text-white ring-1 ring-white/20" : "bg-ink text-white"}`;
  // Before the listings exist, phones get one quiet line instead of two buttons that do nothing.
  const none = stores.every((s) => !s.url);
  return (
    <div className={`flex flex-wrap gap-2.5 max-sm:[&>*]:flex-1 max-sm:[&>*]:justify-center ${none ? "max-sm:hidden" : ""}`}>
      {stores.map((s) =>
        s.url ? (
          <a key={s.name} href={`${downloadHref(from)}`} data-get-app={from} className={`press ${base}`}>
            {s.glyph}
            <span className="flex flex-col leading-none"><span className="text-[10px] font-medium opacity-80">{s.top}</span><span className="text-[14px] font-bold sm:text-[15px]">{s.name}</span></span>
          </a>
        ) : (
          <span key={s.name} className={`${base} opacity-90`} aria-label={`${s.name}: coming soon`}>
            {s.glyph}
            <span className="flex flex-col leading-none"><span className="text-[10px] font-medium opacity-80">Coming soon on</span><span className="text-[14px] font-bold sm:text-[15px]">{s.name}</span></span>
          </span>
        ),
      )}
    </div>
  );
}

/** Phone-only replacement for StoreButtons until the apps are listed. */
export function StoreLine({ dark = false }: { dark?: boolean }) {
  if (PLAY_URL || IOS_URL) return null;
  return <p className={`d-caption flex items-center gap-2 sm:hidden ${dark ? "text-mint-200" : "text-muted"}`}><Icon name="phone" size={14} className={dark ? "text-gold" : "text-green-700"} />Android and iPhone apps at launch.</p>;
}

/** QR code on a white tile. `svg` comes from qrSvg() at build time. */
export function Qr({ svg, size = 132, className = "" }: { svg: string; size?: number; className?: string }) {
  return (
    <span className={`block shrink-0 rounded-2xl bg-surface p-2.5 shadow-sh1 ring-1 ring-line ${className}`} style={{ width: size + 20, height: size + 20 }}>
      <span className="block [&>svg]:h-full [&>svg]:w-full" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />
    </span>
  );
}

/** App screenshot in a phone bezel. Screens are captures of the app in development with sample data, and say so. */
export function Phone({ src, alt, width = 280, className = "", priority }: { src: string; alt: string; width?: number; className?: string; priority?: boolean }) {
  return (
    <div className={`shrink-0 rounded-[40px] bg-ink p-[8px] shadow-[0_30px_60px_-20px_rgb(20_32_26/0.45)] max-sm:[--phone-max:240px] sm:rounded-[44px] sm:p-[9px] ${className}`} style={{ width: `min(${width}px, var(--phone-max, 100%))` }}>
      <div className="relative overflow-hidden rounded-[32px] bg-surface sm:rounded-[36px]" style={{ aspectRatio: "390 / 844" }}>
        <img src={src} srcSet={`${src.replace(/\.webp$/, "-480.webp")} 480w, ${src} 600w`} sizes="(max-width: 639px) 240px, 300px" alt={alt} width={390} height={844} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className="h-full w-full object-cover object-top" />
        <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/75 px-2.5 py-1 text-[10px] font-semibold text-white">App preview · sample data</span>
      </div>
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(data) }} />;
}

/** Visible breadcrumb trail plus BreadcrumbList structured data. */
export function Breadcrumbs({ items, base }: { items: [string, string][]; base: string }) {
  return (
    <nav aria-label="Breadcrumb" className="d-caption text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map(([label, href], i) => (
          <li key={href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <Icon name="chev-r" size={12} className="text-faint" />}
            {i < items.length - 1 ? <Link href={href} className="whitespace-nowrap hover:text-green-700">{label}</Link> : <span aria-current="page" className="max-w-[58vw] truncate text-ink-2 sm:max-w-none">{label}</span>}
          </li>
        ))}
      </ol>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: base + (href === "/" ? "" : href) })),
      }} />
    </nav>
  );
}

/** FAQ accordion (works without JavaScript) plus FAQPage structured data. */
export function Faq({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map(([q, a], i) => (
        <details key={q} className="group px-4 sm:px-5" open={i === 0}>
          <summary className="flex cursor-pointer items-center gap-3 py-4 text-[16px] font-semibold leading-6 sm:gap-4 sm:text-[17px]">
            <span className="flex-1">{q}</span>
            <Icon name="chev-d" size={20} className="chev text-green transition-transform duration-200" />
          </summary>
          <p className="pb-5 pr-2 text-[15px] leading-6 text-ink-2 sm:pr-8 sm:text-[16px]">{a}</p>
        </details>
      ))}
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      }} />
    </div>
  );
}
