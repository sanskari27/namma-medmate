import { Breadcrumbs, Container, Heading, Icon } from "@/components/ui";
import { CIN, COMPANY, GRIEVANCE_OFFICER, REGISTERED_OFFICE, SITE_URL, SUPPORT, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Contact MedMate and raise a complaint",
  description: "Contact MedMate, raise a complaint or grievance, or make a privacy request. Company details, response times and how to escalate to the National Consumer Helpline.",
  path: "/contact",
});

const field = "h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-surface px-3.5 text-[16px] outline-none placeholder:text-faint focus:border-green focus:ring-[3px] focus:ring-mint-200";

export default function Contact() {
  const officer = GRIEVANCE_OFFICER.name ? GRIEVANCE_OFFICER : null;
  const company: [string, string][] = [
    ["Legal name", COMPANY],
    ["Registered office", REGISTERED_OFFICE],
    ...(CIN ? [["CIN", CIN] as [string, string]] : []),
    ...(SUPPORT.email ? [["Customer support email", SUPPORT.email] as [string, string]] : []),
    ...(SUPPORT.phone ? [["Customer support phone", SUPPORT.phone] as [string, string]] : []),
  ];
  return (
    <main>
      <section className="border-b border-line bg-mint-50">
        <Container className="flex flex-col gap-5 py-8 sm:gap-6 sm:py-12">
          <Breadcrumbs base={SITE_URL} items={[["Home", "/"], ["Contact and grievances", "/contact"]]} />
          <Heading as="h1" title="Contact us and" accent="grievances" lead="Questions, complaints, pharmacy enquiries and privacy requests all come to the same team. Use the form below and choose what it is about." />
        </Container>
      </section>

      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="company-h" className="flex flex-col gap-3">
            <h2 id="company-h" className="d-h3">Company</h2>
            <dl className="divide-y divide-line rounded-2xl border border-line">
              {company.map(([k, v]) => <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[170px_1fr]"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </section>

          <section aria-labelledby="grievance-h" className="flex flex-col gap-3">
            <h2 id="grievance-h" className="d-h3">Grievance officer</h2>
            {officer ? (
              <dl className="divide-y divide-line rounded-2xl border border-line">
                {[["Name", officer.name], ["Designation", officer.designation], ["Email", officer.email], ["Phone", officer.phone]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[170px_1fr]"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>)}
              </dl>
            ) : (
              <p className="text-ink-2">Complaints sent with this form go to our grievance officer. Choose “Complaint or grievance” as the topic.</p>
            )}
            <ul className="flex flex-col gap-2 text-ink-2">
              <li className="flex gap-2"><Icon name="clock" size={18} className="mt-0.5 shrink-0 text-green-700" />We acknowledge every complaint within 48 hours and aim to resolve it within one month.</li>
              <li className="flex gap-2"><Icon name="shield" size={18} className="mt-0.5 shrink-0 text-green-700" />For privacy requests (access, correction, deletion, withdrawing consent), choose “Privacy request”.</li>
              <li className="flex gap-2"><Icon name="info" size={18} className="mt-0.5 shrink-0 text-green-700" /><span>Not satisfied? You can contact the National Consumer Helpline on <strong className="text-ink">1915</strong> or at <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener" className="font-semibold text-green-700 underline">consumerhelpline.gov.in</a>, or file a consumer complaint at <a href="https://edaakhil.nic.in" target="_blank" rel="noopener" className="font-semibold text-green-700 underline">e-Daakhil</a>.</span></li>
            </ul>
          </section>

          <p className="rounded-2xl bg-gold-50 p-4 text-[15px] text-gold-ink ring-1 ring-gold-100"><strong>Medical emergency?</strong> Do not use this form. Call 112 or go to the nearest hospital.</p>
        </div>

        <section aria-labelledby="form-h" className="flex flex-col gap-4 rounded-3xl border border-line p-4 shadow-sh2 sm:rounded-[28px] sm:p-6 md:p-8">
          <h2 id="form-h" className="d-h3">Write to us</h2>
          <form name="contact" method="POST" action="/contact/thanks" data-netlify="true" netlify-honeypot="company-website" className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="form-name" value="contact" />
            <p className="hidden"><label>Leave this empty <input name="company-website" tabIndex={-1} autoComplete="off" /></label></p>
            <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="d-caption font-semibold text-ink-2">Topic</span>
              <select name="topic" required defaultValue="" className={field}>
                <option value="" disabled>Choose one</option>
                <option>Question</option>
                <option>Complaint or grievance</option>
                <option>Privacy request</option>
                <option>Pharmacy partnership</option>
                <option>Press or other</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Your name</span><input name="name" required autoComplete="name" className={field} /></label>
            <label className="flex flex-col gap-1.5"><span className="d-caption font-semibold text-ink-2">Mobile number</span><input name="phone" required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} title="10-digit Indian mobile number" autoComplete="tel-national" className={field} /></label>
            <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="d-caption font-semibold text-ink-2">Email <span className="font-normal text-muted">(optional)</span></span><input name="email" type="email" autoComplete="email" className={field} /></label>
            <label className="flex flex-col gap-1.5 sm:col-span-2"><span className="d-caption font-semibold text-ink-2">Your message</span><textarea name="message" required rows={5} maxLength={2000} className="w-full rounded-xl border-[1.5px] border-line-2 bg-surface p-3.5 text-[16px] outline-none focus:border-green focus:ring-[3px] focus:ring-mint-200" /></label>
            <p className="d-caption text-muted sm:col-span-2">Please do not send prescriptions or medical reports here.</p>
            <label className="flex items-start gap-2.5 sm:col-span-2"><input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--color-green)]" /><span className="d-caption text-ink-2">MedMate may use these details to reply to me. I have read the <a href="/privacy" className="font-semibold text-green-700 underline">privacy notice</a>.</span></label>
            <button type="submit" className="press d-btn h-12 rounded-xl bg-green px-5 text-white hover:bg-green-700 sm:col-span-2">Send</button>
          </form>
        </section>
      </Container>
    </main>
  );
}
