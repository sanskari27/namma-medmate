import Link from "next/link";
import { Container, Icon } from "@/components/ui";
import { pageMeta } from "@/lib/site";

export const metadata = { ...pageMeta({ title: "Thanks for booking a demo", description: "Our partner team will contact you to book your free demo.", path: "/pharmacy-partner/thanks" }), robots: { index: false, follow: true } };

export default function Thanks() {
  return (
    <main>
      <Container className="flex flex-col items-center gap-5 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-mint-100 text-green-700"><Icon name="check" size={32} /></span>
        <h1 className="d-h1">Thanks, we have your <span className="text-green">details</span></h1>
        <p className="d-lead max-w-[560px] text-ink-2">Our partner team will message you on WhatsApp to book your free 20-minute demo. Keep your drug licence and GST details handy; most pharmacies are live in about 7 days.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/blog/documents-to-list-pharmacy-online" className="press d-btn inline-flex h-12 items-center rounded-xl bg-green px-5 text-white hover:bg-green-700">See the document checklist</Link>
          <Link href="/" className="press d-btn inline-flex h-12 items-center rounded-xl border-[1.5px] border-green px-5 text-green hover:bg-mint-50">Back to home</Link>
        </div>
      </Container>
    </main>
  );
}
