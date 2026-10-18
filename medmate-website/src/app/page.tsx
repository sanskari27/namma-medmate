import Link from "next/link";
import { ProductArt, ProductCard } from "@/components/product";
import { Container, Faq, GetAppLink, Heading, Icon, JsonLd, Phone, Qr, StoreButtons, StoreLine } from "@/components/ui";
import { CATEGORIES, POPULAR, PRODUCTS, productHref } from "@/lib/catalogue";
import { AREAS } from "@/lib/areas";
import { POSTS, TOPICS } from "@/lib/blog";
import { FAQS, FEATURES, PARTNER, STEPS, TRUST } from "@/lib/content";
import { qrSvg } from "@/lib/qr";
import { APP_URL, DEFAULT_DESCRIPTION, DEFAULT_TITLE, IOS_URL, LAUNCHED, PLAY_URL, SITE_URL, downloadUrl, pageMeta } from "@/lib/site";
import { WaitlistForm } from "@/components/waitlist";
import { HeroCheck } from "@/components/hero-check";
import { PremiumHero } from "@/components/premium-note";
import { LangToggle, T } from "@/components/lang";
import { FOUNDER } from "@/lib/about";

export const metadata = { ...pageMeta({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" }), title: { absolute: DEFAULT_TITLE } };

/** Hero quick links: fully listed products, with short labels. */
const QUICK = ([["ab73", "Doliprane 650"], ["ab62", "Diclofam Gel"], ["ab80", "Ozole"], ["ab78", "Acigon"], ["DR059078", "BP monitor"], ["DR106559", "Sugar test strips"]] as const)
  .map(([id, label]) => ({ p: PRODUCTS.find((x) => x.id === id), label }))
  .filter((q) => q.p !== undefined);

export default async function Home() {
  const [heroQr, endQr] = await Promise.all([qrSvg(downloadUrl("hero")), qrSvg(downloadUrl("final"))]);
  const cats = CATEGORIES.slice(0, 12);

  return (
    <main>
      {/* Hero */}
      <section className="brand-zone relative overflow-hidden text-white">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-10 pb-10 pt-5 sm:gap-12 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-12">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-6 lg:gap-4">
            <div className="sm:hidden"><LangToggle dark /></div>
            <p className="d-caption hidden w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-semibold text-mint-200 ring-1 ring-white/15 sm:inline-flex">
              <Icon name="pin" size={14} className="text-gold" />Launching soon in Bengaluru · Licensed neighbourhood pharmacies
            </p>
            <h1 className="d-hero"><span className="sm:hidden"><T k="hero.title" /> <span className="text-gold"><T k="hero.accent" /></span></span><span className="hidden sm:inline">Medicine delivery from pharmacies near you, <span className="text-gold">coming soon to Bengaluru.</span></span></h1>
            <p className="d-lead max-w-[560px] text-mint-200"><span className="sm:hidden"><T k="hero.lead" /></span><span className="hidden sm:inline">Compare prices across nearby chemists, upload a prescription or talk to a doctor, and track your rider to your door.</span></p>
            <PremiumHero className="max-w-[560px] max-sm:!hidden" />
            <div className="sm:hidden"><HeroCheck /></div>

            <form action="/search" role="search" className="hidden max-w-[560px] items-center gap-2 rounded-2xl bg-surface p-2 shadow-sh3 sm:flex">
              <Icon name="search" size={22} className="ml-2 text-muted" />
              <label htmlFor="hero-q" className="sr-only">Search medicines</label>
              <input id="hero-q" name="q" placeholder="Search medicines, e.g. Dolo 650" className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint" />
              <button type="submit" className="press d-btn h-11 shrink-0 rounded-xl bg-green px-4 text-white hover:bg-green-700 sm:px-5">Search</button>
            </form>
            <div className="no-scrollbar -mx-4 -mt-1 hidden items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:-mt-2 sm:flex sm:flex-wrap sm:px-0">
              <span className="d-caption shrink-0 text-mint-300">Popular:</span>
              {QUICK.map(({ p, label }) => (
                <Link key={p!.id} href={productHref(p!)} className="d-caption shrink-0 whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white ring-1 ring-white/15 hover:bg-white/20">{label}</Link>
              ))}
            </div>

            <div className="mt-1 hidden flex-wrap items-center gap-6 sm:mt-2 sm:flex">
              <div className="hidden items-center gap-4 rounded-3xl bg-white/5 p-3 pr-5 ring-1 ring-white/15 lg:flex">
                <Qr svg={heroQr} size={112} className="!ring-0" />
                <div className="flex max-w-[180px] flex-col gap-1">
                  <p className="text-[17px] font-bold leading-6">Scan to join the waitlist</p>
                  <p className="d-caption text-mint-200">Open your phone camera and point it at the code.</p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto">
                <StoreButtons dark from="hero" />
              </div>
            </div>
            <p className="d-caption flex items-center gap-2 text-mint-200 sm:hidden"><Icon name="phone" size={14} className="text-gold" /><T k="stores.line" /></p>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[520px] items-center justify-center sm:flex sm:h-[560px] lg:h-[620px]">
            <Phone src="/screens/tracking.webp" alt="MedMate order tracking screen with the rider on a live map" width={250} className="absolute left-0 top-16 hidden -rotate-6 opacity-95 sm:block" />
            <Phone src="/screens/home.webp" alt="MedMate home screen with search, upload prescription and offers" width={290} priority className="relative z-10 sm:translate-x-14" />
            <Chip className="left-0 top-8 flex sm:-left-4 sm:top-6" icon="pin" title="Pharmacies near you" sub="Prices compared before you pay" />
            <Chip className="bottom-24 right-0 hidden sm:flex sm:-right-2" icon="rx-doc" title="Rx checked" sub="By a licensed pharmacist" />
            <Chip className="bottom-4 left-4 hidden sm:flex sm:left-10" icon="steth" title="Talk to a doctor" sub="The doctor decides independently" gold />
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section aria-label="Why people trust MedMate" className="border-b border-line bg-mint-50">
        <Container className="grid grid-cols-2 gap-x-3 gap-y-3 py-4 sm:gap-4 sm:py-6 lg:grid-cols-4">
          {TRUST.map(([ic, t]) => (
            <p key={t} className="flex items-center gap-2.5 text-[14px] font-semibold leading-5 text-ink-2 sm:gap-3 sm:text-[16px] sm:leading-6">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-green-700 ring-1 ring-mint-200 sm:size-10"><Icon name={ic} size={18} /></span>{t}
            </p>
          ))}
        </Container>
      </section>

      {/* Phone only: swipe through the app, like a store listing */}
      <section aria-label="App screens" className="py-8 sm:hidden">
        <Container className="flex flex-col gap-3">
          <p className="d-eyebrow text-green-700">A look inside the app</p>
          <div className="snap-row gap-3">
            {([["home", "Home: search, upload a prescription, offers"], ["options", "Compare nearby pharmacies by price and time"], ["upload", "Upload a prescription"], ["tracking", "Track your rider live"], ["schedule", "Dose reminders and refills"]] as const).map(([k, cap]) => (
              <figure key={k} className="flex w-[200px] flex-col gap-2">
                <Phone src={`/screens/${k}.webp`} alt={cap} width={200} className="max-sm:[--phone-max:200px]" />
                <figcaption className="d-caption px-1 text-muted">{cap}</figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-14 lg:py-24">
        <Container className="grid items-center gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
          <div className="flex flex-col gap-8 lg:gap-10">
            <Heading eyebrow="How it works" title="Your local chemist, now" accent="in your pocket" lead="Here is how MedMate will work when it launches: it finds the licensed pharmacies near you that have your medicines and sends a rider to collect them." />
            <ol className="grid gap-4 sm:grid-cols-2">
              {STEPS.map(([ic, t, s], i) => (
                <li key={t} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 sm:flex-col sm:gap-3 sm:p-5">
                  <div className="flex shrink-0 items-start justify-between sm:items-center">
                    <span className={`flex size-11 items-center justify-center rounded-xl sm:size-12 ${i === 2 ? "bg-forest text-mint sm:bg-gold sm:text-forest" : "bg-forest text-gold max-sm:text-mint"}`}><Icon name={ic} size={22} /></span>
                    <span className="d-eyebrow hidden text-muted sm:inline">Step {i + 1}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 sm:contents">
                    <span className="d-eyebrow text-muted sm:hidden">Step {i + 1}</span>
                    <h3 className="d-h3">{t}</h3>
                    <p className="text-[15px] leading-6 text-ink-2 sm:text-[16px]">{s}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3">
              <GetAppLink from="how-it-works">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
              <Link href="/medicines" className="press d-btn inline-flex h-12 items-center rounded-xl border-[1.5px] border-green px-5 text-green hover:bg-mint-50">Browse medicines</Link>
            </div>
          </div>
          <div className="tint-zone relative mx-auto hidden w-full max-w-[380px] justify-center rounded-3xl px-6 pt-6 sm:flex sm:rounded-[40px] sm:pt-10">
            <Phone src="/screens/options.webp" alt="Choosing between nearby pharmacies by price, delivery charge and time" width={290} className="-mb-8 sm:-mb-10" />
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="bg-surface-2 py-14 lg:py-24">
        <Container className="flex flex-col gap-8 lg:gap-12">
          <Heading center eyebrow="Why MedMate" title="Everything you need from a" accent="pharmacy" lead="Built with Bengaluru’s neighbourhood chemists, for families who would rather not wait in a queue when someone is unwell." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {FEATURES.map(([ic, t, s], i) => (
              <div key={t} className={`flex flex-col gap-2 rounded-2xl p-4 sm:gap-3 sm:p-6 ${i === 0 ? "bg-forest text-white" : "border border-line bg-surface"}`}>
                <span className={`flex size-10 items-center justify-center rounded-xl sm:size-12 ${i === 0 ? "bg-white/10 text-gold" : "bg-mint-100 text-green-700"}`}><Icon name={ic} size={20} /></span>
                <h3 className="d-h3 max-sm:text-[15px] max-sm:leading-5">{t}</h3>
                <p className={`max-sm:hidden ${i === 0 ? "text-mint-200" : "text-ink-2"}`}>{s}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Doctor call spotlight */}
      <section className="py-14 lg:py-24">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 hidden justify-center sm:flex lg:order-1">
            <div className="relative flex w-full max-w-[460px] justify-center rounded-3xl bg-gold-50 px-6 pt-6 ring-1 ring-gold-100 sm:rounded-[40px] sm:pt-10">
              <Phone src="/screens/upload.webp" alt="Upload a prescription screen in the MedMate app" width={280} className="-mb-8 sm:-mb-10" />
            </div>
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <Heading eyebrow="Prescriptions made simple" title="Need a consultation? Talk to a" accent="registered doctor" lead="Upload the prescription you have, or book a consultation with a registered doctor. The doctor decides independently whether a prescription is right for you, and a pharmacist checks it before anything is packed." />
            <ul className="flex flex-col gap-3">
              {["Prescription items are packed only after verification", "A licensed pharmacist checks every prescription", "Your prescriptions stay in the app for refills"].map((t) => (
                <li key={t} className="flex items-start gap-3 text-ink-2"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-mint-100 text-green-700"><Icon name="check" size={14} /></span>{t}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <GetAppLink from="doctor-spotlight" to="/upload-rx">Join the waitlist</GetAppLink>
              <Link href="/doctor-consultation" className="press d-btn inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-green-700 hover:bg-mint-50 max-sm:w-full">How the consultation works<Icon name="chev-r" size={18} /></Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="bg-mint-50 py-14 lg:py-24">
        <Container className="flex flex-col gap-6 lg:gap-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading eyebrow="Medicines" title="Shop by" accent="category" />
            <Link href="/medicines" className="press d-btn inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line-2 bg-surface px-5 text-ink-2 hover:border-green hover:text-green max-sm:hidden">See all {CATEGORIES.length} categories<Icon name="chev-r" size={16} /></Link>
          </div>
          <div className="snap-row gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {cats.map((c) => (
              <Link key={c.id} href={`/medicines/${c.slug}`} className="lift group flex w-[148px] flex-col items-center gap-3 rounded-2xl bg-surface p-3 pb-4 ring-1 ring-line sm:w-auto">
                <span className="art-bg flex h-24 w-full items-center justify-center rounded-xl p-3 sm:h-28"><ProductArt p={c.cover} className="h-full w-full" /></span>
                <span className="text-center text-[15px] font-semibold leading-5 group-hover:text-green-700">{c.name}</span>
                <span className="d-caption -mt-2 text-muted">{c.products.length} products</span>
              </Link>
            ))}
            <Link href="/medicines" className="flex w-[148px] flex-col items-center justify-center gap-2 rounded-2xl bg-forest p-3 text-center text-white ring-1 ring-forest sm:hidden">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-gold"><Icon name="chev-r" size={22} /></span>
              <span className="text-[15px] font-semibold leading-5">All {CATEGORIES.length} categories</span>
            </Link>
          </div>
        </Container>
      </section>

      {/* Popular */}
      <section className="py-14 lg:py-24">
        <Container className="flex flex-col gap-6 lg:gap-10">
          <Heading eyebrow="Popular right now" title="Everyday" accent="essentials" lead="Pain relief, digestion, vitamins and more, from pharmacies near you. Prices vary by pharmacy; the app will show each one before you pay." />
          <div className="snap-row gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {POPULAR.map((p) => <ProductCard key={p.id} p={p} className="w-[164px] sm:w-auto" />)}
          </div>
        </Container>
      </section>

      {/* Waitlist */}
      <section id="waitlist" aria-label="Join the waitlist" className="scroll-mt-24">
        <Container>
          <div className="grid items-center gap-6 rounded-3xl bg-gold-50 p-5 ring-1 ring-gold-100 sm:gap-8 sm:rounded-[32px] sm:p-8 md:p-12 lg:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col gap-3">
              <p className="d-eyebrow text-gold-ink">Launching soon in Bengaluru</p>
              <h2 className="d-h2">Be the first to order from pharmacies <span className="text-green">near you</span></h2>
              <p className="d-lead text-ink-2">Leave your number and pincode. We will message you the day MedMate goes live in your area, and not before.</p>
              <ul className="mt-1 flex flex-col gap-2 text-[14px] leading-5 text-ink-2">
                {[["shield", "Licensed pharmacies only; a pharmacist checks every prescription"], ["pin", `${AREAS.length} Bengaluru areas on the launch list`], ["store", "Built with Bengaluru’s neighbourhood chemists"]].map(([ic, t]) => (
                  <li key={t} className="flex items-start gap-2"><Icon name={ic} size={16} className="mt-0.5 shrink-0 text-green-700" />{t}</li>
                ))}
              </ul>
              <Link href="/about" className="mt-2 flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-gold-100">
                <img src={FOUNDER.photo} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-full object-cover object-top" />
                <span className="flex flex-col"><span className="text-[14px] font-bold leading-5">{FOUNDER.name}, Founder & CEO</span><span className="d-caption text-muted">Read why we started MedMate</span></span>
                <Icon name="chev-r" size={16} className="ml-auto text-faint" />
              </Link>
            </div>
            <div className="sm:hidden"><GetAppLink from="home-waitlist"><Icon name="star" size={18} fill /><T k="premium.cta" /></GetAppLink></div>
            <div className="max-sm:hidden"><WaitlistForm source="home" /></div>
          </div>
        </Container>
      </section>

      {/* Schedule spotlight */}
      <section className="py-14 lg:py-24">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <Heading eyebrow="For the whole family" title="Never miss a dose, never" accent="run out" lead="Add each medicine once. MedMate reminds you of every dose, counts what is left in the pack and nudges you to refill in time, for your parents and children too." />
            <div className="grid grid-cols-3 gap-3">
              {[["clock", "Dose reminders"], ["refill", "Refill alerts"], ["user", "Family profiles"]].map(([ic, t]) => (
                <div key={t} className="flex flex-col items-start gap-2 rounded-2xl border border-line p-3 sm:p-4"><span className="text-green-700"><Icon name={ic} size={22} /></span><span className="text-[14px] font-semibold leading-5 sm:text-[16px]">{t}</span></div>
              ))}
            </div>
            <GetAppLink from="schedule-spotlight" to="/schedule" className="w-fit">Join the waitlist</GetAppLink>
          </div>
          <div className="hidden justify-center sm:flex">
            <div className="brand-zone relative flex w-full max-w-[460px] justify-center rounded-3xl px-6 pt-6 sm:rounded-[40px] sm:pt-10">
              <Phone src="/screens/schedule.webp" alt="Medicine schedule with today’s doses and refill count" width={280} className="-mb-8 sm:-mb-10" />
            </div>
          </div>
        </Container>
      </section>

      {/* Pharmacy partners */}
      <section aria-label="For pharmacies" className="pt-8">
        <Container>
          <div className="brand-zone grid overflow-hidden rounded-3xl text-white sm:rounded-[32px] lg:grid-cols-[1.15fr_1fr]">
            <div className="flex flex-col gap-4 p-5 sm:p-8 md:p-12">
              <p className="d-eyebrow text-gold">MedMate for pharmacies</p>
              <h2 className="d-h2">Own a pharmacy? Turn your counter into a <span className="text-gold">10-minute pharmacy.</span></h2>
              <p className="d-lead text-mint-200">One console for GST billing, inventory, prescriptions, CRM and credit khata, with your own online store and delivery launching soon. Your prices, your customers, your name on the store. Plans from ₹299 a month.</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/pharmacy-partner#register" className="press d-btn inline-flex h-12 w-fit items-center justify-center gap-2 rounded-xl bg-gold px-5 text-forest hover:bg-gold-200 max-sm:w-full">Book a free demo<Icon name="chev-r" size={18} /></Link>
                <Link href="/pharmacy-partner" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl px-5 text-white ring-[1.5px] ring-white/40 hover:bg-white/10 max-sm:w-full">See plans and features</Link>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/5 py-4 text-center ring-1 ring-white/15">
                {PARTNER.map(([a, b]) => <div key={b} className="px-2"><p className="text-[19px] font-bold leading-7 text-gold sm:text-[24px] sm:leading-8">{a}</p><p className="d-caption text-mint-200">{b}</p></div>)}
              </div>
            </div>
            <div className="relative min-h-[220px] sm:min-h-[360px]">
              <img src="/partner/pharmacist-800.webp" srcSet="/partner/pharmacist-800.webp 800w, /partner/pharmacist-1600.webp 1600w" sizes="(min-width: 1024px) 540px, 100vw" alt="A pharmacist arranging medicines on the shelves of a neighbourhood chemist shop" width={1600} height={1067} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[30%_center]" />
              <div className="absolute inset-0 hidden bg-gradient-to-r from-green-700/70 via-green-700/10 to-transparent lg:block" aria-hidden />
              <p className="d-caption absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 font-semibold text-forest shadow-sh2 sm:bottom-4 sm:left-4"><Icon name="store" size={14} className="text-green-700" />Made for the chemist behind the counter</p>
              <img src="/partner/console-phone.webp" alt="MedMate Partner app on a phone" width={420} height={868} loading="lazy" className="absolute bottom-4 right-4 hidden w-[24%] max-w-[150px] drop-shadow-[0_20px_30px_rgb(0_0_0/0.45)] sm:block" />
            </div>
          </div>
        </Container>
      </section>

      {/* Blog */}
      <section className="py-14 lg:py-24">
        <Container className="flex flex-col gap-6 lg:gap-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading eyebrow="From the blog" title="Know your" accent="medicines" />
            <Link href="/blog" className="press d-btn inline-flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line-2 px-5 text-ink-2 hover:border-green hover:text-green">All articles<Icon name="chev-r" size={16} /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {POSTS.filter((p) => p.topic !== "pharmacies").slice(0, 6).map((g, i) => (
              <Link key={g.slug} href={`/blog/${g.slug}`} className={`lift group flex flex-col gap-3 rounded-2xl border border-line p-5 sm:p-6 ${i >= 3 ? "max-md:hidden" : ""}`}>
                <p className="d-eyebrow text-green-700">{TOPICS[g.topic].name}</p>
                <h3 className="d-h3 group-hover:text-green-700">{g.title}</h3>
                <p className="line-clamp-3 text-ink-2">{g.description}</p>
                <p className="d-caption mt-auto pt-2 text-muted">{g.minutes} min read</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-surface-2 py-14 lg:py-24">
        <Container className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
          <Heading eyebrow="Questions" title="Frequently asked" accent="questions" lead="Everything about ordering, prescriptions, delivery and payments." />
          <Faq items={FAQS} />
        </Container>
      </section>

      {/* Final call to action */}
      <section className="pt-14 lg:pt-24">
        <Container>
          <div className="tint-zone flex flex-col items-center gap-5 rounded-3xl px-5 py-10 text-center ring-1 ring-mint-200 sm:gap-6 sm:rounded-[40px] sm:px-6 sm:py-16">
            <h2 className="d-h1 max-w-[860px]">Your neighbourhood pharmacy, <span className="text-green">one tap away</span></h2>
            <p className="d-lead max-w-[560px] text-ink-2">MedMate is launching soon. Join the waitlist and we will message you the day it goes live near you.</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Qr svg={endQr} size={128} className="hidden md:block" />
              <div className="flex w-full flex-col items-center gap-3 sm:w-auto md:items-start">
                <GetAppLink from="final">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
                <StoreButtons from="final" />
                <StoreLine />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "MobileApplication",
        name: "MedMate",
        operatingSystem: "Android, iOS, Web",
        applicationCategory: "HealthApplication",
        description: DEFAULT_DESCRIPTION,
        url: SITE_URL,
        ...(LAUNCHED ? { installUrl: PLAY_URL || IOS_URL || APP_URL } : {}),
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        publisher: { "@id": `${SITE_URL}/#org` },
      }} />
    </main>
  );
}

function Chip({ className, icon, title, sub, gold }: { className: string; icon: string; title: string; sub: string; gold?: boolean }) {
  return (
    <div className={`anim-float absolute z-20 items-center gap-3 rounded-2xl bg-surface p-3 pr-4 text-ink shadow-sh3 ${className}`}>
      <span className={`flex size-10 items-center justify-center rounded-xl ${gold ? "bg-gold text-forest" : "bg-mint-100 text-green-700"}`}><Icon name={icon} fill={icon === "bolt"} /></span>
      <span className="flex flex-col leading-tight"><span className="text-[15px] font-bold">{title}</span><span className="d-caption text-muted">{sub}</span></span>
    </div>
  );
}
