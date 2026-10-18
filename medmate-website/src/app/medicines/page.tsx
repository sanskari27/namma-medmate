import Link from "next/link";
import { ProductArt } from "@/components/product";
import { Breadcrumbs, Container, GetAppLink, Heading, Icon } from "@/components/ui";
import { CATEGORIES, PRODUCTS, productHref } from "@/lib/catalogue";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Medicines A to Z: composition, uses and MRP",
  description: `Information on ${PRODUCTS.length}+ medicines and health products in ${CATEGORIES.length} categories, from fever and pain relief to diabetes and heart care. MedMate is launching soon in Bengaluru.`,
  path: "/medicines",
});

export default function Medicines() {
  const letters = [...new Set(PRODUCTS.map((p) => p.name[0].toUpperCase()))].filter((l) => /[A-Z]/.test(l)).sort();
  return (
    <main>
      <section className="border-b border-line bg-mint-50">
        <Container className="flex flex-col gap-5 py-8 sm:gap-6 sm:py-12">
          <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Medicines", "/medicines"]]} />
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Heading as="h1" title="Medicines and health" accent="products" lead={`Information on ${PRODUCTS.length}+ medicines and health products. Pick a category, or search by brand or salt.`} />
            <GetAppLink from="medicines-index">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-10 sm:gap-16 sm:py-14">
        <section aria-labelledby="cats" className="flex flex-col gap-4 sm:gap-6">
          <h2 id="cats" className="d-h3">Categories</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/medicines/${c.slug}`} className="lift group flex min-w-0 items-center gap-3 rounded-2xl border border-line p-2.5 sm:p-3">
                <span className="art-bg flex size-12 shrink-0 items-center justify-center rounded-xl p-1.5 sm:size-16"><ProductArt p={c.cover} scale={0.7} className="h-full w-full" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><span className="break-words font-semibold leading-5 group-hover:text-green-700">{c.name}</span><span className="d-caption text-muted">{c.products.length} products</span></span>
                <Icon name="chev-r" size={18} className="text-faint sm:hidden" />
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="az" className="flex flex-col gap-4 sm:gap-6">
          <h2 id="az" className="d-h3">All medicines, A to Z</h2>
          <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5">
            {letters.map((l) => <a key={l} href={`#letter-${l}`} className="flex size-11 items-center justify-center rounded-lg border border-line text-[15px] font-semibold text-ink-2 hover:border-green hover:text-green sm:size-10 sm:text-[16px]">{l}</a>)}
          </nav>
          <div className="columns-2 gap-5 sm:gap-8 lg:columns-4">
            {letters.map((l) => (
              <div key={l} id={`letter-${l}`} className="mb-6 break-inside-avoid scroll-mt-24">
                <p className="d-eyebrow mb-2 text-green-700">{l}</p>
                <ul className="flex flex-col gap-1.5">
                  {PRODUCTS.filter((p) => p.name[0].toUpperCase() === l).sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                    <li key={p.id}><Link href={productHref(p)} className="block py-2.5 text-[14px] leading-5 text-ink-2 [overflow-wrap:anywhere] hover:text-green-700 sm:py-0.5 sm:text-[15px]">{p.name}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
