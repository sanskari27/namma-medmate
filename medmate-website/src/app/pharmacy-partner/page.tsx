import Link from "next/link";
import { PlanSelect } from "@/components/plan-select";
import { Breadcrumbs, Container, Faq, Heading, Icon, JsonLd } from "@/components/ui";
import { POSTS } from "@/lib/blog";
import { ZONES } from "@/lib/areas";
import { COMPARE, COMPARE_COLS, DEVICES, ECOSYSTEM, FAQS, HERO_CHECKS, PILLARS, PLANS, STEPS, TOOLKIT, type Cell } from "@/lib/partner";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = {
  ...pageMeta({
    title: "Pharmacy billing software & online store for chemists in Bengaluru",
    description: "MedMate Partner console for pharmacies: GST billing and POS, batch-wise inventory with expiry alerts, prescriptions, CRM and credit khata in one console, plus your own online store and 10-minute delivery (launching soon). From ₹299 a month, first 3 months free.",
    path: "/pharmacy-partner",
  }),
  keywords: ["pharmacy billing software", "pharmacy ERP", "GST billing software for pharmacy", "medical store software Bengaluru", "sell medicines online", "online store for pharmacy", "pharmacy POS", "credit khata app", "MedMate Partner console", "Namma MedMate"],
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const field = "h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-surface px-3.5 text-[16px] outline-none placeholder:text-faint focus:border-green focus:ring-[3px] focus:ring-mint-200";

function Soon({ dark }: { dark?: boolean }) {
  return <span className={`d-tag rounded-md px-2 py-0.5 ${dark ? "bg-gold text-forest" : "bg-gold-50 text-gold-ink ring-1 ring-gold-100"}`}>Coming soon</span>;
}

function Mark({ v }: { v: Cell }) {
  if (v === "soon") return <Soon />;
  if (v === 1) return <span className="inline-flex size-7 items-center justify-center rounded-full bg-mint-100 text-green-700"><Icon name="check" size={16} /><span className="sr-only">Yes</span></span>;
  if (v === 0.5) return <span className="font-bold text-faint" aria-label="Partly">—</span>;
  return <span className="inline-flex size-7 items-center justify-center rounded-full bg-red-bg text-red"><Icon name="x" size={14} /><span className="sr-only">No</span></span>;
}

export default function PharmacyPartner() {
  const posts = POSTS.filter((p) => p.topic === "pharmacies");
  return (
    <main>
      {/* Hero */}
      <section className="brand-zone relative overflow-hidden text-white">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative flex flex-col gap-6 pt-8">
          <div className="[&_a]:text-mint-200 [&_a:hover]:text-white [&_span[aria-current]]:text-white"><Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["For pharmacies", "/pharmacy-partner"]]} /></div>
          <div className="grid items-center gap-10 pb-10 sm:gap-12 sm:pb-16 lg:grid-cols-[1fr_1.05fr] lg:pb-24">
            <div className="flex flex-col gap-5 sm:gap-6">
              <p className="d-eyebrow flex items-center gap-2 text-gold"><span className="h-px w-6 bg-gold" />Every sale becomes a relationship</p>
              <h1 className="d-hero">Turn your counter into a <span className="text-gold">10-minute pharmacy.</span></h1>
              <p className="d-lead max-w-[580px] text-mint-200">The MedMate Partner console is Bengaluru’s quick-commerce network for medicines, built only for local chemists. Your shop on the MedMate app, delivery in minutes through our rider network, and doctor consultations with “Our Doctor, Your Medicine”, all run from one ERP and POS. <strong className="font-semibold text-white">Launching soon: join now as a premier partner.</strong></p>
              <div className="flex flex-wrap gap-3">
                <a href="#register" className="press d-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-forest hover:bg-gold-200 max-sm:w-full">Book a free demo<Icon name="chev-r" size={18} /></a>
                <a href="#console" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl px-5 text-white ring-[1.5px] ring-white/40 hover:bg-white/10 max-sm:w-full">See the console</a>
              </div>
              <ul className="grid max-w-[520px] grid-cols-2 gap-2">
                {HERO_CHECKS.map((t) => <li key={t} className="d-caption flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 font-semibold text-mint-200 ring-1 ring-white/15"><Icon name="check" size={14} className="text-gold" />{t}</li>)}
              </ul>
            </div>
            {/* Pharmacy photo with the console on top: the shop and the software together */}
            <div className="relative mx-auto w-full max-w-[640px] pb-[22%]">
              <div className="relative w-[86%] overflow-hidden rounded-[32px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] ring-1 ring-white/20">
                <img src="/partner/pharmacist-800.webp" srcSet="/partner/pharmacist-800.webp 800w, /partner/pharmacist-1600.webp 1600w" sizes="(min-width: 1024px) 560px, 90vw" alt="A pharmacist arranging medicines on the shelves of a neighbourhood chemist shop" width={1600} height={1067} fetchPriority="high" className="aspect-[5/4] w-full object-cover object-[22%_center]" />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/60 via-forest/0 to-forest/0" aria-hidden />
              </div>
              <img src="/partner/console-desktop.webp" alt="MedMate Partner console dashboard: today’s sales, orders, prescriptions and stock alerts" width={1400} height={1001} className="absolute bottom-[3%] right-[5%] w-[64%] drop-shadow-[0_24px_32px_rgb(0_0_0/0.45)]" />
              <img src="/partner/console-phone.webp" alt="MedMate Partner app on a phone: today’s sales, online store switch and quick actions" width={420} height={868} className="absolute bottom-0 right-0 w-[18%] drop-shadow-[0_20px_30px_rgb(0_0_0/0.45)]" />
              <div className="anim-float absolute left-4 top-4 flex items-center gap-3 rounded-2xl bg-surface p-3 pr-4 text-ink shadow-sh3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-forest text-gold"><Icon name="store" /></span>
                <span className="flex flex-col leading-tight"><span className="text-[15px] font-bold">Your counter, online</span><span className="d-caption text-muted">Walk-in and online sales in one view</span></span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Devices */}
      <section id="console" className="scroll-mt-20 bg-forest py-14 text-white lg:py-24">
        <Container className="flex flex-col gap-8 sm:items-center sm:text-center lg:gap-10">
          <div className="flex flex-col gap-3 sm:items-center">
            <p className="d-eyebrow text-gold">One console. Every screen.</p>
            <h2 className="d-h2">Runs on the devices you already have</h2>
            <p className="d-lead max-w-[640px] text-mint-200">The full ERP on your desktop, a fast counter on the tablet, and the whole shop in your pocket. Same data, everywhere, live.</p>
          </div>
          <div className="relative w-full max-w-[960px]">
            <img src="/partner/console-tablet.webp" alt="MedMate Partner console on a tablet at the pharmacy counter" width={1100} height={723} loading="lazy" className="mx-auto w-[86%] drop-shadow-[0_30px_40px_rgb(0_0_0/0.45)]" />
            <img src="/partner/console-phone.webp" alt="" width={420} height={868} loading="lazy" className="absolute -bottom-4 right-0 w-[22%] drop-shadow-[0_20px_30px_rgb(0_0_0/0.45)]" />
          </div>
          <ul className="pill-list flex flex-wrap gap-2 sm:justify-center">
            {DEVICES.map(([ic, t]) => <li key={t} className="d-caption flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 font-semibold text-mint-200 ring-1 ring-white/15"><Icon name={ic} size={16} className="text-gold" />{t}</li>)}
          </ul>
        </Container>
      </section>

      <Container className="flex flex-col gap-16 py-14 lg:gap-28 lg:py-24">
        {/* The chemist behind the counter */}
        <section className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div className="flex flex-col gap-6">
            <Heading eyebrow="Made for the chemist behind the counter" title="Your counter, your customers, your" accent="neighbourhood" lead="You know your regulars by name and their medicines by heart. MedMate keeps that relationship yours, and gives your shop the speed and reach of the big e-pharmacies." />
            <a href="#register" className="press d-btn inline-flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-green px-5 text-white hover:bg-green-700 max-sm:w-full">Book a free demo<Icon name="chev-r" size={18} /></a>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {([
              ["tag", "You set your prices", "Your shop decides its prices, always within MRP, online and at the counter."],
              ["user", "Your brand, your customers", "Your shop name on the app; every customer stays yours."],
              ["phone", "No new hardware", "Runs on the laptop, tablet or phone you already have."],
              ["check", "Staff learn it in a day", "We migrate your data and train your team on WhatsApp or on-site."],
            ] as const).map(([ic, t, s]) => (
              <li key={t} className="flex flex-col gap-2 rounded-2xl border border-line p-4 sm:gap-3 sm:p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-mint-100 text-green-700 sm:size-11"><Icon name={ic} /></span>
                <span className="text-[15px] font-bold leading-5 sm:text-[17px] sm:leading-6">{t}</span>
                <span className="text-[14px] leading-5 text-ink-2 sm:text-[15px] sm:leading-6">{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Everything in one place */}
        <section id="features" className="flex scroll-mt-20 flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="Everything in one place" title="Run the whole pharmacy, not five" accent="apps" lead="Walk-in billing, online orders, prescriptions, inventory and credit: one console instead of a drawer full of registers, and no aggregator taking your customers. Your online store and 10-minute delivery are launching soon." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(([ic, t, s, status]) => (
              <div key={t} className="flex flex-col gap-3 rounded-2xl border border-line p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className={`flex size-12 items-center justify-center rounded-xl ${status === "soon" ? "bg-gold-50 text-gold-ink" : "bg-mint-100 text-green-700"}`}><Icon name={ic} size={22} /></span>
                  {status === "soon" ? <Soon /> : <span className="d-tag rounded-md bg-mint-100 px-2 py-0.5 text-green-700">Live today</span>}
                </div>
                <h3 className="d-h3">{t}</h3>
                <p className="text-ink-2">{s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Toolkit */}
        <section className="flex flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="The complete toolkit" title="Every tool your counter" accent="needs" lead="Billing, stock, purchases, reports and compliance, for a retail counter or a hospital pharmacy, all in one console. No add-ons, no extra logins." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLKIT.map(([ic, t, s]) => (
              <div key={t} className="flex gap-3 rounded-2xl bg-mint-50 p-4 ring-1 ring-mint-200 sm:gap-4 sm:p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-green-700"><Icon name={ic} /></span>
                <span className="flex flex-col gap-1"><h3 className="text-[17px] font-bold leading-6">{t}</h3><p className="text-[15px] leading-6 text-ink-2">{s}</p></span>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="flex scroll-mt-20 flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="How it works" title="Live in about a" accent="week" lead="No big migration project and no upfront cost. We do the heavy lifting, and your staff learns it in a day." />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([ic, t, s], i) => (
              <li key={t} className="flex gap-4 rounded-2xl border border-line p-4 sm:flex-col sm:gap-3 sm:p-6">
                <div className="flex shrink-0 items-start justify-between sm:items-center">
                  <span className={`flex size-11 items-center justify-center rounded-xl font-bold sm:size-12 ${i % 2 ? "bg-gold text-forest" : "bg-forest text-gold"}`}>{i + 1}</span>
                  <Icon name={ic} size={22} className="hidden text-faint sm:block" />
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:contents">
                  <h3 className="d-h3">{t}</h3>
                  <p className="text-[15px] leading-6 text-ink-2 sm:text-[16px]">{s}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Comparison */}
        <section id="different" className="flex scroll-mt-20 flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="The dark-store battle" title="Beat the dark stores at their own" accent="game" lead="Corporate e-pharmacies and 10-minute dark stores are pulling customers off your counter. MedMate gives your shop the same speed and storefront, hyperlocal, so your customers, your prices and your name on the store stay yours." />
          <p className="d-caption -mb-6 flex items-center justify-center gap-1.5 text-muted sm:hidden"><Icon name="chev-l" size={14} />Swipe to compare<Icon name="chev-r" size={14} /></p>
          <div className="no-scrollbar relative -mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-line text-left">
              <caption className="sr-only">How MedMate compares with a paper register, generic pharmacy software and e-pharmacies</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 bg-surface-2 p-3 text-[14px] font-semibold text-muted sm:p-4">Feature</th>
                  {COMPARE_COLS.map((c, i) => <th key={c} scope="col" className={`p-3 text-center text-[13px] font-semibold sm:p-4 sm:text-[14px] ${i === 3 ? "bg-forest text-white" : "bg-surface-2 text-ink-2"}`}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row" className="sticky left-0 z-10 border-t border-line bg-surface p-3 text-[14px] font-medium sm:p-4 sm:text-[15px]">{label}</th>
                    {cells.map((v, i) => <td key={i} className={`border-t border-line p-3 text-center sm:p-4 ${i === 3 ? "bg-mint-50" : ""}`}><Mark v={v} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="d-caption text-center text-muted">Your online store and delivery are launching soon in Bengaluru. Set up the console now and go live the day they open.</p>
        </section>

        {/* Pricing */}
        <section id="pricing" className="flex scroll-mt-20 flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="Simple pricing" title="Plans that grow with your" accent="pharmacy" lead="First 3 months free on every plan. No setup fee and no lock-in: upgrade or cancel any time, and your data always stays yours. Save up to ₹3,600 a year with yearly billing." />
          <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.name} className={`relative flex flex-col gap-4 rounded-3xl p-5 sm:p-6 ${p.popular ? "bg-forest text-white shadow-sh3" : "border border-line"}`}>
                {p.popular && <span className="d-tag absolute -top-3 left-6 rounded-md bg-gold px-2.5 py-1 text-forest">MOST POPULAR</span>}
                <div className="flex flex-col gap-1">
                  <h3 className="d-h3">{p.name}</h3>
                  <p className={`text-[15px] ${p.popular ? "text-mint-200" : "text-ink-2"}`}>{p.line}</p>
                </div>
                <p className="flex items-end gap-1"><span className={`text-[40px] font-extrabold leading-none tracking-[-0.03em] ${p.popular ? "text-gold" : "text-forest"}`}>{inr(p.price)}</span><span className={`pb-1 ${p.popular ? "text-mint-200" : "text-muted"}`}>/month</span></p>
                <p className={`d-caption w-fit rounded-md px-2 py-1 font-semibold ${p.popular ? "bg-white/10 text-gold" : "bg-gold-50 text-gold-ink"}`}>First 3 months free</p>
                <ul className="flex flex-1 flex-col gap-2 text-[15px]">
                  {p.plus && <li className={`font-semibold ${p.popular ? "text-white" : "text-ink"}`}>Everything in {p.plus}, plus:</li>}
                  {p.features.map((f) => <li key={f} className="flex items-start gap-2"><Icon name="check" size={16} className={`mt-1 ${p.popular ? "text-gold" : "text-green"}`} /><span className={p.popular ? "text-mint-200" : "text-ink-2"}>{f}</span></li>)}
                </ul>
                <a href="#register" data-plan={p.name} className={`press d-btn inline-flex h-12 items-center justify-center rounded-xl px-5 ${p.popular ? "bg-gold text-forest hover:bg-gold-200" : "border-[1.5px] border-green text-green hover:bg-mint-50"}`}>Get started</a>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-mint-50 p-5 ring-1 ring-mint-200 sm:p-6 md:flex-row md:items-center">
            <div className="flex flex-col gap-1">
              <h3 className="d-h3">Running two or more branches?</h3>
              <p className="max-w-[720px] text-ink-2">A custom plan for multi-branch pharmacies and chains: one dashboard across every location, stock transfers between shops, per-branch logins and pricing, consolidated reports and priority onboarding.</p>
            </div>
            <a href="#register" data-plan="Multi-branch" className="press d-btn inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-green px-5 text-white hover:bg-green-700 max-sm:w-full">Get a custom quote</a>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="flex flex-col gap-8 lg:gap-10">
          <Heading center eyebrow="Not just software" title="An ecosystem around your" accent="counter" lead="Distributor catalogues, insurance claims, payments and compliance: the connections that make a pharmacy easier to run. Each one says exactly where it stands." />
          <div className="grid gap-4 md:grid-cols-2">
            {ECOSYSTEM.map(([ic, t, s, status]) => (
              <div key={t} className="flex gap-3 rounded-2xl border border-line p-4 sm:gap-4 sm:p-6">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-100 text-green-700 sm:size-12"><Icon name={ic} size={22} /></span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="d-h3">{t}</h3><span className={`d-tag rounded-md px-2 py-0.5 ${status === "Live" ? "bg-mint-100 text-green-700" : "bg-gold-50 text-gold-ink ring-1 ring-gold-100"}`}>{status}</span></div>
                  <p className="text-ink-2">{s}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Register */}
        <section id="register" aria-labelledby="register-h" className="grid scroll-mt-20 gap-8 rounded-3xl border border-line p-5 shadow-sh2 sm:rounded-[32px] sm:p-6 md:p-10 lg:grid-cols-[1fr_1.25fr] lg:gap-10">
          <div className="flex flex-col gap-4">
            <p className="d-eyebrow text-green-700">Book a free demo</p>
            <h2 id="register-h" className="d-h2">Own the future of pharmacy in your <span className="text-green">neighbourhood</span></h2>
            <p className="text-ink-2">Run your whole shop on one console today, and be first live when quick-commerce delivery opens. Tell us about your shop and we will set up a 20-minute demo on WhatsApp or at your counter.</p>
            <ul className="flex flex-col gap-2 text-ink-2">
              {["Free to start: first 3 months free", "Live in about 7 days, data migrated for you", "No setup fee, no lock-in"].map((t) => <li key={t} className="flex items-center gap-2"><Icon name="check" size={16} className="text-green" />{t}</li>)}
            </ul>
          </div>
          {/* Netlify Forms collects submissions on the live site (Netlify → Forms). It does not submit on the local dev server. */}
          <form name="pharmacy-partner" method="POST" action="/pharmacy-partner/thanks" data-netlify="true" netlify-honeypot="company-website" data-waitlist className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="form-name" value="pharmacy-partner" />
            <p className="hidden"><label>Leave this empty <input name="company-website" tabIndex={-1} autoComplete="off" /></label></p>
            <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="d-caption font-semibold text-ink-2">Pharmacy name</span><input name="pharmacy" required minLength={3} placeholder="Sri Sai Medicals" className={field} /></label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Owner’s name</span><input name="owner" required autoComplete="name" className={field} /></label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Mobile number (WhatsApp)</span><input name="phone" required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} title="10-digit Indian mobile number" placeholder="98450 12345" autoComplete="tel-national" className={field} /></label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Area or locality</span><input name="area" required placeholder="Jayanagar 4th Block" className={field} /></label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">City</span><input name="city" required defaultValue="Bengaluru" className={field} /></label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Plan you are interested in</span>
              <select name="plan" defaultValue="Not sure yet" className={field}>
                {["Not sure yet", ...PLANS.map((p) => `${p.name} (${inr(p.price)}/month)`), "Multi-branch (custom quote)"].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Demo</span>
              <select name="demo" defaultValue="WhatsApp video call" className={field}>
                <option>WhatsApp video call</option>
                <option>At my pharmacy</option>
              </select>
            </label>
            <label className="flex items-start gap-2.5 sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--color-green)]" /><span className="d-caption text-ink-2">I agree that MedMate may contact me on WhatsApp or by phone about a demo. See the <a href="/privacy" className="font-semibold text-green-700 underline">privacy notice</a>.</span></label>
            <button type="submit" className="press d-btn h-12 rounded-xl bg-green px-5 text-white hover:bg-green-700 sm:col-span-2">Book my free demo</button>
          </form>
        </section>

        {/* FAQ */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <Heading eyebrow="Questions" title="Everything you might" accent="ask" lead="Anything else? Book a demo and ask us on the call." />
          <Faq items={FAQS} />
        </section>

        {/* Areas */}
        <section aria-labelledby="areas-h" className="flex flex-col gap-6 lg:gap-8">
          <Heading eyebrow="Across Bengaluru" title="Onboarding chemists in every part of the" accent="city" lead="Book a demo and we will tell you your area’s status." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ZONES.map((z) => (
              <div key={z.slug} className="flex flex-col gap-2 rounded-2xl border border-line p-5">
                <h3 id={z.slug === "south-bengaluru" ? "areas-h" : undefined} className="flex items-center gap-2 text-[17px] font-bold"><Icon name="pin" size={18} className="text-green-700" />{z.zone}</h3>
                <p className="text-[15px] leading-6 text-ink-2">{z.areas.map((a, i) => <span key={a.slug}>{i > 0 && " · "}<Link href={`/bengaluru/${a.slug}`} className="hover:text-green-700 hover:underline">{a.name}</Link></span>)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Blog */}
        <section className="flex flex-col gap-6">
          <h2 className="d-h3">For pharmacies: from the blog</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="lift group flex flex-col gap-2 rounded-2xl border border-line p-5 sm:p-6">
                <h3 className="d-h3 group-hover:text-green-700">{p.title}</h3>
                <p className="text-ink-2">{p.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </Container>

      <PlanSelect />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "MedMate Partner console",
        alternateName: "Namma MedMate Partner console",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Pharmacy management, billing and online store",
        operatingSystem: "Web browser on desktop, tablet and phone",
        description: "One console for pharmacies: GST billing and POS, batch-wise inventory with expiry alerts, purchases, prescriptions, CRM and credit khata, with an online store and delivery launching soon in Bengaluru.",
        url: `${SITE_URL}/pharmacy-partner`,
        image: `${SITE_URL}/partner/console-desktop.webp`,
        publisher: { "@id": `${SITE_URL}/#org` },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...PLANS.map((p) => p.price)),
          highPrice: Math.max(...PLANS.map((p) => p.price)),
          offerCount: PLANS.length,
          offers: PLANS.map((p) => ({ "@type": "Offer", name: p.name, price: p.price, priceCurrency: "INR", description: `${p.line} First 3 months free.`, priceSpecification: { "@type": "UnitPriceSpecification", price: p.price, priceCurrency: "INR", unitText: "MONTH" } })),
        },
      }} />
    </main>
  );
}
