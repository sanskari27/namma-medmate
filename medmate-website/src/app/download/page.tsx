import { DownloadRedirect } from "@/components/download-client";
import { Container, Icon, Phone, Qr, StoreButtons, StoreLine, Wordmark } from "@/components/ui";
import { WaitlistForm } from "@/components/waitlist";
import { qrSvg } from "@/lib/qr";
import { APP_URL, IOS_URL, LAUNCHED, PLAY_URL, downloadUrl, mailHref, pageMeta, whatsappHref } from "@/lib/site";

export const metadata = pageMeta({
  title: LAUNCHED ? "Download the MedMate app" : "MedMate app: launching soon in Bengaluru",
  description: LAUNCHED
    ? "Get MedMate on your phone: order medicines from licensed pharmacies near you in Bengaluru, upload a prescription and track your rider live."
    : "MedMate is launching soon in Bengaluru. Join the waitlist and we will message you when pharmacies near you go live.",
  path: "/download",
});

export default async function Download() {
  const link = downloadUrl("download-page");
  const qr = await qrSvg(link);
  return (
    <main>
      {/* Phones are forwarded to the store or the app only after launch (compliance review C3). */}
      {LAUNCHED && <DownloadRedirect appUrl={APP_URL} playUrl={PLAY_URL} iosUrl={IOS_URL} />}
      <section className="brand-zone overflow-hidden text-white">
        <Container className="grid items-center gap-10 py-10 sm:gap-12 sm:py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="flex flex-col gap-5 sm:gap-6">
            <Wordmark size={36} dark tagline />
            <p className="d-eyebrow text-gold">Launching soon in Bengaluru</p>
            <h1 className="d-hero">Be first when MedMate <span className="text-gold">goes live</span></h1>
            <p className="d-lead max-w-[540px] text-mint-200">Medicines from licensed pharmacies near you, with prices compared and delivery tracked. Leave your number and pincode, and we will message you when MedMate starts in your area.</p>
            <div className="max-w-[520px]"><WaitlistForm source="download-page" dark /></div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="hidden items-center gap-3 lg:flex">
                <Qr svg={qr} size={96} className="!ring-0" />
                <p className="max-w-[150px] text-sm text-mint-200">Or scan to join on your phone</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <a href={whatsappHref(link)} target="_blank" rel="noopener" className="press d-caption inline-flex h-10 items-center gap-2 rounded-xl px-3 font-semibold text-white ring-1 ring-white/30 hover:bg-white/10"><Icon name="chat" size={16} />WhatsApp</a>
                  <a href={mailHref(link)} className="press d-caption inline-flex h-10 items-center gap-2 rounded-xl px-3 font-semibold text-white ring-1 ring-white/30 hover:bg-white/10"><Icon name="share" size={16} />Email</a>
                </div>
                <StoreButtons dark from="download-page" />
                <StoreLine dark />
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Phone src="/screens/home.webp" alt="Preview of the MedMate app home screen" width={300} priority />
          </div>
        </Container>
      </section>
      {LAUNCHED && (
        <Container className="pt-10">
          <section aria-labelledby="install-h" className="flex flex-col gap-3 rounded-2xl border border-line p-5">
            <h2 id="install-h" className="d-h3">Add MedMate to your home screen</h2>
            <p className="text-ink-2">Until the store listings are up, the web app installs like an app:</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] text-ink-2 marker:font-bold marker:text-green">
              <li><strong className="text-ink">Android (Chrome):</strong> open <a href={APP_URL} className="font-semibold text-green-700 underline">the MedMate app</a>, tap the ⋮ menu, then <strong className="text-ink">Add to Home screen</strong>.</li>
              <li><strong className="text-ink">iPhone (Safari):</strong> open the app, tap Share, then <strong className="text-ink">Add to Home Screen</strong>.</li>
            </ol>
          </section>
        </Container>
      )}
      <Container className="py-10">
        <p className="d-caption flex items-start gap-2 rounded-2xl bg-mint-50 p-4 text-ink-2 ring-1 ring-mint-200">
          <Icon name="info" size={16} className="mt-px shrink-0 text-green-700" />
          The screens shown are a preview of the app in development. MedMate is not taking orders yet; when it launches, medicines will be sold and dispensed by licensed partner pharmacies.
        </p>
      </Container>
    </main>
  );
}
