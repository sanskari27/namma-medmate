"use client";

import { downloadHref } from "@/lib/site";
import { useT } from "./lang";
import { Icon } from "./ui";

/**
 * "MedMate Premium free for 3 months" line shown with every waitlist form and button.
 * `full` adds the one-line summary of what is included; `dark` is for green backgrounds.
 */
export function PremiumNote({ dark = false, full = true, className = "" }: { dark?: boolean; full?: boolean; className?: string }) {
  const t = useT();
  return (
    <div className={`flex items-start gap-3 rounded-2xl p-3.5 ${dark ? "bg-white/10 ring-1 ring-gold/40" : "bg-gold-50 ring-1 ring-gold-100"} ${className}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold text-forest"><Icon name="star" size={18} fill /></span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`d-eyebrow ${dark ? "text-gold" : "text-gold-ink"}`}>{t("premium.badge")}</span>
        <span className={`text-[16px] font-bold leading-6 ${dark ? "text-white" : "text-ink"}`}>{t("premium.title")}</span>
        {full && <span className={`text-[14px] leading-5 ${dark ? "text-mint-200" : "text-ink-2"}`}>{t("premium.sub")}</span>}
        <a href="/premium" className={`d-caption -my-3 inline-flex min-h-11 w-fit items-center font-semibold underline underline-offset-2 ${dark ? "text-white" : "text-green-700"}`}>{t("premium.link")}</a>
      </span>
    </div>
  );
}

/** Join today → we launch in your area → 3 months free from that day. For gold backgrounds. */
export function PremiumSteps({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <ol aria-label={t("premium.steps")} className={`grid grid-cols-3 gap-1.5 ${className}`}>
      {(["premium.s1", "premium.s2", "premium.s3"] as const).map((k, i) => (
        <li key={k} className={`flex flex-col gap-1 rounded-xl p-2 sm:flex-row sm:items-center sm:gap-2 sm:py-1.5 ${i === 2 ? "bg-forest text-white" : "bg-white/45 text-forest"}`}>
          <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${i === 2 ? "bg-gold text-forest" : "bg-forest text-gold"}`}>{i + 1}</span>
          <span className="text-[13px] font-semibold leading-4">{t(k)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Bold gold version for the top of the home page, so the offer is seen without scrolling. */
export function PremiumHero({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <div data-waitlist className={`flex items-start gap-3 rounded-2xl bg-gold p-4 text-forest shadow-sh3 sm:gap-4 sm:p-5 lg:p-4 ${className}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forest text-gold sm:size-11"><Icon name="star" size={20} fill /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="d-eyebrow text-forest/75">{t("premium.badge")}</span>
        <span className="text-[18px] font-bold leading-6 sm:text-[20px] sm:leading-7 lg:text-[18px] lg:leading-6">{t("premium.title")}</span>
        <span className="text-[14px] leading-5 text-forest/85 sm:text-[15px] sm:leading-6">{t("premium.short")}</span>
        <PremiumSteps className="mt-1.5" />
        <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href={downloadHref("hero-offer")} data-get-app="hero-offer" className="press d-btn inline-flex h-10 items-center gap-1.5 rounded-xl bg-forest px-4 text-[14px] text-white hover:bg-green-700">{t("premium.cta")}<Icon name="chev-r" size={16} /></a>
          <a href="/premium" className="d-caption inline-flex min-h-11 items-center font-semibold text-forest underline underline-offset-2">{t("premium.link")}</a>
        </span>
      </span>
    </div>
  );
}
