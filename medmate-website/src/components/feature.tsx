import { qrSvg } from "@/lib/qr";
import { SITE_URL, downloadUrl } from "@/lib/site";
import { Breadcrumbs, Container, Faq, GetAppLink, Heading, Icon, Phone, Qr, StoreButtons, StoreLine } from "./ui";

export type FeatureProps = {
  path: string;
  crumb: string;
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  cta: string;
  to: string;
  screen: [string, string];
  steps: [string, string, string][];
  points: [string, string, string][];
  faqs: [string, string][];
};

/** Landing page for one app feature: hero with QR, steps, benefits, FAQ and a closing call to action. */
export async function FeatureLanding(f: FeatureProps) {
  const from = f.path.slice(1);
  const qr = await qrSvg(downloadUrl(from, f.to));
  return (
    <main>
      <section className="brand-zone overflow-hidden text-white">
        <Container className="flex flex-col gap-6 pt-8">
          <div className="[&_a]:text-mint-200 [&_a:hover]:text-white [&_span[aria-current]]:text-white"><Breadcrumbs base={SITE_URL} items={[["Home", "/"], [f.crumb, f.path]]} /></div>
          <div className="grid items-center gap-10 pb-10 sm:gap-12 sm:pb-16 lg:grid-cols-[1.1fr_1fr] lg:pb-0">
            <div className="flex flex-col gap-5 sm:gap-6 lg:pb-20">
              <p className="d-eyebrow text-gold">{f.eyebrow}</p>
              <h1 className="d-hero">{f.title} <span className="text-gold">{f.accent}</span></h1>
              <p className="d-lead max-w-[560px] text-mint-200">{f.lead}</p>
              <div className="flex flex-wrap items-center gap-5">
                <div className="hidden items-center gap-4 rounded-3xl bg-white/5 p-3 pr-5 ring-1 ring-white/15 lg:flex">
                  <Qr svg={qr} size={104} className="!ring-0" />
                  <p className="max-w-[150px] font-semibold leading-5">Scan to open it in the app</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto">
                  <GetAppLink from={from} to={f.to} variant="gold" className="w-fit">{f.cta}<Icon name="chev-r" size={18} /></GetAppLink>
                  <StoreButtons dark from={from} />
                  <StoreLine dark />
                </div>
              </div>
            </div>
            <div className="flex justify-center self-end">
              <Phone src={f.screen[0]} alt={f.screen[1]} width={290} priority className="lg:-mb-24" />
            </div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-14 pt-14 sm:gap-24 sm:pt-24 lg:pt-36">
        <section className="flex flex-col gap-8 sm:gap-10">
          <Heading center eyebrow="How it works" title="Done in" accent={`${f.steps.length} steps`} />
          <ol className={`grid gap-4 sm:grid-cols-2 ${f.steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {f.steps.map(([ic, t, s], i) => (
              <li key={t} className="flex gap-4 rounded-2xl border border-line p-4 sm:flex-col sm:gap-3 sm:p-6">
                <div className="flex shrink-0 items-start justify-between sm:items-center">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-forest text-gold sm:size-12"><Icon name={ic} size={22} /></span>
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
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {f.points.map(([ic, t, s]) => (
            <div key={t} className="flex flex-col gap-3 rounded-2xl bg-mint-50 p-5 ring-1 ring-mint-200 sm:p-6">
              <span className="flex size-12 items-center justify-center rounded-xl bg-surface text-green-700"><Icon name={ic} size={22} /></span>
              <h3 className="d-h3">{t}</h3>
              <p className="text-ink-2">{s}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <Heading title="Common" accent="questions" />
          <Faq items={f.faqs} />
        </section>

        <section className="tint-zone flex flex-col items-center gap-5 rounded-3xl px-5 py-10 text-center ring-1 ring-mint-200 sm:rounded-[40px] sm:px-6 sm:py-14">
          <h2 className="d-h2 max-w-[640px]">Try it on your next <span className="text-green">order</span></h2>
          <GetAppLink from={`${from}-end`} to={f.to}>{f.cta}<Icon name="chev-r" size={18} /></GetAppLink>
        </section>
      </Container>
    </main>
  );
}
