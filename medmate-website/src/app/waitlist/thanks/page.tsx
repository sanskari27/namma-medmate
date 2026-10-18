import Link from "next/link";
import { Container, Icon } from "@/components/ui";
import { ThanksStatus } from "@/components/thanks-status";
import { FREE_MONTHS, MONTHLY_CAP } from "@/lib/premium";
import { PINCODES, areasForPin } from "@/lib/areas";
import { SITE_URL, pageMeta } from "@/lib/site";

export const metadata = { ...pageMeta({ title: "You are on the MedMate waitlist", description: "We will message you when MedMate launches in your area.", path: "/waitlist/thanks" }), robots: { index: false, follow: true } };

export default function WaitlistThanks() {
  const data = Object.fromEntries(Object.keys(PINCODES).map((p) => { const a = areasForPin(p)[0]; return [p, a ? { area: a.name, slug: a.slug } : null]; }));
  return (
    <main>
      <Container className="flex flex-col items-center gap-5 py-14 text-center sm:py-24">
        <span className="flex size-16 items-center justify-center rounded-full bg-mint-100 text-green-700"><Icon name="check" size={32} /></span>
        <h1 className="d-h1">You are on the <span className="text-green">waitlist</span></h1>
        <p className="d-lead max-w-[560px] text-ink-2">Thank you. We will message you on the number you gave as soon as MedMate starts delivering in your area. Until then, our health guides are a good read.</p>
        <div className="flex w-full max-w-[520px] items-start gap-3 rounded-2xl bg-gold-50 p-4 text-left ring-1 ring-gold-100">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold text-forest"><Icon name="star" size={20} fill /></span>
          <span className="flex flex-col gap-1">
            <span className="text-[17px] font-bold leading-6">MedMate Premium is reserved for your number</span>
            <span className="text-[15px] leading-6 text-ink-2">Free for {FREE_MONTHS} months from launch day, the day we go live in your area: free Standard and Express delivery, no handling charge and priority support, for up to {MONTHLY_CAP} orders a month. No card needed. <Link href="/premium#terms" className="font-semibold text-green-700 underline underline-offset-2">Offer terms</Link></span>
          </span>
        </div>
        <ThanksStatus data={data} shareUrl={`${SITE_URL}/?from=share`} />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/blog" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl border-[1.5px] border-green px-5 text-green hover:bg-mint-50 max-sm:w-full">Read the health guides</Link>
          <Link href="/" className="press d-btn inline-flex h-12 items-center justify-center rounded-xl px-5 text-green-700 hover:bg-mint-50 max-sm:w-full">Back to home</Link>
        </div>
      </Container>
    </main>
  );
}
