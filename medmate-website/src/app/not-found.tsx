import Link from "next/link";
import { Container, GetAppLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main>
      <Container className="flex flex-col items-center gap-5 py-16 text-center sm:py-24">
        <p className="d-eyebrow text-green-700">Page not found</p>
        <h1 className="d-h1">We couldn’t find that <span className="text-green">page</span></h1>
        <p className="d-lead max-w-[520px] text-ink-2">Search for a medicine, browse categories, or open the app to order.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/search" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl border-[1.5px] border-green px-5 text-green hover:bg-mint-50 max-sm:w-full">Search medicines</Link>
          <GetAppLink from="404">Join the waitlist</GetAppLink>
        </div>
      </Container>
    </main>
  );
}
