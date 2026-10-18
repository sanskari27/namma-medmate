import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { Rich } from "./rich";
import { Breadcrumbs, Container } from "./ui";

/** Layout for the website privacy notice and terms of use. **bold** and [link](/path) allowed in text. */
export function LegalPage({ title, path, updated, sections }: { title: string; path: string; updated: string; sections: { h: string; p?: string[]; ul?: string[] }[] }) {
  return (
    <main>
      <Container className="flex max-w-[860px] flex-col gap-5 py-8 sm:gap-6 sm:py-12">
        <Breadcrumbs base={SITE_URL} items={[["Home", "/"], [title, path]]} />
        <h1 className="d-h1">{title}</h1>
        <p className="d-caption text-muted">Last updated {updated}</p>
        <div className="prose-mm">
          {sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.p?.map((t) => <p key={t}><Rich text={t} /></p>)}
              {s.ul && <ul>{s.ul.map((t) => <li key={t}><Rich text={t} /></li>)}</ul>}
            </section>
          ))}
          <h2>Contact</h2>
          <p>For questions, privacy requests or complaints, use our <Link href="/contact">contact and grievances page</Link>.</p>
        </div>
      </Container>
    </main>
  );
}
