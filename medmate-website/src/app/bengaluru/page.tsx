import Link from "next/link";
import { PincodeFinder } from "@/components/pincode-finder";
import { Breadcrumbs, Container, Faq, GetAppLink, Heading, Icon, JsonLd } from "@/components/ui";
import { AREAS, PINCODES, ZONES, areasForPin } from "@/lib/areas";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = {
  ...pageMeta({
    title: "Medicine delivery in Bengaluru (Bangalore): areas, pincodes, launching soon",
    description: `MedMate is launching soon across Bengaluru, from Koramangala and HSR Layout to Whitefield, Hebbal and Electronic City. Find your area among ${AREAS.length}, check your pincode and join the waitlist.`,
    path: "/bengaluru",
  }),
  keywords: ["medicine delivery Bengaluru", "medicine delivery Bangalore", "pharmacy near me Bangalore", "online pharmacy Bengaluru", "Bengaluru pincodes", "Bangalore pincode list"],
};

const FAQS: [string, string][] = [
  ["Does MedMate deliver medicines in Bengaluru yet?", "Not yet. MedMate is launching soon, starting with neighbourhoods across Bengaluru. Join the waitlist with your pincode and we will message you when pharmacies near you go live."],
  ["How do I check my pincode?", "Type your pincode in the box at the top of this page to see its India Post localities and your MedMate area page."],
  ["How fast will medicine delivery be?", "MedMate is designed to deliver from pharmacies a short distance from you. The app will show each pharmacy’s delivery time and charge before you pay."],
  ["Will I be able to order prescription medicines?", "Yes. Prescription medicines will be dispensed only by a licensed pharmacy against a valid prescription, checked by a pharmacist. You can upload yours, or book a consultation with a registered doctor who decides independently."],
];

export default function Bengaluru() {
  const pins = Object.keys(PINCODES).sort();
  const finder = Object.fromEntries(pins.map((p) => [p, { places: PINCODES[p], areas: areasForPin(p).map((a) => [a.name, a.slug] as [string, string]) }]));
  return (
    <main>
      <section className="brand-zone relative overflow-hidden text-white">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative flex flex-col gap-5 py-8 sm:gap-6 sm:py-10 lg:py-14">
          <div className="[&_a]:text-mint-200 [&_a:hover]:text-white [&_span[aria-current]]:text-white"><Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Bengaluru", "/bengaluru"]]} /></div>
          <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
            <div className="flex flex-col gap-5">
              <p className="d-eyebrow text-gold">Launching soon · {AREAS.length} areas · {pins.length} pincodes</p>
              <h1 className="d-hero">Medicine delivery in <span className="text-gold">Bengaluru</span></h1>
              <p className="d-lead max-w-[620px] text-mint-200">MedMate is launching soon across Bengaluru (Bangalore): medicines from licensed neighbourhood pharmacies, with prices compared and delivery tracked. Find your area below and join the waitlist.</p>
              <div className="flex flex-wrap gap-3">
                <GetAppLink from="bengaluru-hub" variant="gold">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
                <a href="#pincodes" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl px-5 text-white ring-[1.5px] ring-white/40 hover:bg-white/10 max-sm:w-full">All pincodes</a>
              </div>
            </div>
            <PincodeFinder data={finder} />
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-12 py-10 sm:py-16 lg:gap-20">
        {ZONES.map((z) => (
          <section key={z.slug} id={z.slug} aria-labelledby={`${z.slug}-h`} className="flex scroll-mt-24 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id={`${z.slug}-h`} className="d-h2">{z.zone.replace(" Bengaluru", "")} <span className="text-green">Bengaluru</span></h2>
              <p className="text-muted">{z.areas.length} areas</p>
            </div>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
              {z.areas.map((a) => (
                <li key={a.slug} className="min-w-0">
                  <Link href={`/bengaluru/${a.slug}`} className="lift group flex h-full flex-col gap-1 rounded-2xl border border-line p-3 sm:p-4">
                    <span className="flex items-start gap-1.5 font-semibold [overflow-wrap:anywhere] group-hover:text-green-700"><Icon name="pin" size={14} className="mt-1 text-green-700" />{a.name}</span>
                    <span className="d-caption text-muted">{a.pins.join(", ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section id="pincodes" aria-labelledby="pincodes-h" className="flex scroll-mt-20 flex-col gap-6">
          <Heading eyebrow="Pincode list" title="All Bengaluru" accent="pincodes" lead="Every Bengaluru pincode with its India Post localities, and the MedMate area page for it." />
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-[14px] sm:text-[15px]">
              <caption className="sr-only">Bengaluru pincodes, localities and MedMate areas</caption>
              <thead className="bg-surface-2 text-[14px] text-muted">
                <tr><th scope="col" className="p-3 pl-4 font-semibold">Pincode</th><th scope="col" className="p-3 font-semibold">Localities</th><th scope="col" className="hidden p-3 font-semibold md:table-cell">MedMate area</th></tr>
              </thead>
              <tbody>
                {pins.map((p) => {
                  const areas = areasForPin(p);
                  return (
                    <tr key={p} id={`p${p}`} className="border-t border-line align-top">
                      <th scope="row" className="whitespace-nowrap p-3 pl-3 font-bold text-forest sm:pl-4">{p}</th>
                      <td className="p-3 pr-3 text-ink-2 sm:pr-4">
                        {PINCODES[p].join(", ")}
                        {areas.length > 0 && <span className="mt-1 flex flex-wrap gap-x-3 md:hidden">{areas.map((a) => <Link key={a.slug} href={`/bengaluru/${a.slug}`} className="font-semibold text-green-700">{a.name}</Link>)}</span>}
                      </td>
                      <td className="hidden p-3 md:table-cell">{areas.map((a, i) => <span key={a.slug}>{i > 0 && ", "}<Link href={`/bengaluru/${a.slug}`} className="font-semibold text-green-700 hover:underline">{a.name}</Link></span>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="d-caption text-muted">Localities are India Post post-office names. Pharmacies and delivery times depend on your exact address; the app shows them before you pay.</p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <Heading title="Bengaluru delivery" accent="questions" />
          <Faq items={FAQS} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="tint-zone flex flex-col items-start gap-3 rounded-3xl p-5 ring-1 ring-mint-200 sm:rounded-[28px] sm:p-8">
            <h2 className="d-h3">Be first when MedMate launches</h2>
            <p className="text-ink-2">Leave your number and pincode on the waitlist and we will message you the day pharmacies near you go live.</p>
            <GetAppLink from="bengaluru-hub-end" className="mt-2">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
          </div>
          <div className="brand-zone flex flex-col items-start gap-3 rounded-3xl p-5 text-white sm:rounded-[28px] sm:p-8">
            <h2 className="d-h3">Own a pharmacy in Bengaluru?</h2>
            <p className="text-mint-200">Billing, inventory and credit on one console today, with your online store and delivery launching soon.</p>
            <Link href="/pharmacy-partner" className="press d-btn mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-forest hover:bg-gold-200 max-sm:w-full">MedMate for pharmacies<Icon name="chev-r" size={18} /></Link>
          </div>
        </section>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Medicine delivery in Bengaluru (launching soon)",
        serviceType: "Medicine delivery from neighbourhood pharmacies",
        provider: { "@id": `${SITE_URL}/#org` },
        url: `${SITE_URL}/bengaluru`,
        areaServed: [{ "@type": "City", name: "Bengaluru" }, ...AREAS.map((a) => ({ "@type": "Place", name: `${a.name}, Bengaluru`, url: `${SITE_URL}/bengaluru/${a.slug}` }))],
      }} />
    </main>
  );
}
