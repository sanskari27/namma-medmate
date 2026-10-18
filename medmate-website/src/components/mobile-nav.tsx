"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LangToggle, T } from "./lang";
import { GetAppLink, Icon } from "./ui";

type Props = { nav: [string, string][] };

const MORE: [string, string, string][] = [
  ["search", "Search medicines", "/search"],
  ["pin", "Bengaluru areas", "/bengaluru"],
  ["rx-doc", "Upload a prescription", "/upload-prescription"],
  ["chat", "Contact us", "/contact"],
];

/** Phone menu: a full-width sheet under the header. Closes on navigation, Escape or a tap outside. */
export function MobileNav({ nav }: Props) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button" aria-label={open ? "Close menu" : "Menu"} aria-expanded={open} aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className={`press flex size-11 items-center justify-center rounded-xl border text-ink-2 ${open ? "border-forest bg-forest text-white" : "border-line"}`}
      >
        {open ? <Icon name="x" size={20} /> : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        )}
      </button>
      {open && (
        <div id="mobile-nav" className="anim-fade fixed inset-x-0 bottom-0 top-16 z-40 bg-ink/40" onClick={() => setOpen(false)}>
          <nav aria-label="Mobile" onClick={(e) => { if ((e.target as HTMLElement).closest("[data-get-app]")) setOpen(false); else e.stopPropagation(); }} className="anim-rise flex max-h-full flex-col overflow-y-auto rounded-b-3xl bg-surface px-4 pb-5 pt-2 shadow-sh3">
            <ul className="flex flex-col">
              {nav.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-[17px] font-semibold ${path === href ? "bg-mint-50 text-green-700" : "text-ink"}`}>
                    {label}<Icon name="chev-r" size={18} className="text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="my-2 border-t border-line" />
            <ul className="grid grid-cols-2 gap-2">
              {MORE.map(([ic, label, href]) => (
                <li key={href}>
                  <Link href={href} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-3 text-[14px] font-semibold text-ink-2">
                    <Icon name={ic} size={16} className="text-green-700" />{label}
                  </Link>
                </li>
              ))}
            </ul>
            <GetAppLink from="menu" className="mt-4 w-full"><Icon name="star" size={18} fill /><T k="premium.cta" /></GetAppLink>
            <div className="mt-3 flex items-center justify-between gap-3"><p className="d-caption text-muted"><T k="hero.badge" /></p><LangToggle /></div>
          </nav>
        </div>
      )}
    </div>
  );
}
