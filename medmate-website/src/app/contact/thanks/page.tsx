import Link from "next/link";
import { Container, Icon } from "@/components/ui";
import { pageMeta } from "@/lib/site";

export const metadata = { ...pageMeta({ title: "Message received", description: "We have your message and will reply soon.", path: "/contact/thanks" }), robots: { index: false, follow: true } };

export default function ContactThanks() {
  return (
    <main>
      <Container className="flex flex-col items-center gap-5 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-mint-100 text-green-700"><Icon name="check" size={32} /></span>
        <h1 className="d-h1">We have your <span className="text-green">message</span></h1>
        <p className="d-lead max-w-[560px] text-ink-2">Thank you for writing to us. Complaints are acknowledged within 48 hours, and we aim to resolve them within one month.</p>
        <Link href="/" className="press d-btn inline-flex h-12 items-center rounded-xl bg-green px-5 text-white hover:bg-green-700">Back to home</Link>
      </Container>
    </main>
  );
}
