import Link from "next/link";
import { PINCODES, POPULAR_AREAS, ZONES, areasForPin } from "@/lib/areas";
import { CATEGORIES } from "@/lib/catalogue";
import { CIN, COMPANY, LEGAL_LINKS, REGISTERED_OFFICE, SUPPORT } from "@/lib/site";
import { MobileNav } from "./mobile-nav";
import { PincodeFinder } from "./pincode-finder";
import { Container, GetAppLink, Icon, Qr, StoreButtons, StoreLine, Wordmark } from "./ui";

const NAV: [string, string][] = [
  ["Medicines", "/medicines"],
  ["Doctor consult", "/doctor-consultation"],
  ["For pharmacies", "/pharmacy-partner"],
  ["Blog", "/blog"],
  ["About", "/about"],
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface lg:bg-surface/95 lg:backdrop-blur">
      <Container className="flex h-16 items-center gap-3 lg:h-[72px] lg:gap-6">
        <Link href="/" aria-label="MedMate home" className="shrink-0"><Wordmark size={28} tagline /></Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-[15px] font-medium text-ink-2 hover:bg-mint-50 hover:text-green-700">{label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link href="/search" aria-label="Search medicines" className="press flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-mint-50 hover:text-green-700"><Icon name="search" size={22} /></Link>
          <GetAppLink from="header" className="!h-10 !px-3.5 !text-[15px] max-sm:!hidden sm:!h-11 sm:!px-4 sm:!text-[16px]">
            <Icon name="star" size={18} fill className="hidden sm:block" /><span className="hidden sm:inline">Claim it - Join the Waitlist</span><span className="sm:hidden">Claim it</span>
          </GetAppLink>
          <MobileNav nav={[...NAV, ["How it works", "/#how-it-works"]]} />
        </div>
      </Container>
    </header>
  );
}

export function Footer({ qr }: { qr: string }) {
  const cats = CATEGORIES.slice(0, 10);
  return (
    <footer className="brand-zone mt-14 text-white lg:mt-24">
      <Areas />
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:py-16">
        <div className="col-span-2 flex flex-col gap-4 lg:col-span-1">
          <Wordmark size={34} dark tagline />
          <p className="max-w-[340px] text-mint-200">Medicines from licensed neighbourhood pharmacies near you. Launching soon in Bengaluru.</p>
          <div className="mt-2 flex items-center gap-4">
            <Qr svg={qr} size={96} className="!p-2 !ring-0" />
            <p className="max-w-[160px] text-sm text-mint-200">Launching soon. Scan to join the waitlist on your phone.</p>
          </div>
          <StoreButtons dark from="footer" />
          <StoreLine dark />
        </div>
        <FooterCol title="Medicines" links={[...cats.map((c) => [c.name, `/medicines/${c.slug}`] as [string, string]), ["All categories", "/medicines"]]} />
        <FooterCol title="MedMate" links={[["How it works", "/#how-it-works"], ["Talk to a doctor", "/doctor-consultation"], ["Upload a prescription", "/upload-prescription"], ["Blog", "/blog"], ["Search medicines", "/search"], ["Premium for waitlist members", "/premium"], ["Download the app", "/download"], ["About us", "/about"], ["Our team", "/about#team"]]} />
        <FooterCol title="For pharmacies" links={[["Partner console", "/pharmacy-partner"], ["Features", "/pharmacy-partner#features"], ["Pricing", "/pharmacy-partner#pricing"], ["Book a free demo", "/pharmacy-partner#register"], ["Sell medicines online", "/blog/sell-medicines-online-pharmacy-india"], ["Documents checklist", "/blog/documents-to-list-pharmacy-online"]]} />
        <FooterCol title="Legal" links={[...LEGAL_LINKS] as [string, string][]} />
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-[13px] text-mint-200 sm:text-sm md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY}{CIN ? ` · CIN ${CIN}` : ""} · {REGISTERED_OFFICE}{SUPPORT.email ? ` · ${SUPPORT.email}` : ""}{SUPPORT.phone ? ` · ${SUPPORT.phone}` : ""} · <Link href="/contact" className="underline underline-offset-2 hover:text-white">Contact and grievances</Link></p>
          <p className="max-w-[640px] md:text-right">Medicine information on this site is for reference only and is not a substitute for advice from your doctor or pharmacist.</p>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, external }: { title: string; links: [string, string][]; external?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="d-eyebrow text-gold">{title}</p>
      <ul className="flex flex-col gap-2 max-sm:gap-0">
        {links.map(([label, href]) => (
          <li key={label}>
            {external ? (
              <a href={href} target="_blank" rel="noopener" className="text-mint-200 hover:text-white">{label}</a>
            ) : (
              <Link href={href} className="text-mint-200 hover:text-white max-sm:inline-block max-sm:py-2.5">{label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Every Bengaluru area with its pincodes, linking to the area pages (local search reach). */
function Areas() {
  const total = ZONES.reduce((n, z) => n + z.areas.length, 0);
  const finder = Object.fromEntries(Object.keys(PINCODES).map((p) => [p, { places: PINCODES[p], areas: areasForPin(p).map((a) => [a.name, a.slug] as [string, string]) }]));
  return (
    <section aria-labelledby="areas-footer-h" className="border-b border-white/10">
      <Container className="flex flex-col gap-6 py-10 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="areas-footer-h" className="text-[20px] font-bold">Coming soon across <span className="text-gold">Bengaluru</span></h2>
          <Link href="/bengaluru" className="d-caption inline-flex min-h-11 items-center font-semibold text-mint-200 underline underline-offset-4 hover:text-white sm:min-h-0">All {total} areas and pincodes</Link>
        </div>
        <div className="flex flex-col gap-4 sm:hidden">
          <PincodeFinder data={finder} />
          <ul className="pill-list flex flex-wrap gap-2">
            {POPULAR_AREAS.slice(0, 8).map((a) => <li key={a.slug}><Link href={`/bengaluru/${a.slug}`} className="rounded-full bg-white/10 px-3.5 text-[14px] font-semibold text-white ring-1 ring-white/15">{a.name}</Link></li>)}
            <li><Link href="/bengaluru" className="rounded-full bg-gold px-3.5 text-[14px] font-bold text-forest">All {total} areas</Link></li>
          </ul>
        </div>
        <div className="hidden grid-cols-2 gap-x-6 gap-y-8 sm:grid md:grid-cols-3 lg:grid-cols-6">
          {ZONES.map((z) => {
            const [first, rest] = [z.areas.slice(0, 2), z.areas.slice(2)];
            return (
              <div key={z.slug} className="flex min-w-0 flex-col gap-2">
                <Link href={`/bengaluru#${z.slug}`} className="d-eyebrow text-gold hover:underline">{z.zone}</Link>
                <ul className="flex flex-col gap-1.5">{first.map((a) => <AreaLine key={a.slug} name={a.name} slug={a.slug} pins={a.pins} />)}</ul>
                {rest.length > 0 && (
                  <details className="group">
                    <summary className="d-caption inline-flex cursor-pointer items-center gap-1 font-semibold text-gold hover:text-gold-200">
                      <span className="group-open:hidden">See {rest.length} more</span>
                      <span className="hidden group-open:inline">See less</span>
                      <Icon name="chev-d" size={14} className="chev transition-transform" />
                    </summary>
                    <ul className="mt-1.5 flex flex-col gap-1.5">{rest.map((a) => <AreaLine key={a.slug} name={a.name} slug={a.slug} pins={a.pins} />)}</ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

function AreaLine({ name, slug, pins }: { name: string; slug: string; pins: string[] }) {
  return (
    <li className="text-[13px] leading-5 [overflow-wrap:anywhere]">
      <Link href={`/bengaluru/${slug}`} className="text-mint-200 hover:text-white">{name}</Link>
      {pins.length > 0 && <span className="text-mint-300/70"> · {pins.join(", ")}</span>}
    </li>
  );
}
