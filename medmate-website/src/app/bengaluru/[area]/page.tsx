import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product";
import { Breadcrumbs, Container, Faq, GetAppLink, Heading, Icon, JsonLd, Qr } from "@/components/ui";
import { AREAS, areaBySlug, localities, nearby } from "@/lib/areas";
import { CATEGORIES, POPULAR } from "@/lib/catalogue";
import { STEPS } from "@/lib/content";
import { qrSvg } from "@/lib/qr";
import { SITE_URL, downloadUrl, pageMeta } from "@/lib/site";

type Props = { params: Promise<{ area: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return AREAS.map((a) => ({ area: a.slug }));
}

export async function generateMetadata({ params }: Props) {
  const a = areaBySlug((await params).area);
  if (!a) return {};
  return {
    ...pageMeta({
      title: `Medicine delivery in ${a.name}, Bengaluru ${a.pins[0] ?? ""}: coming soon`.replace("  ", " "),
      description: `MedMate is launching soon in ${a.name}${a.pins.length ? ` (${a.pins.join(", ")})` : ""}, ${a.zone}: medicines from licensed pharmacies near you, with prices compared and delivery tracked. Join the waitlist.`,
      path: `/bengaluru/${a.slug}`,
    }),
    keywords: [`medicine delivery ${a.name}`, `pharmacy near me ${a.name}`, `chemist in ${a.name}`, `medical shop ${a.name} Bangalore`, ...a.pins.map((p) => `pharmacy ${p}`)],
  };
}

export default async function AreaPage({ params }: Props) {
  const a = areaBySlug((await params).area);
  if (!a) notFound();
  const qr = await qrSvg(downloadUrl(`area-${a.slug}`.slice(0, 40)));
  const places = localities(a);
  const near = nearby(a);
  const pinText = a.pins.join(", ");
  const faqs: [string, string][] = [
    [`Does MedMate deliver medicines in ${a.name} yet?`, `Not yet. MedMate is launching soon in Bengaluru. Join the waitlist with your ${a.name} pincode${a.pins.length ? ` (${pinText})` : ""} and we will message you when pharmacies near you go live.`],
    [`How fast will medicine delivery be in ${a.name}?`, "MedMate is designed to deliver from pharmacies a short distance from you. When it launches, the app will show each pharmacy’s delivery time and charge before you pay."],
    [`Will I be able to order prescription medicines in ${a.name}?`, "Yes. Prescription medicines will be dispensed only by a licensed pharmacy against a valid prescription, checked by a pharmacist. You can upload yours, or book a consultation with a registered doctor who decides independently."],
    ...(a.pins.length ? [[`Which pincodes does ${a.name} cover?`, `${a.name} falls under pincode${a.pins.length > 1 ? "s" : ""} ${pinText}. India Post localities here include ${places.slice(0, 8).join(", ")}.`] as [string, string]] : []),
  ];

  return (
    <main>
      <section className="border-b border-line bg-mint-50">
        <Container className="flex flex-col gap-5 py-8 sm:gap-6 sm:py-10">
          <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Bengaluru", "/bengaluru"], [a.name, `/bengaluru/${a.slug}`]]} />
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-4">
              <p className="d-eyebrow text-green-700">Coming soon · {a.zone}</p>
              <h1 className="d-h1">Medicine delivery in <span className="text-green">{a.name}</span></h1>
              <p className="d-lead max-w-[680px] text-ink-2">MedMate is launching soon in {a.name}: medicines from licensed pharmacies near you, with prices compared across nearby chemists, prescription upload, doctor consultations and live rider tracking. Join the waitlist to be first.</p>
              {a.pins.length > 0 && (
                <ul className="flex flex-wrap items-center gap-2" aria-label="Pincodes">
                  {a.pins.map((p) => <li key={p}><Link href={`/bengaluru#p${p}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[14px] font-bold text-forest ring-1 ring-mint-300 hover:ring-green sm:min-h-0"><Icon name="pin" size={14} className="text-green-700" />{p}</Link></li>)}
                </ul>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <GetAppLink from={`area-${a.slug}`.slice(0, 40)}>Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
                <Link href="/bengaluru" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl border-[1.5px] border-green px-5 text-green hover:bg-mint-50 max-sm:w-full">All Bengaluru areas</Link>
              </div>
            </div>
            <div className="hidden items-center gap-4 rounded-2xl bg-surface p-3 pr-5 ring-1 ring-line lg:flex">
              <Qr svg={qr} size={96} className="!p-1.5 !shadow-none !ring-0" />
              <div className="flex max-w-[170px] flex-col gap-1"><p className="font-bold leading-5">Coming soon to {a.name}</p><p className="d-caption text-muted">Scan to join the waitlist on your phone</p></div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-12 py-10 sm:py-14 lg:gap-20">
        <section className="flex flex-col gap-6 sm:gap-8">
          <Heading title={`How it will work in`} accent={a.name} />
          <ol className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {STEPS.map(([ic, t, s], i) => (
              <li key={t} className="flex gap-4 rounded-2xl border border-line p-4 sm:flex-col sm:gap-3 sm:p-5">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${i === 2 ? "bg-gold text-forest" : "bg-forest text-gold"}`}><Icon name={ic} /></span>
                <div className="flex min-w-0 flex-col gap-1 sm:contents">
                  <h3 className="text-[17px] font-bold leading-6">{t}</h3>
                  <p className="text-[15px] leading-6 text-ink-2">{s}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {places.length > 0 && (
          <section aria-labelledby="localities-h" className="flex flex-col gap-4">
            <h2 id="localities-h" className="d-h3">Localities around {a.name}</h2>
            <p className="max-w-[760px] text-ink-2">India Post localities in {pinText}: {places.join(", ")}.</p>
          </section>
        )}

        <section aria-labelledby="popular-h" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="popular-h" className="d-h2">Everyday <span className="text-green">essentials</span></h2>
            <Link href="/medicines" className="inline-flex min-h-11 items-center font-semibold text-green-700 hover:underline sm:min-h-0">All medicines</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">{POPULAR.slice(0, 6).map((p) => <ProductCard key={p.id} p={p} />)}</div>
          <div className="pill-list flex flex-wrap gap-2">
            {CATEGORIES.slice(0, 10).map((c) => <Link key={c.id} href={`/medicines/${c.slug}`} className="rounded-full border border-line px-4 py-2 font-medium text-ink-2 hover:border-green hover:text-green">{c.name}</Link>)}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <Heading title={`${a.name}:`} accent="questions" />
          <Faq items={faqs} />
        </section>

        <section className="brand-zone flex flex-col items-start justify-between gap-5 rounded-3xl p-5 text-white sm:gap-6 sm:rounded-[28px] sm:p-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <p className="d-eyebrow text-gold">For pharmacies in {a.name}</p>
            <h2 className="d-h3">Own a pharmacy in {a.name}? Bring it online.</h2>
            <p className="text-mint-200">One console for billing, inventory and credit today, with your online store and delivery launching soon. First 3 months free.</p>
          </div>
          <Link href="/pharmacy-partner#register" className="press d-btn inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-forest hover:bg-gold-200 max-sm:w-full">Book a free demo<Icon name="chev-r" size={18} /></Link>
        </section>

        <section aria-labelledby="nearby-h" className="flex flex-col gap-4">
          <h2 id="nearby-h" className="d-h3">Nearby areas in {a.zone}</h2>
          <div className="pill-list flex flex-wrap gap-2">
            {near.map((n) => <Link key={n.slug} href={`/bengaluru/${n.slug}`} className="rounded-full border border-line px-4 py-2 font-medium text-ink-2 hover:border-green hover:text-green">{n.name}{n.pins[0] ? ` · ${n.pins[0]}` : ""}</Link>)}
            <Link href="/bengaluru" className="rounded-full bg-mint-100 px-4 py-2 font-semibold text-green-700">All Bengaluru areas</Link>
          </div>
        </section>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: `Medicine delivery in ${a.name}, Bengaluru (launching soon)`,
        serviceType: "Medicine delivery from neighbourhood pharmacies",
        provider: { "@id": `${SITE_URL}/#org` },
        url: `${SITE_URL}/bengaluru/${a.slug}`,
        areaServed: {
          "@type": "Place",
          name: `${a.name}, Bengaluru`,
          address: { "@type": "PostalAddress", addressLocality: a.name, addressRegion: "Karnataka", addressCountry: "IN", ...(a.pins[0] ? { postalCode: a.pins[0] } : {}) },
          containedInPlace: { "@type": "City", name: "Bengaluru" },
        },
      }} />
    </main>
  );
}
