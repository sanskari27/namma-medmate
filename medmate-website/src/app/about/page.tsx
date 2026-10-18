import Link from "next/link";
import { Breadcrumbs, Container, GetAppLink, Heading, Icon, JsonLd } from "@/components/ui";
import { BELIEFS, FACTS, FOUNDER, JOURNEY, REGISTERED_OFFICE, STORY, STORY_QUOTE, TEAM, VALUES } from "@/lib/about";
import { COMPANY, SITE_URL, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "About MedMate: our story, founder and team",
  description: "MedMate is a Bengaluru health-tech company building software, delivery and e-prescriptions for India’s neighbourhood pharmacies. Read founder Roni Paul’s story and meet the team.",
  path: "/about",
});

const initials = (name: string) => name.replace(/^Dr\s+/, "").split(" ").map((w) => w[0]).slice(0, 2).join("");

export default function About() {
  return (
    <main>
      {/* Hero */}
      <section className="brand-zone relative overflow-hidden text-white">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative flex flex-col gap-6 pt-8">
          <div className="[&_a]:text-mint-200 [&_a:hover]:text-white [&_span[aria-current]]:text-white"><Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["About us", "/about"]]} /></div>
          <div className="grid items-center gap-10 pb-12 sm:gap-12 sm:pb-16 lg:grid-cols-[1.25fr_1fr] lg:pb-20">
            <div className="flex flex-col gap-5 sm:gap-6">
              <p className="d-eyebrow flex items-center gap-2 text-gold"><span className="h-px w-6 bg-gold" />MedMate, Bengaluru · Est. 2026</p>
              <h1 className="d-h1 !text-[clamp(32px,4vw,52px)]">Keeping India’s neighbourhood chemists in business, and bringing their medicines to <span className="text-gold">every doorstep.</span></h1>
              <p className="d-lead max-w-[620px] text-mint-200">MedMate is a Bengaluru health-tech company building the operating system for India’s neighbourhood pharmacies. GST billing, live inventory, customer CRM and credit are ready today, with an online store and fast delivery launching soon across Bengaluru.</p>
              <dl className="grid max-w-[620px] grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/5 py-4 text-center ring-1 ring-white/15">
                {FACTS.map(([a, b]) => <div key={b} className="px-3"><dt className="sr-only">{b}</dt><dd className="text-[clamp(18px,2.2vw,26px)] font-bold leading-8 text-gold">{a}</dd><dd className="d-caption text-mint-200">{b}</dd></div>)}
              </dl>
            </div>
            <figure className="relative mx-auto w-full max-w-[380px] max-sm:mb-4">
              <img src={FOUNDER.photo} alt="Roni Paul, Founder and CEO of MedMate, photographed in Bengaluru" width={820} height={880} fetchPriority="high" className="w-full rounded-[32px] object-cover shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] ring-1 ring-white/20" />
              <figcaption className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-2xl bg-surface p-4 text-ink shadow-sh3">
                <span className="flex-1">
                  <span className="block text-[17px] font-bold leading-6">{FOUNDER.name}</span>
                  <span className="d-caption block text-muted">{FOUNDER.role}, MedMate</span>
                </span>
                <a href={FOUNDER.site} target="_blank" rel="noopener" className="press d-caption inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-mint-100 px-3 font-bold text-green-700 hover:bg-mint-200">Full story<Icon name="chev-r" size={14} /></a>
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-16 py-14 lg:gap-28 lg:py-24">
        {/* Founder story */}
        <section aria-labelledby="story-h" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <article className="flex max-w-[720px] flex-col gap-6">
            <p className="d-eyebrow text-green-700">Our story</p>
            <h2 id="story-h" className="d-h2">Why we <span className="text-green">started</span></h2>
            <div className="prose-mm">
              {STORY.map((p, i) => (
                <div key={i}>
                  <p>{p}</p>
                  {i === STORY_QUOTE.after && (
                    <blockquote className="my-8 border-l-4 border-gold pl-5 text-[clamp(22px,2.4vw,30px)] font-bold leading-tight tracking-[-0.02em] text-forest">{STORY_QUOTE.text}</blockquote>
                  )}
                </div>
              ))}
            </div>
            <a href={FOUNDER.site} target="_blank" rel="noopener" className="inline-flex w-fit items-center gap-1.5 font-semibold text-green-700 hover:underline">Read Roni Paul’s full story, press kit and speaking topics<Icon name="chev-r" size={16} /></a>
          </article>
          <aside className="flex flex-col gap-6">
            <div className="sticky top-24 flex flex-col gap-4 rounded-3xl bg-forest p-5 text-white sm:gap-5 sm:p-7">
              <Icon name="chat" size={28} className="text-gold" />
              <p className="text-[21px] font-bold leading-8">“{FOUNDER.quote}”</p>
              <p className="d-caption text-mint-200">{FOUNDER.name}, to Bengaluru’s chemists</p>
              <a href={FOUNDER.site} target="_blank" rel="noopener" className="press d-btn inline-flex h-11 w-fit items-center gap-2 rounded-xl bg-gold px-4 text-forest hover:bg-gold-200">Read Roni Paul’s full story<Icon name="chev-r" size={16} /></a>
              <a href={FOUNDER.instagram} target="_blank" rel="noopener" className="d-caption w-fit font-semibold text-mint-200 underline underline-offset-4 hover:text-white">Follow the build on Instagram</a>
            </div>
          </aside>
        </section>

        {/* Journey */}
        <section aria-labelledby="journey-h" className="flex flex-col gap-8 lg:gap-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading eyebrow="The founder’s journey" title="Seven years, three companies, one lifelong" accent="business" lead="Every company taught something the next one needed." />
            <a href={FOUNDER.site} target="_blank" rel="noopener" className="press d-btn inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line-2 px-5 text-ink-2 hover:border-green hover:text-green">Visit Roni Paul’s website<Icon name="chev-r" size={16} /></a>
          </div>
          <ol className="relative grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {JOURNEY.map(([when, t, s], i) => (
              <li key={t} className={`flex flex-col gap-2 rounded-2xl p-5 ${i === JOURNEY.length - 1 ? "bg-forest text-white lg:col-span-1" : "border border-line"}`}>
                <span className={`d-eyebrow ${i === JOURNEY.length - 1 ? "text-gold" : "text-green-700"}`}>{when}</span>
                <h3 className="text-[17px] font-bold leading-6">{t}</h3>
                <p className={`text-[15px] leading-6 ${i === JOURNEY.length - 1 ? "text-mint-200" : "text-ink-2"}`}>{s}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Beliefs */}
        <section aria-labelledby="beliefs-h" className="flex flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="Point of view" title="What we" accent="believe" />
          <div className="grid gap-4 md:grid-cols-2">
            {BELIEFS.map(([t, s], i) => (
              <div key={t} className="flex gap-4 rounded-2xl bg-mint-50 p-5 ring-1 ring-mint-200 sm:gap-5 sm:p-6">
                <span className="text-[28px] font-extrabold leading-none text-gold sm:text-[32px]">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-2"><h3 className="d-h3">{t}</h3><p className="text-ink-2">{s}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section aria-labelledby="values-h" className="flex flex-col gap-8 lg:gap-10">
          <Heading eyebrow="What we stand for" title="Our" accent="values" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(([ic, t, s], i) => (
              <div key={t} className={`flex flex-col gap-3 rounded-2xl p-5 sm:p-6 ${i === 0 ? "bg-forest text-white" : "border border-line"}`}>
                <span className={`flex size-12 items-center justify-center rounded-xl ${i === 0 ? "bg-white/10 text-gold" : "bg-mint-100 text-green-700"}`}><Icon name={ic} size={22} /></span>
                <h3 className="d-h3">{t}</h3>
                <p className={i === 0 ? "text-mint-200" : "text-ink-2"}>{s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section id="team" aria-labelledby="team-h" className="flex scroll-mt-20 flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="The team" title="Meet the" accent="team" lead="Founders, doctors, engineers and pharmacists building for the corner chemist." />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {TEAM.map((m) => (
              <li key={m.name} className="flex flex-col items-center gap-3 rounded-3xl border border-line p-4 text-center sm:p-6">
                {m.photo ? (
                  <img src={m.photo} alt={m.name} width={112} height={112} loading="lazy" className="size-20 rounded-full object-cover object-top ring-4 ring-mint-100 sm:size-28" />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-full bg-forest text-[26px] font-bold text-gold ring-4 ring-mint-100 sm:size-28 sm:text-[32px]" aria-hidden>{initials(m.name)}</span>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="text-[15px] font-bold leading-5 sm:text-[17px] sm:leading-6">{m.name}</h3>
                  <p className="text-[14px] font-semibold text-green-700 sm:text-[16px]">{m.role}</p>
                  {m.note && <p className="d-caption text-muted">{m.note}</p>}
                  {m.site && <a href={m.site} target="_blank" rel="noopener" className="d-caption mt-1 font-semibold text-green-700 underline underline-offset-2">Visit website</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Company information */}
        <section aria-labelledby="company-h" className="grid gap-6 rounded-3xl bg-surface-2 p-5 sm:rounded-[32px] sm:p-8 md:p-12 lg:grid-cols-[1fr_1.4fr] lg:gap-10">
          <div className="flex flex-col gap-3">
            <p className="d-eyebrow text-green-700">The fine print</p>
            <h2 id="company-h" className="d-h2">Company <span className="text-green">information</span></h2>
          </div>
          <dl className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {[["Entity", COMPANY], ["Founded", "2026, Bengaluru"], ["Registered office", REGISTERED_OFFICE]].map(([k, v]) => (
              <div key={k} className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] sm:gap-4"><dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
            ))}
          </dl>
        </section>

        {/* Closing */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="brand-zone flex flex-col items-start gap-4 rounded-3xl p-5 text-white sm:rounded-[28px] sm:p-8">
            <p className="d-eyebrow text-gold">Run a pharmacy?</p>
            <h2 className="d-h3">Get your whole shop on one console in about a week.</h2>
            <p className="text-mint-200">Billing, inventory, CRM and credit today, with an online store and delivery launching soon. Free for the first 3 months.</p>
            <Link href="/pharmacy-partner#register" className="press d-btn mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-forest hover:bg-gold-200 max-sm:w-full">Book a free demo<Icon name="chev-r" size={18} /></Link>
          </div>
          <div className="tint-zone flex flex-col items-start gap-4 rounded-3xl p-5 ring-1 ring-mint-200 sm:rounded-[28px] sm:p-8">
            <p className="d-eyebrow text-green-700">Launching soon in Bengaluru</p>
            <h2 className="d-h3">Medicines from licensed pharmacies near you.</h2>
            <p className="text-ink-2">Compare prices, upload a prescription or talk to a doctor, and track your rider. Join the waitlist to be first.</p>
            <GetAppLink from="about-end" className="mt-auto">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
          </div>
        </section>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About MedMate",
        url: `${SITE_URL}/about`,
        mainEntity: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#org`,
          name: "MedMate",
          legalName: COMPANY,
          foundingDate: "2026",
          foundingLocation: { "@type": "Place", name: "Bengaluru, Karnataka, India" },
          address: { "@type": "PostalAddress", streetAddress: "2nd Floor, Plot No 190/108/2, Haralur Main Road, HSR Extension", addressLocality: "Bengaluru", addressRegion: "Karnataka", postalCode: "560102", addressCountry: "IN" },
          founder: { "@type": "Person", name: FOUNDER.name, jobTitle: FOUNDER.role, image: SITE_URL + FOUNDER.photo, description: FOUNDER.oneLine, url: FOUNDER.site, sameAs: [FOUNDER.site, FOUNDER.instagram] },
          employee: TEAM.map((m) => ({ "@type": "Person", name: m.name, jobTitle: m.role })),
        },
      }} />
    </main>
  );
}
