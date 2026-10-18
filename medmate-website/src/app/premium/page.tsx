import { Rich } from "@/components/rich";
import { Breadcrumbs, Container, Faq, Heading, Icon, JsonLd } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist";
import { BENEFITS, FAQS, FREE_MONTHS, MONTHLY_CAP, OFFER_SINCE, STEPS, TERMS } from "@/lib/premium";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "MedMate Premium free for 3 months from launch day",
  description: `Join the MedMate waitlist and get MedMate Premium free for ${FREE_MONTHS} months from launch day in your Bengaluru area: free Standard and Express delivery on every order, no handling charge and priority support. No card needed.`,
  path: "/premium",
});

export default function Premium() {
  return (
    <main>
      <section className="brand-zone relative overflow-hidden text-white">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative flex flex-col gap-6 py-8 sm:py-12">
          <div className="[&_a]:text-mint-200 [&_a:hover]:text-white [&_span[aria-current]]:text-white"><Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["MedMate Premium", "/premium"]]} /></div>
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-5">
              <p className="d-eyebrow flex items-center gap-2 text-gold"><Icon name="star" size={14} fill />Waitlist offer</p>
              <h1 className="d-hero">MedMate Premium, <span className="text-gold">free for {FREE_MONTHS} months from launch day.</span></h1>
              <p className="d-lead max-w-[560px] text-mint-200">Everyone who joins the waitlist before MedMate launches in their area gets Premium free for {FREE_MONTHS} months, counted from launch day in that area: free delivery on every order, Express included, no handling charge and priority support. No card, no automatic charge.</p>
              <ul className="grid max-w-[560px] gap-2 sm:grid-cols-2">
                {["Free Standard and Express delivery", "No minimum order value", "No handling or extra-pickup charge", "Priority WhatsApp support"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[15px] font-semibold"><Icon name="check" size={16} className="text-gold" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-surface p-5 text-ink shadow-sh3 sm:p-6" id="join">
              <h2 className="d-h3 mb-3">Join the waitlist</h2>
              <WaitlistForm source="premium-page" compact />
            </div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-16 py-14 sm:gap-24 sm:py-20">
        <section aria-labelledby="benefits-h" className="flex flex-col gap-6">
          <Heading eyebrow="Your 3 free months" title="What Premium" accent="includes" lead="The usual charges are the ones MedMate plans to use at launch. Premium removes them for 3 months from launch day." />
          {/* Phones: one card per benefit, so the Premium column is never off-screen */}
          <ul className="flex flex-col gap-2.5 sm:hidden">
            {BENEFITS.map(([ic, what, usual, premium]) => (
              <li key={what} className="flex items-start gap-3 rounded-2xl border border-line p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-100 text-green-700"><Icon name={ic} size={18} /></span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold leading-5">{what}</span>
                  <span className="text-[16px] font-bold leading-6 text-forest">{premium}</span>
                  <span className="d-caption text-muted">Usually {usual.charAt(0).toLowerCase() + usual.slice(1)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="no-scrollbar relative -mx-4 hidden overflow-x-auto px-4 sm:block">
            <table className="w-full min-w-[600px] border-separate border-spacing-0 overflow-hidden rounded-2xl border border-line text-left">
              <caption className="sr-only">MedMate Premium benefits compared with the usual charges</caption>
              <thead>
                <tr>
                  <th scope="col" className="bg-surface-2 p-4 text-[14px] font-semibold text-muted">Benefit</th>
                  <th scope="col" className="bg-surface-2 p-4 text-[14px] font-semibold text-muted">Usual charge</th>
                  <th scope="col" className="bg-forest p-4 text-[14px] font-semibold text-white">With Premium</th>
                </tr>
              </thead>
              <tbody>
                {BENEFITS.map(([ic, what, usual, premium]) => (
                  <tr key={what}>
                    <th scope="row" className="border-t border-line p-4 text-[15px] font-medium"><span className="flex items-center gap-2.5"><Icon name={ic} size={18} className="shrink-0 text-green-700" />{what}</span></th>
                    <td className="border-t border-line p-4 text-[15px] text-ink-2">{usual}</td>
                    <td className="border-t border-line bg-mint-50 p-4 text-[15px] font-bold text-forest">{premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="d-caption text-muted">Up to {MONTHLY_CAP} Premium orders a month. Medicine prices are not part of Premium and are never above the MRP.</p>
        </section>

        <section aria-labelledby="how-h" className="flex flex-col gap-6">
          <Heading eyebrow="How it works" title="Three steps to" accent="Premium" />
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(([ic, t, s], i) => (
              <li key={t} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
                <div className="flex items-center justify-between">
                  <span className={`flex size-12 items-center justify-center rounded-xl font-bold ${i === 2 ? "bg-gold text-forest" : "bg-forest text-gold"}`}>{i + 1}</span>
                  <Icon name={ic} size={22} className="text-muted" />
                </div>
                <h3 className="d-h3">{t}</h3>
                <p className="text-ink-2">{s}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="terms" aria-labelledby="terms-h" className="flex scroll-mt-24 flex-col gap-4">
          <h2 id="terms-h" className="d-h2">Offer <span className="text-green">terms</span></h2>
          <p className="d-caption text-muted">Offer ID premium-3m-v1 · available to waitlist sign-ups from {OFFER_SINCE}</p>
          <ol className="flex max-w-[820px] list-decimal flex-col gap-3 pl-5 text-[15px] leading-6 text-ink-2 marker:font-bold marker:text-green">
            {TERMS.map((t) => <li key={t} className="pl-1 [&_strong]:text-ink"><Rich text={t} /></li>)}
          </ol>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
          <Heading title="Premium" accent="questions" />
          <Faq items={FAQS} />
        </section>

        <section className="tint-zone flex flex-col items-center gap-4 rounded-[32px] px-6 py-12 text-center ring-1 ring-mint-200">
          <h2 className="d-h2 max-w-[640px]">Be first in your area, with <span className="text-green">Premium on us</span></h2>
          <a href="#join" className="press d-btn inline-flex h-12 items-center gap-2 rounded-xl bg-green px-5 text-white hover:bg-green-700">Join the waitlist<Icon name="chev-r" size={18} /></a>
        </section>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Offer",
        name: `MedMate Premium free for ${FREE_MONTHS} months`,
        description: "Waitlist offer: free Standard and Express delivery on every order, no handling charge, no extra-pickup charge and priority support for 3 months from the day MedMate launches in the member's area.",
        price: "0",
        priceCurrency: "INR",
        url: `${SITE_URL}/premium`,
        eligibleRegion: { "@type": "City", name: "Bengaluru" },
        offeredBy: { "@id": `${SITE_URL}/#org` },
      }} />
    </main>
  );
}
