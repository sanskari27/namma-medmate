import Link from "next/link";
import { Breadcrumbs, Container, GetAppLink, Heading, Icon, JsonLd } from "@/components/ui";
import { POSTS, TOPICS, type Post, type Topic } from "@/lib/blog";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = {
  ...pageMeta({
    title: "MedMate blog: medicines, prescriptions and selling online",
    description: "Plain-language articles on ordering prescription medicines, spotting fake medicines, MRP and generics, storing medicines at home, and how neighbourhood pharmacies can sell online.",
    path: "/blog",
  }),
  alternates: { canonical: "/blog", types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: "MedMate blog" }] } },
};

const date = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Blog() {
  const [lead, ...rest] = POSTS;
  const topics = Object.keys(TOPICS) as Topic[];
  return (
    <main>
      <section className="border-b border-line bg-mint-50">
        <Container className="flex flex-col gap-5 py-8 sm:gap-6 sm:py-12">
          <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Blog", "/blog"]]} />
          <Heading as="h1" title="The MedMate" accent="blog" lead="Short, plain-language articles to help you buy, use and store medicines with confidence, and to help neighbourhood pharmacies sell online." />
          <nav aria-label="Topics" className="pill-list no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {topics.map((t) => <a key={t} href={`#${t}`} className="shrink-0 whitespace-nowrap rounded-full border border-line-2 bg-surface px-4 py-2 text-[15px] font-semibold text-ink-2 hover:border-green hover:text-green">{TOPICS[t].name}</a>)}
          </nav>
        </Container>
      </section>

      <Container className="flex flex-col gap-10 py-10 sm:gap-16 sm:py-14">
        <Link href={`/blog/${lead.slug}`} className="lift group grid overflow-hidden rounded-3xl border border-line md:grid-cols-[1.1fr_1fr]">
          <div className="brand-zone flex flex-col justify-end gap-3 p-5 text-white sm:p-8 md:p-10">
            <p className="d-eyebrow text-gold">{TOPICS[lead.topic].name} · Featured</p>
            <h2 className="d-h2">{lead.title}</h2>
          </div>
          <div className="flex flex-col justify-center gap-3 p-5 sm:gap-4 sm:p-8 md:p-10">
            <p className="d-lead text-ink-2">{lead.description}</p>
            <p className="d-caption text-muted">{date(lead.date)} · {lead.minutes} min read</p>
            <span className="inline-flex items-center gap-1.5 font-semibold text-green-700 group-hover:underline">Read the article<Icon name="chev-r" size={16} /></span>
          </div>
        </Link>

        {topics.map((t) => {
          const list = rest.filter((p) => p.topic === t);
          const all = t === lead.topic ? [lead, ...list] : list;
          if (!all.length) return null;
          return (
            <section key={t} id={t} aria-labelledby={`${t}-h`} className="flex scroll-mt-24 flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h2 id={`${t}-h`} className="d-h3">{TOPICS[t].name}</h2><p className="text-muted">{TOPICS[t].blurb}</p></div>
                {t === "pharmacies" && <Link href="/pharmacy-partner" className="inline-flex min-h-11 items-center font-semibold text-green-700 hover:underline sm:min-h-0">Become a MedMate partner</Link>}
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{all.map((p) => <PostCard key={p.slug} p={p} />)}</div>
            </section>
          );
        })}

        <section className="tint-zone flex flex-col items-center gap-4 rounded-3xl px-5 py-10 text-center ring-1 ring-mint-200 sm:rounded-[32px] sm:px-6 sm:py-12">
          <h2 className="d-h2">Medicines from pharmacies near you, <span className="text-green">in minutes</span></h2>
          <GetAppLink from="blog-index">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
        </section>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "MedMate blog",
        url: `${SITE_URL}/blog`,
        publisher: { "@id": `${SITE_URL}/#org` },
        blogPost: POSTS.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE_URL}/blog/${p.slug}`, datePublished: p.date })),
      }} />
    </main>
  );
}

function PostCard({ p }: { p: Post }) {
  return (
    <Link href={`/blog/${p.slug}`} className="lift group flex flex-col gap-2.5 rounded-2xl border border-line p-5 sm:gap-3 sm:p-6">
      <p className="d-eyebrow text-green-700">{TOPICS[p.topic].name}</p>
      <h3 className="d-h3 group-hover:text-green-700">{p.title}</h3>
      <p className="line-clamp-3 text-ink-2">{p.description}</p>
      <p className="d-caption mt-auto pt-2 text-muted">{date(p.date)} · {p.minutes} min read</p>
    </Link>
  );
}
