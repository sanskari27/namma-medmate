import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product";
import { Breadcrumbs, Container, Faq, GetAppLink, Heading, Icon, JsonLd, Qr } from "@/components/ui";
import { CATEGORIES, categoryBySlug, productHref } from "@/lib/catalogue";
import { postsForCategory } from "@/lib/blog";
import { qrSvg } from "@/lib/qr";
import { SITE_URL, downloadUrl, pageMeta } from "@/lib/site";

type Props = { params: Promise<{ cat: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ cat: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const c = categoryBySlug((await params).cat);
  if (!c) return {};
  return pageMeta({
    title: `${c.name} medicines: composition, uses and MRP`,
    description: `${c.name} medicines and products: ${c.blurb} ${c.products.length} products with composition, MRP and safety information. MedMate is launching soon in Bengaluru.`,
    path: `/medicines/${c.slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const c = categoryBySlug((await params).cat);
  if (!c) notFound();
  const qr = await qrSvg(downloadUrl(`category-${c.slug}`));
  const rx = c.products.filter((p) => p.rx).length;
  const faqs: [string, string][] = [
    [`Will I be able to order ${c.name.toLowerCase()} products on MedMate in Bengaluru?`, `Yes, once MedMate launches in Bengaluru. You will set your address, add what you need, and see the licensed pharmacies near you that stock it, with each one’s price, delivery charge and time. Join the waitlist to hear when we go live.`],
    rx > 0
      ? ["Do I need a prescription?", `${rx} of the ${c.products.length} products here are prescription-only and carry an Rx tag. They are dispensed only against a valid prescription from a registered doctor, checked by a pharmacist.`]
      : ["Do I need a prescription?", "Check the pack and ask your pharmacist. Any product that needs a prescription is dispensed only against a valid one, checked by a pharmacist."],
    ["How fast will delivery be?", "MedMate is launching soon. It is designed to deliver from pharmacies near you, and the app will show each pharmacy’s delivery time before you pay."],
  ];
  const others = CATEGORIES.filter((x) => x.id !== c.id).slice(0, 12);

  return (
    <main>
      <section className="border-b border-line bg-mint-50">
        <Container className="flex flex-col gap-5 py-8 sm:gap-6 sm:py-12">
          <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Medicines", "/medicines"], [c.name, `/medicines/${c.slug}`]]} />
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <Heading as="h1" title={c.name} accent="medicines" lead={`${c.blurb} ${c.products.length} products listed. MedMate is launching soon in Bengaluru.`} />
            <div className="hidden items-center gap-4 rounded-2xl bg-surface p-3 pr-5 ring-1 ring-line lg:flex">
              <Qr svg={qr} size={88} className="!p-1.5 !shadow-none !ring-0" />
              <div className="flex max-w-[170px] flex-col gap-1"><p className="font-bold leading-5">Launching soon in Bengaluru</p><p className="d-caption text-muted">Scan to join the waitlist</p></div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-8 sm:gap-16 sm:py-12">
        <section aria-label={`${c.name} products`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {c.products.map((p) => <ProductCard key={p.id} p={p} />)}
        </section>

        <section className="brand-zone flex flex-col items-start justify-between gap-5 rounded-3xl p-5 text-white sm:gap-6 sm:rounded-[28px] sm:p-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <h2 className="d-h3">MedMate is launching soon in Bengaluru</h2>
            <p className="text-mint-200">Prices differ from shop to shop. When we launch, the app will show every nearby pharmacy’s total before you pay.</p>
          </div>
          <GetAppLink from={`category-band-${c.slug}`} variant="gold" className="shrink-0">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
          <h2 className="d-h2">{c.name}: <span className="text-green">questions</span></h2>
          <Faq items={faqs} />
        </section>

        <section aria-labelledby="reads" className="flex flex-col gap-4">
          <h2 id="reads" className="d-h3">Helpful reads</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {postsForCategory(c.id).map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="lift group flex flex-col gap-2 rounded-2xl border border-line p-5">
                <span className="font-semibold leading-6 group-hover:text-green-700">{p.title}</span>
                <span className="d-caption text-muted">{p.minutes} min read</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="more-cats" className="flex flex-col gap-4">
          <h2 id="more-cats" className="d-h3">More categories</h2>
          <div className="pill-list flex flex-wrap gap-2">
            {others.map((x) => <Link key={x.id} href={`/medicines/${x.slug}`} className="rounded-full border border-line px-4 py-2 font-medium text-ink-2 hover:border-green hover:text-green">{x.name}</Link>)}
            <Link href="/medicines" className="rounded-full bg-mint-100 px-4 py-2 font-semibold text-green-700">All categories</Link>
          </div>
        </section>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${c.name} medicines`,
        url: `${SITE_URL}/medicines/${c.slug}`,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: c.products.length,
          itemListElement: c.products.slice(0, 50).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: SITE_URL + productHref(p), name: p.name })),
        },
      }} />
    </main>
  );
}
