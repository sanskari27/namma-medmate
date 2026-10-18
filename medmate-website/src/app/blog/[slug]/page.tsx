import Link from "next/link";
import { notFound } from "next/navigation";
import { Rich, plainText } from "@/components/rich";
import { Breadcrumbs, Container, Faq, GetAppLink, Icon, JsonLd, Qr } from "@/components/ui";
import { POSTS, TOPICS, anchor, postBySlug, related } from "@/lib/blog";
import { qrSvg } from "@/lib/qr";
import { COMPANY, LAUNCHED, SITE_URL, downloadUrl, pageMeta } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  const meta = pageMeta({ title: post.title, description: post.description, path: `/blog/${post.slug}`, type: "article" });
  return {
    ...meta,
    keywords: post.keywords,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: post.date, modifiedTime: post.updated ?? post.date, section: TOPICS[post.topic].name, tags: post.keywords },
  };
}

const longDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function PostPage({ params }: Props) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const url = `${SITE_URL}/blog/${post.slug}`;
  const forPharmacies = post.cta === "partner";
  const from = `blog-${post.slug.slice(0, 24)}`;
  const to = post.cta === "partner" ? undefined : post.cta.to;
  const qr = await qrSvg(forPharmacies ? `${SITE_URL}/pharmacy-partner?from=${from}` : downloadUrl(from, to));
  const toc = post.body.filter((b) => b.h).map((b) => b.h!);
  const more = related(post);
  const share = encodeURIComponent(`${post.title} ${url}`);

  return (
    <main>
      <Container className="grid grid-cols-[minmax(0,1fr)] gap-10 py-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <article className="flex max-w-[720px] flex-col gap-5 sm:gap-6">
          <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Blog", "/blog"], [post.title, `/blog/${post.slug}`]]} />
          <Link href={`/blog#${post.topic}`} className="d-eyebrow w-fit text-green-700 hover:underline">{TOPICS[post.topic].name}</Link>
          <h1 className="d-h1">{post.title}</h1>
          <p className="d-lead text-ink-2">{post.description}</p>
          <p className="d-caption flex flex-wrap items-center gap-x-2 text-muted">
            <span>By the MedMate team</span><span aria-hidden>·</span>
            {post.reviewedBy && <><span>Reviewed by {post.reviewedBy}</span><span aria-hidden>·</span></>}
            <span>{post.updated ? <>Updated <time dateTime={post.updated}>{longDate(post.updated)}</time></> : <time dateTime={post.date}>{longDate(post.date)}</time>}</span><span aria-hidden>·</span>
            <span>{post.minutes} min read</span>
          </p>

          <section id="quick-answer" aria-label="Quick answer" className="rounded-2xl border-l-4 border-gold bg-gold-50 p-4 sm:p-5">
            <p className="d-eyebrow mb-1.5 text-gold-ink">Quick answer</p>
            <p className="text-[16px] leading-6 text-ink sm:text-[17px] sm:leading-7">{post.answer}</p>
          </section>

          {toc.length > 2 && (
            <nav aria-label="In this article" className="rounded-2xl bg-mint-50 p-5 ring-1 ring-mint-200">
              <p className="d-eyebrow mb-2 text-green-700">In this article</p>
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-[15px] marker:text-green">
                {toc.map((h) => <li key={h}><a href={`#${anchor(h)}`} className="text-ink-2 hover:text-green-700">{h.replace(/^\d+\.\s*/, "")}</a></li>)}
              </ol>
            </nav>
          )}

          <div className="prose-mm">
            {post.body.map((b, i) => (
              <section key={i}>
                {b.h && <h2 id={anchor(b.h)} className="scroll-mt-24">{b.h}</h2>}
                {b.p?.map((t) => <p key={t}><Rich text={t} /></p>)}
                {b.ul && <ul>{b.ul.map((t) => <li key={t}><Rich text={t} /></li>)}</ul>}
              </section>
            ))}
          </div>

          {post.sources && post.sources.length > 0 && (
            <section aria-labelledby="sources" className="rounded-2xl bg-surface-2 p-5">
              <h2 id="sources" className="d-eyebrow mb-2 text-muted">Sources and further reading</h2>
              <ul className="flex flex-col gap-1 text-[15px]">
                {post.sources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noopener" className="font-semibold text-green-700 underline underline-offset-2">{label}</a></li>)}
              </ul>
            </section>
          )}

          {post.faq && (
            <section aria-labelledby="faq" className="flex flex-col gap-4 pt-4">
              <h2 id="faq" className="d-h3">Questions</h2>
              <Faq items={post.faq} />
            </section>
          )}

          {post.cta === "partner" ? (
            <div className="brand-zone flex flex-col items-start gap-4 rounded-3xl p-5 text-white sm:p-7">
              <p className="d-eyebrow text-gold">MedMate for pharmacies</p>
              <h2 className="d-h3">Turn your counter into a 10-minute pharmacy</h2>
              <p className="text-mint-200">One console for billing, inventory, prescriptions and credit, with your online store and delivery launching soon. From ₹299 a month, first 3 months free.</p>
              <Link href="/pharmacy-partner#register" className="press d-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-forest hover:bg-gold-200 max-sm:w-full">Book a free demo<Icon name="chev-r" size={18} /></Link>
            </div>
          ) : (
            <div className="brand-zone flex flex-col items-start gap-4 rounded-3xl p-5 text-white sm:p-7">
              <h2 className="d-h3">{LAUNCHED ? post.cta.title : "MedMate is launching soon in Bengaluru"}</h2>
              <p className="text-mint-200">{LAUNCHED ? post.cta.text : "Medicines from licensed pharmacies near you, with prices compared and delivery tracked. Join the waitlist to be first."}</p>
              <GetAppLink from={from} to={to} variant="gold">Join the waitlist<Icon name="chev-r" size={18} /></GetAppLink>
            </div>
          )}

          <div className="pill-list flex flex-wrap items-center gap-2 border-t border-line pt-6">
            <span className="d-caption mr-1 font-semibold text-muted">Share</span>
            {[
              ["WhatsApp", `https://wa.me/?text=${share}`],
              ["X", `https://x.com/intent/post?text=${share}`],
              ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
              ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
            ].map(([name, href]) => (
              <a key={name} href={href} target="_blank" rel="noopener" className="d-caption rounded-full border border-line px-3.5 py-1.5 font-semibold text-ink-2 hover:border-green hover:text-green">{name}</a>
            ))}
          </div>
        </article>

        <aside className="flex flex-col gap-6">
          <div className="sticky top-24 flex flex-col gap-6">
            <div className="hidden flex-col items-center gap-3 rounded-3xl border border-line p-6 text-center shadow-sh1 lg:flex">
              <Qr svg={qr} size={132} className="!shadow-none" />
              <p className="font-semibold">{forPharmacies ? "Become a MedMate partner" : "Launching soon in Bengaluru"}</p>
              <p className="d-caption text-muted">{forPharmacies ? "Scan to open the partner page on your phone." : "Scan to join the MedMate waitlist on your phone."}</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="d-eyebrow text-muted">Keep reading</p>
              {more.map((m) => (
                <Link key={m.slug} href={`/blog/${m.slug}`} className="flex flex-col gap-1 rounded-2xl border border-line p-4 hover:border-green">
                  <span className="d-caption text-green-700">{TOPICS[m.topic].name}</span>
                  <span className="font-semibold leading-5">{m.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </Container>

      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        abstract: post.answer,
        keywords: post.keywords.join(", "),
        isAccessibleForFree: true,
        ...(post.sources?.length ? { citation: post.sources.map(([name, u]) => ({ "@type": "CreativeWork", name, url: u })) } : {}),
        articleSection: TOPICS[post.topic].name,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        inLanguage: "en-IN",
        wordCount: post.body.flatMap((b) => [...(b.p ?? []), ...(b.ul ?? [])]).map(plainText).join(" ").split(/\s+/).length,
        mainEntityOfPage: url,
        url,
        image: `${SITE_URL}/og.png`,
        author: { "@type": "Organization", name: "MedMate", url: SITE_URL },
        publisher: { "@type": "Organization", name: COMPANY, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` } },
      }} />
    </main>
  );
}
