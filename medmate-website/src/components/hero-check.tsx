"use client";

import { useT } from "./lang";
import { PremiumSteps } from "./premium-note";
import { GetAppLink, Icon } from "./ui";

/**
 * Phone hero: the waitlist offer and one button. The button opens the waitlist form as a bottom sheet
 * (see GetAppDialog), so the form is only on screen once the visitor asks for it; without JavaScript it opens /download.
 * data-waitlist keeps the sticky bottom bar hidden while this card is on screen.
 */
export function HeroCheck() {
  const t = useT();
  return (
    <div data-waitlist className="overflow-hidden rounded-3xl bg-surface text-ink shadow-sh3">
      <div className="flex flex-col gap-3 bg-gold px-4 py-3.5 text-forest">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forest text-gold"><Icon name="star" size={20} fill /></span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="d-eyebrow text-forest/80">{t("premium.badge")}</span>
            <span className="text-[18px] font-bold leading-6">{t("premium.title")}</span>
            <span className="text-[14px] leading-5 text-forest/85">{t("premium.short")}</span>
          </span>
        </div>
        <PremiumSteps />
      </div>
      <div className="flex flex-col gap-1 p-4 pb-2">
        <GetAppLink from="hero-phone" className="w-full"><Icon name="star" size={18} fill />{t("premium.cta")}</GetAppLink>
        <a href="/premium" className="d-caption inline-flex min-h-11 items-center self-center px-3 font-semibold text-green-700 underline underline-offset-2">{t("premium.link")}</a>
      </div>
    </div>
  );
}
