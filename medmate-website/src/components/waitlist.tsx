"use client";

// Waitlist sign-up. Posts to the Spring API, then the thank-you page. Used in the phone hero, on Home,
// /download, /premium and inside the "get the app" dialog.
import { useState, type FormEvent } from "react";
import { useLang, useT } from "./lang";
import { PremiumNote } from "./premium-note";
import { Icon } from "./ui";
import { OFFER_ID } from "@/lib/premium";
import { API_BASE_URL } from "@/lib/site";

type Props = { source: string; dark?: boolean; compact?: boolean; note?: boolean; claim?: boolean };

/** Remembered in this tab only, for the thank-you page (area status, share link). Never sent anywhere else. */
export const rememberSignup = (pincode: string, lang: string) => { try { sessionStorage.setItem("mm-signup", JSON.stringify({ pincode, lang })); } catch { /* storage blocked */ } };

/** Gender values are stored in English whatever the page language; labels are translated. */
const GENDERS = [["female", "g.female"], ["male", "g.male"], ["other", "g.other"], ["prefer-not-to-say", "g.na"]] as const;

export function WaitlistForm({ source, dark, compact, note = true, claim }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const field = `h-12 w-full rounded-xl border-[1.5px] px-3.5 text-[16px] outline-none focus:ring-[3px] ${dark ? "border-white/30 bg-white/10 text-white placeholder:text-mint-300 focus:border-gold focus:ring-gold/30" : "border-line-2 bg-surface text-ink placeholder:text-faint focus:border-green focus:ring-mint-200"}`;
  const label = `d-caption font-semibold ${dark ? "text-mint-200" : "text-ink-2"}`;
  const wide = compact ? "" : "sm:col-span-2";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const honeypot = String(data.get("company-website") ?? "");
    if (honeypot.trim()) {
      rememberSignup(String(data.get("pincode") ?? ""), lang);
      window.location.assign("/waitlist/thanks");
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
          pincode: String(data.get("pincode") ?? "").trim(),
          age: Number(data.get("age")),
          gender: String(data.get("gender") ?? ""),
          consent: data.get("consent") === "on",
          source,
          lang,
          offer: OFFER_ID,
          companyWebsite: honeypot,
        }),
      });
      if (!res.ok) throw new Error("waitlist");
      rememberSignup(String(data.get("pincode") ?? ""), lang);
      window.location.assign("/waitlist/thanks");
    } catch {
      setPending(false);
      setError(t("wait.error"));
    }
  }

  return (
    <form name="waitlist" data-waitlist onSubmit={onSubmit} className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="offer" value={OFFER_ID} />
      {note && <PremiumNote dark={dark} full={!compact} className={wide} />}
      <p className="hidden"><label>Leave this empty <input name="company-website" tabIndex={-1} autoComplete="off" /></label></p>
      <label className="flex flex-col gap-1.5"><span className={label}>{t("wait.name")}</span><input name="name" required autoComplete="name" className={field} /></label>
      <label className="flex flex-col gap-1.5"><span className={label}>{t("quick.phone")}</span><input name="phone" required type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} title="10-digit Indian mobile number" placeholder="98450 12345" autoComplete="tel-national" className={field} /></label>
      <label className="flex flex-col gap-1.5"><span className={label}>{t("wait.pincode")}</span><input name="pincode" required inputMode="numeric" pattern="5[0-9]{5}" maxLength={6} title="6-digit pincode" placeholder="560034" autoComplete="postal-code" className={field} /></label>
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
        <label className="flex flex-col gap-1.5"><span className={label}>{t("wait.age")}</span>
          <input name="age" required inputMode="numeric" pattern="(1[89]|[2-9][0-9]|1[01][0-9]|120)" maxLength={3} placeholder="18+" title={t("wait.age18")}
            onInvalid={(e) => e.currentTarget.setCustomValidity(t("wait.age18"))} onInput={(e) => e.currentTarget.setCustomValidity("")} className={field} />
        </label>
        <label className="flex flex-col gap-1.5"><span className={label}>{t("wait.gender")}</span>
          <span className="relative">
            <select name="gender" required defaultValue="" className={`${field} appearance-none pr-9 ${dark ? "invalid:text-mint-300" : "invalid:text-faint"} [&>option]:bg-surface [&>option]:text-ink`}>
              <option value="" disabled>{t("wait.select")}</option>
              {GENDERS.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </select>
            <Icon name="chev-d" size={18} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${dark ? "text-mint-200" : "text-muted"}`} />
          </span>
        </label>
      </div>
      <label className={`flex items-start gap-2.5 ${wide}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-green)]" />
        <span className={`d-caption ${dark ? "text-mint-200" : "text-ink-2"}`}>{t("quick.consent")} <a href="/privacy" className={`font-semibold underline ${dark ? "text-white" : "text-green-700"}`}>{t("wait.privacy")}</a>.</span>
      </label>
      {error ? <p role="alert" className={`d-caption ${wide} ${dark ? "text-gold" : "text-green-700"}`}>{error}</p> : null}
      <button type="submit" disabled={pending} className={`press d-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 ${wide} ${dark ? "bg-gold text-forest hover:bg-gold-200" : "bg-green text-white hover:bg-green-700"} disabled:opacity-60`}>
        {claim ? <><Icon name="star" size={18} fill />{t("premium.cta")}</> : t("wait.button")}
      </button>
    </form>
  );
}
