import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductArt, ProductCard } from "@/components/product";
import { Badge, Breadcrumbs, Container, Faq, GetAppLink, Icon, JsonLd, Qr } from "@/components/ui";
import { PRODUCTS, categoryOf, details, inr, isThin, productBySlug, productHref, productSlug, sameSalt, summary, type Details, type Product } from "@/lib/catalogue";
import { POPULAR_AREAS } from "@/lib/areas";
import { postsForCategory } from "@/lib/blog";
import { qrSvg } from "@/lib/qr";
import { SITE_URL, downloadUrl, pageMeta } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: productSlug(p) }));
}

export async function generateMetadata({ params }: Props) {
  const p = productBySlug((await params).slug);
  if (!p) return {};
  const d = details(p.id);
  const what = d?.kind === "drug" ? "uses, side effects and price" : d ? "price, benefits and how to use" : "price and composition";
  const meta = pageMeta({ title: `${p.name}: ${what}`, description: summary(p), path: productHref(p) });
  return isThin(p) ? { ...meta, robots: { index: false, follow: true } } : meta;
}

/** The master sheet sometimes runs sentences together ("stop.Common"); add the missing space. */
const tidy = (s = "") => s.replace(/([a-z0-9)])\.([A-Z])/g, "$1. $2").replace(/\s+/g, " ").trim();
/** OTC benefit lists arrive as one string with no separators between points. */
const points = (s = "") => tidy(s).split(/(?<=[a-z)])(?=[A-Z][a-z])/).map((x) => x.trim()).filter((x) => x.length > 3);
const SAFETY: Record<string, [string, string]> = {
  alcohol: ["Alcohol", "chat"], pregnancy: ["Pregnancy", "heart"], lactation: ["Breastfeeding", "user"],
  driving: ["Driving", "scooter"], kidney: ["Kidney", "shield"], liver: ["Liver", "shield"],
};
/** Date the MRPs were taken from the product listing (compliance review M1). */
const MRP_DATE = "4 October 2026";
const tone = (v: string) => (/UNSAFE/.test(v) ? "red" : /CAUTION|CONSULT/.test(v) ? "gold" : "mint") as "red" | "gold" | "mint";
const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function MedicinePage({ params }: Props) {
  const p = productBySlug((await params).slug);
  if (!p) notFound();
  const d = details(p.id);
  const cat = categoryOf(p);
  const url = SITE_URL + productHref(p);
  const deep = downloadUrl("product");
  const qr = await qrSvg(deep);
  const subs = sameSalt(p).slice(0, 8);
  const similar = cat.products.filter((x) => x.id !== p.id && !subs.includes(x)).slice(0, 5);
  const mrp = d?.mrp ? Math.round(d.mrp * 100) / 100 : p.mrp;
  const sections = buildSections(p, d);
  const thin = isThin(p);
  // Declarations shown for every product (Legal Metrology (Packaged Commodities) Rules, Rule 6(10)); see the compliance review.
  const marketer = (d?.marketer ?? "").split("|").map((x) => x.trim()).filter(Boolean);
  const facts = ([
    [thin ? "Pack" : "Composition (generic name)", p.comp],
    ["Form", p.form],
    ["Net quantity", d?.pack ?? ""],
    ["Prescription", p.rx ? "Required" : ""],
    ["Marketed by", marketer[0] || p.brand],
    ["Marketer’s address", marketer.slice(1).join(", ")],
    ["Country of origin", d?.origin ?? ""],
    ["MRP", `${inr(mrp)} (incl. of all taxes), as listed on ${MRP_DATE}`],
    ["Consumer care", "As printed on the pack by the manufacturer or marketer"],
    ...Object.entries(d?.facts ?? {}).filter(([k]) => k !== "Chemical Class"),
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <main>
      <Container className="flex flex-col gap-8 pt-5 sm:pt-8">
        <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Medicines", "/medicines"], [cat.name, `/medicines/${cat.slug}`], [p.name, productHref(p)]]} />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-8 sm:gap-10">
            {/* Summary */}
            <section className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:gap-8 md:grid-cols-[360px_minmax(0,1fr)]">
              <div className="art-bg flex aspect-[4/3] items-center justify-center rounded-3xl p-6 sm:aspect-square sm:p-8">
                <ProductArt p={p} scale={2.2} eager className="h-full w-full" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {p.rx && <Badge tone="red">Rx · Prescription required</Badge>}
                  <Badge tone="plain">{cat.name}</Badge>
                </div>
                <h1 className="d-h1">{p.name}</h1>
                {p.comp && p.comp !== p.name && <p className="d-lead text-ink-2">{p.comp}</p>}
                {!thin && <p className="text-muted">By <span className="font-semibold text-ink-2">{p.brand}</span>{d?.pack ? <> · {d.pack}</> : null}</p>}
                {p.use && <p className="flex items-center gap-2 text-ink-2"><Icon name="info" size={18} className="text-green-700" />Used for {p.use.replace(/^Treatment of /i, "").toLowerCase()}</p>}
                <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2 rounded-2xl bg-mint-50 p-4 ring-1 ring-mint-200">
                  <p className="flex flex-col"><span className="d-caption text-muted">MRP (incl. of all taxes)</span><span className="text-[28px] font-extrabold leading-8 text-forest">{inr(mrp)}</span></p>
                  <p className="d-caption max-w-[260px] pb-1 text-ink-2 max-sm:basis-full">As listed on {MRP_DATE}. Always check the MRP printed on the pack; no pharmacy may charge more.</p>
                </div>
                {!p.rx && (
                  <div className="flex flex-wrap gap-3 lg:hidden">
                    <GetAppLink from="product-inline">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
                  </div>
                )}
                {p.rx && (
                  <p className="d-caption flex items-start gap-2 rounded-xl bg-red-bg p-3 text-ink-2 ring-1 ring-red/15">
                    <Icon name="rx-doc" size={16} className="mt-px shrink-0 text-red" />Prescription medicine. It is dispensed only by a licensed pharmacy against a valid prescription from a registered doctor, after a pharmacist checks it.
                  </p>
                )}
                <p className="d-caption flex items-start gap-2 text-muted"><Icon name="store" size={16} className="mt-px shrink-0 text-green-700" />When MedMate launches, medicines are sold and dispensed by licensed partner pharmacies. The pharmacy’s name, address, drug licence number and pharmacist will be shown before you pay and on your invoice.</p>
              </div>
            </section>

            {/* In-page navigation */}
            {sections.length > 2 && (
              <nav aria-label="On this page" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-full border border-line px-4 py-2 text-[14px] font-semibold text-ink-2 hover:border-green hover:text-green">{s.nav}</a>)}
              </nav>
            )}

            <article className="prose-mm max-w-[760px]">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2>{s.title}</h2>
                  {s.body}
                </section>
              ))}

              {d?.kind === "drug" && d.safety && (
                <section id="safety" className="scroll-mt-24">
                  <h2>Safety advice</h2>
                  <div className="not-prose grid gap-3 sm:grid-cols-2">
                    {Object.entries(d.safety).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-2 rounded-2xl border border-line p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{SAFETY[k]?.[0] ?? cap(k)}</span>
                          <span className="ml-auto"><Badge tone={tone(v)}>{cap(v)}</Badge></span>
                        </div>
                        {d.safetyNotes?.[k] && <p className="!m-0 text-[14px] leading-5 text-ink-2">{tidy(d.safetyNotes[k])}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {d?.faq && d.faq.length > 0 && (
                <section id="faq" className="scroll-mt-24">
                  <h2>Frequently asked questions</h2>
                  <div className="not-prose"><Faq items={d.faq.slice(0, 8).map(([q, a]) => [tidy(q), tidy(a)])} /></div>
                </section>
              )}

              <section className="not-prose mt-10 flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-[14px] leading-5 text-muted">
                <Icon name="info" size={18} className="mt-px shrink-0" />
                <p>This information is for reference only and does not replace advice from your doctor or pharmacist. Do not start, stop or change a medicine without medical advice. Details come from the product’s listing and may differ from the pack you receive; always read the label.</p>
              </section>
            </article>
          </div>

          {/* Side card: waitlist for non-prescription products; plain information for prescription medicines (no order prompt) */}
          <aside className="hidden lg:block">
            {p.rx ? (
              <div className="sticky top-24 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-6 shadow-sh1">
                <p className="d-eyebrow text-red">Prescription medicine</p>
                <ul className="flex flex-col gap-2 text-[14px] text-ink-2">
                  {["Dispensed only against a valid prescription", "A registered pharmacist checks every prescription", "Take only as your doctor advises"].map((t) => <li key={t} className="flex items-start gap-2"><Icon name="check" size={16} className="mt-0.5 text-green" />{t}</li>)}
                </ul>
                <Link href="/blog/how-to-read-a-prescription-od-bd-tds-meaning" className="d-caption font-semibold text-green-700 hover:underline">How to read a prescription</Link>
              </div>
            ) : (
              <div className="sticky top-24 flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-sh2">
                <p className="d-eyebrow text-green-700">Launching soon in Bengaluru</p>
                <div className="flex items-center gap-4">
                  <Qr svg={qr} size={100} className="!shadow-none" />
                  <p className="text-[15px] font-semibold leading-5 text-ink-2">Scan to join the MedMate waitlist on your phone</p>
                </div>
                <ul className="flex flex-col gap-2 text-[14px] text-ink-2">
                  {["Licensed pharmacies near you", "Compare prices before you pay", "UPI, card or cash on delivery"].map((t) => (
                    <li key={t} className="flex items-center gap-2"><Icon name="check" size={16} className="text-green" />{t}</li>
                  ))}
                </ul>
                <GetAppLink from="product-card" className="w-full">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
              </div>
            )}
          </aside>
        </div>

        {!p.rx && (
          <section aria-label="Coming soon areas" className="flex max-w-[760px] flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-mint-50 p-4 text-[14px] text-ink-2 ring-1 ring-mint-200">
            <Icon name="pin" size={18} className="text-green-700" />
            <span className="font-semibold text-ink">MedMate is coming to:</span>
            {POPULAR_AREAS.slice(0, 8).map((a, i) => <span key={a.slug} className="whitespace-nowrap">{i > 0 && "· "}<Link href={`/bengaluru/${a.slug}`} className="hover:text-green-700 hover:underline">{a.name}</Link></span>)}
            <Link href="/bengaluru" className="font-semibold text-green-700 hover:underline">and more areas</Link>
          </section>
        )}

        {facts.length > 0 && (
          <section aria-labelledby="facts" className="max-w-[760px]">
            <h2 id="facts" className="d-h3 mb-4">Product details</h2>
            <dl className="divide-y divide-line rounded-2xl border border-line">
              {facts.map(([k, v]) => (
                <div key={k} className="grid gap-0.5 px-4 py-3 text-[15px] sm:grid-cols-[160px_1fr] sm:gap-4 sm:px-5"><dt className="d-caption text-muted sm:text-[15px] sm:font-normal sm:leading-6">{k}</dt><dd className="text-ink">{k === "Therapeutic Class" || k === "Action Class" ? cap(v) : v}</dd></div>
              ))}
            </dl>
          </section>
        )}

        {subs.length > 0 && (
          <section aria-labelledby="subs" className="flex flex-col gap-4 pt-6">
            <h2 id="subs" className="d-h2">Same composition <span className="text-green">alternatives</span></h2>
            <p className="max-w-[760px] text-ink-2">These contain {p.comp}. A pharmacist can offer a same-salt alternative only with your consent; ask your doctor if you are unsure. <Link href="/blog/generic-vs-branded-medicines-same-salt" className="font-semibold text-green-700 underline underline-offset-2">What “same salt” means</Link></p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{subs.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}

        {similar.length > 0 && (
          <section aria-labelledby="similar" className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="similar" className="d-h2">More in <span className="text-green">{cat.name}</span></h2>
              <Link href={`/medicines/${cat.slug}`} className="inline-flex min-h-11 items-center font-semibold text-green-700 hover:underline sm:min-h-0">See all {cat.products.length}</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">{similar.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
        <section aria-labelledby="reads" className="flex flex-col gap-4 pt-6">
          <h2 id="reads" className="d-h3">Helpful reads</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {postsForCategory(p.cat).map((b) => (
              <Link key={b.slug} href={`/blog/${b.slug}`} className="lift group flex flex-col gap-2 rounded-2xl border border-line p-5">
                <span className="font-semibold leading-6 group-hover:text-green-700">{b.title}</span>
                <span className="d-caption text-muted">{b.minutes} min read</span>
              </Link>
            ))}
          </div>
        </section>
      </Container>

      {!thin && <JsonLd data={schema(p, d, url)} />}
    </main>
  );
}

type Sec = { id: string; nav: string; title: string; body: React.ReactNode };
function buildSections(p: Product, d?: Details): Sec[] {
  const out: Sec[] = [];
  const name = p.name;
  // OTC intros start with the listing title and a colon ("Brand Product (30 Each):Product is…"); drop that label.
  if (d?.intro) out.push({ id: "overview", nav: "Overview", title: `About ${name}`, body: <p>{tidy(d.intro.replace(/^[^.:]{3,120}:(?=\S)/, ""))}</p> });
  else
    out.push({
      id: "overview", nav: "Overview", title: `About ${name}`,
      body: (
        <>
          {isThin(p) ? (
            <p>{name} ({p.sub.toLowerCase()}) is available from pharmacies near you on MedMate. Full product details for this listing are being added; the pack you receive carries the complete composition and directions.</p>
          ) : (
            <p>{name} is a {p.form.toLowerCase()} marketed by {p.brand}{p.comp && p.comp !== name ? `, containing ${p.comp}` : ""}.{p.use ? ` It is used for ${p.use.replace(/^Treatment of /i, "").toLowerCase()}.` : ""}</p>
          )}
          <p>{p.rx ? `${name} is a prescription medicine. A pharmacist dispenses it only against a valid prescription; on MedMate you will be able to upload one, or book a consultation with a registered doctor who decides independently.` : `${name} can be bought without a prescription. Read the label and follow the directions on the pack, or ask your pharmacist.`}</p>
        </>
      ),
    });
  if (d?.uses?.length || d?.benefits) {
    const list = d.kind === "otc" ? points(d.benefits) : [];
    out.push({
      id: "uses", nav: d.kind === "drug" ? "Uses" : "Benefits", title: d.kind === "drug" ? `Uses of ${name}` : `Benefits of ${name}`,
      body: (
        <>
          {d.uses && d.uses.length > 0 && <ul>{d.uses.map((u) => <li key={u}>{u}</li>)}</ul>}
          {d.kind === "drug" && d.benefits && <p>{tidy(d.uses?.[0] && d.benefits.startsWith(`In ${d.uses[0]} `) ? d.benefits.slice(d.uses[0].length + 4) : d.benefits)}</p>}
          {list.length > 1 ? <ul>{list.map((x) => <li key={x}>{x}</li>)}</ul> : d.kind === "otc" && d.benefits ? <p>{tidy(d.benefits)}</p> : null}
        </>
      ),
    });
  }
  if (d?.highlights?.length) out.push({ id: "highlights", nav: "Highlights", title: "Product highlights", body: <ul>{d.highlights.map((h) => <li key={h}>{tidy(h)}</li>)}</ul> });
  if (d?.ingredients) out.push({ id: "ingredients", nav: "Ingredients", title: "Key ingredients", body: <p>{d.ingredients.split(",").map((x) => x.trim()).filter(Boolean).join(", ")}</p> });
  if (d?.howToUse) out.push({ id: "how-to-use", nav: "How to use", title: `How to use ${name}`, body: <p>{tidy(d.howToUse)}</p> });
  if (d?.howItWorks) out.push({ id: "how-it-works", nav: "How it works", title: `How ${name} works`, body: <p>{tidy(d.howItWorks)}</p> });
  if (d?.sideEffects?.length)
    out.push({
      id: "side-effects", nav: "Side effects", title: `Side effects of ${name}`,
      body: (
        <>
          <p>Most side effects do not need medical attention and go away as your body adjusts. Talk to your doctor if they persist or worry you. Common side effects include:</p>
          <ul>{d.sideEffects.map((s) => <li key={s}>{s}</li>)}</ul>
        </>
      ),
    });
  if (d?.safetyInfo) out.push({ id: "safety-info", nav: "Safety", title: "Safety information", body: <p>{tidy(d.safetyInfo)}</p> });
  if (d?.ifMiss) out.push({ id: "missed-dose", nav: "Missed dose", title: "If you miss a dose", body: <p>{tidy(d.ifMiss)}</p> });
  if (d?.storage) out.push({ id: "storage", nav: "Storage", title: "Storage", body: <p>{tidy(d.storage)}. Keep out of the reach of children. <Link href="/blog/how-to-store-medicines-at-home">How to store medicines at home</Link>.</p> });
  const inter = [...new Set(d?.interactions ?? [])].slice(0, 6);
  if (inter.length)
    out.push({
      id: "interactions", nav: "Interactions", title: "Interactions with other medicines",
      body: (
        <>
          <p>Tell your doctor about every medicine you take. Known interactions include:</p>
          <ul>{inter.map((x) => { const [drug, ...rest] = x.split(":"); return <li key={x}><strong>{drug}</strong>{rest.length ? `: ${tidy(rest.join(":"))}` : ""}</li>; })}</ul>
        </>
      ),
    });
  return out;
}

function schema(p: Product, d: Details | undefined, url: string) {
  const image = p.img ? SITE_URL + p.img : undefined;
  const description = d?.intro ? tidy(d.intro).slice(0, 300) : summary(p, 300);
  if (d?.kind === "drug" || p.id.startsWith("DRS"))
    return {
      "@context": "https://schema.org",
      "@type": "Drug",
      name: p.name,
      url,
      ...(image ? { image } : {}),
      description,
      activeIngredient: p.comp || undefined,
      dosageForm: p.form,
      prescriptionStatus: p.rx ? "https://schema.org/PrescriptionOnly" : "https://schema.org/OTC",
      manufacturer: { "@type": "Organization", name: p.brand },
      ...(d?.facts?.["Therapeutic Class"] ? { drugClass: { "@type": "DrugClass", name: cap(d.facts["Therapeutic Class"]) } } : {}),
      ...(d?.uses?.length ? { indication: d.uses.map((u) => ({ "@type": "MedicalIndication", name: u })) } : {}),
      ...(d?.sideEffects?.length ? { adverseOutcome: d.sideEffects.slice(0, 10).map((s) => ({ "@type": "MedicalEntity", name: s })) } : {}),
    };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url,
    ...(image ? { image } : {}),
    description,
    brand: { "@type": "Brand", name: p.brand },
    category: categoryOf(p).name,
    sku: p.id,
  };
}
