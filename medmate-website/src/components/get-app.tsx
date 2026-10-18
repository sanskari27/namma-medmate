"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { T, useT } from "./lang";
import { GetAppLink, Icon, Qr, StoreButtons, Wordmark } from "./ui";
import { WaitlistForm } from "./waitlist";
import { DeliveryScene } from "./delivery-scene";
import { LAUNCHED } from "@/lib/site";

type Props = { qr: string; whatsapp: string };

declare global {
  interface Window { dataLayer?: Record<string, unknown>[] }
}
/** Sends an event to a tag manager if one is installed; does nothing otherwise. */
const track = (event: string, data: Record<string, unknown> = {}) => window.dataLayer?.push({ event, ...data });

const isPhone = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const wantsSheet = () => isPhone() || matchMedia("(max-width: 767px)").matches;

/**
 * "Get the app" actions. Any link with data-get-app opens the dialog (QR code + waitlist form) on a computer.
 * On a phone, until launch, it opens the waitlist form as a bottom sheet instead; after launch the link goes on to /download.
 * Without JavaScript (or <dialog> support) the link simply opens /download, which has the same form.
 */
export function GetAppDialog({ qr, whatsapp }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const [from, setFrom] = useState("sheet");
  const t = useT();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("[data-get-app]");
      if (!a) return;
      track("get_app_click", { from: a.dataset.getApp });
      if (e.metaKey || e.ctrlKey) return;
      if (wantsSheet()) {
        const d = sheet.current;
        if (LAUNCHED || !d?.showModal) return;
        e.preventDefault();
        setFrom(a.dataset.getApp || "sheet");
        d.showModal();
        document.documentElement.style.overflow = "hidden";
        history.pushState({ ...history.state, mmSheet: true }, "");
        return;
      }
      e.preventDefault();
      ref.current?.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // The phone's back button closes the sheet; closing it any other way removes the history entry it added.
  useEffect(() => {
    const d = sheet.current;
    if (!d) return;
    let viaBack = false;
    const onPop = () => { if (d.open) { viaBack = true; d.close(); } };
    const onClose = () => {
      document.documentElement.style.overflow = "";
      if (!viaBack && history.state?.mmSheet) history.back();
      viaBack = false;
    };
    window.addEventListener("popstate", onPop);
    d.addEventListener("close", onClose);
    return () => { window.removeEventListener("popstate", onPop); d.removeEventListener("close", onClose); };
  }, []);

  return (
    <>
    <dialog
      ref={sheet}
      aria-labelledby="join-sheet-title"
      onClick={(e) => { if (e.target === sheet.current) sheet.current?.close(); }}
      className="anim-sheet mx-auto mb-0 mt-auto max-h-[92dvh] w-full max-w-[560px] overflow-y-auto overscroll-contain rounded-t-3xl bg-surface p-0 text-ink shadow-sh3 backdrop:bg-ink/50"
    >
      <div className="flex flex-col gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
        <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-line-2" />
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold text-forest"><Icon name="star" size={20} fill /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id="join-sheet-title" className="text-[20px] font-bold leading-7">{t("wait.button")}</h2>
            <p className="text-[14px] leading-5 text-ink-2">{t("sheet.sub")}</p>
          </div>
          <button type="button" aria-label={t("sheet.close")} onClick={() => sheet.current?.close()} className="press -mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:bg-line"><Icon name="x" size={18} /></button>
        </div>
        <WaitlistForm source={from} compact note={false} claim />
      </div>
    </dialog>
    <dialog
      ref={ref}
      aria-labelledby="get-app-title"
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(720px,calc(100vw-32px))] overflow-y-auto rounded-3xl bg-surface p-0 text-ink shadow-sh3 backdrop:bg-ink/50 open:anim-rise"
    >
      <div className="grid md:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-4 p-7">
          <Wordmark size={28} tagline />
          <h2 id="get-app-title" className="d-h2">MedMate is launching soon in <span className="text-green">Bengaluru</span></h2>
          <p className="text-ink-2">Join the waitlist and we will message you as soon as pharmacies near you go live on MedMate. Waitlist members get MedMate Premium free for 3 months from launch day.</p>
          <WaitlistForm source="dialog" compact />
          <StoreButtons from="dialog" />
        </div>
        <div className="brand-zone relative flex flex-col items-center justify-center gap-4 p-7 text-center text-white">
          <button type="button" aria-label="Close" onClick={() => ref.current?.close()} className="press absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="x" size={20} /></button>
          <Qr svg={qr} size={160} />
          <p className="font-semibold">Or scan to join on your phone</p>
          <a href={whatsapp} target="_blank" rel="noopener" onClick={() => track("get_app_whatsapp")} className="d-caption font-semibold text-mint-200 underline underline-offset-4">Send the link to my phone on WhatsApp</a>
        </div>
      </div>
    </dialog>
    </>
  );
}

/** Small QR card in the corner on large screens, shown after the visitor scrolls past the hero. */
export function FloatingApp({ qr }: { qr: string }) {
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    try { setClosed(sessionStorage.getItem("mm-float-closed") === "1"); } catch { setClosed(false); }
    const on = () => setShow(window.scrollY > 900);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  if (closed || !show || path.startsWith("/download") || path.startsWith("/pharmacy-partner")) return null;
  const close = () => { setClosed(true); try { sessionStorage.setItem("mm-float-closed", "1"); } catch { /* storage blocked */ } track("float_close"); };
  return (
    <aside aria-label="Get the app" style={{ bottom: "calc(var(--dock-h, 0px) + 24px)" }} className="anim-rise fixed right-6 z-40 hidden w-[320px] items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 shadow-sh3 transition-[bottom] duration-300 lg:flex">
      <Qr svg={qr} size={84} className="!p-1.5 !shadow-none" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-[15px] font-bold leading-5">Premium free for 3 months from launch</p>
        <p className="d-caption text-muted">Scan to join the MedMate waitlist on your phone.</p>
      </div>
      <button type="button" aria-label="Hide" onClick={close} className="press absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sh1 hover:text-ink"><Icon name="x" size={14} /></button>
    </aside>
  );
}

/**
 * Bottom of the screen. Two parts in one dock:
 * - the delivery scene (every screen size), from the first screen; it steps aside whenever a form or a waitlist
 *   card/button sits in the strip it would cover, so it never hides a call to action;
 * - the "Claim it" bar (below 1024px), once the visitor scrolls past the hero, hidden while any waitlist card or form
 *   is on screen.
 * The bar's X hides both; the scene has its own X while the bar is not showing. The dock height is published as
 * --dock-h so the desktop QR card (FloatingApp) sits above it.
 */
export function MobileCta() {
  const path = usePathname();
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [closed, setClosed] = useState(true);
  const [sceneClosed, setSceneClosed] = useState(true);
  const [ctaBlocked, setCtaBlocked] = useState(false);
  const [sceneBlocked, setSceneBlocked] = useState(false);
  const [vh, setVh] = useState(0);
  const [height, setHeight] = useState(0);
  const dock = useRef<HTMLElement>(null);

  useEffect(() => {
    try { setClosed(sessionStorage.getItem("mm-bar-closed") === "1"); setSceneClosed(sessionStorage.getItem("mm-scene-closed") === "1"); } catch { setClosed(false); setSceneClosed(false); }
    const on = () => setScrolled(window.scrollY > 560);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", onResize); };
  }, []);
  // The bar steps aside for any waitlist card or form on screen.
  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>("[data-waitlist]")];
    if (!targets.length || !("IntersectionObserver" in window)) { setCtaBlocked(false); return; }
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      setCtaBlocked(seen.size > 0);
    }, { rootMargin: "0px 0px -60px 0px" });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  // The scene steps aside only when a form or a waitlist card/button is inside the bottom strip it covers.
  useEffect(() => {
    if (!vh || !("IntersectionObserver" in window)) return;
    const targets = [...document.querySelectorAll<HTMLElement>("form, [data-waitlist]")].filter((el) => !el.closest("dialog"));
    if (!targets.length) { setSceneBlocked(false); return; }
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      setSceneBlocked(seen.size > 0);
    }, { rootMargin: `-${Math.max(0, vh - 96)}px 0px 0px 0px` });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path, vh]);

  const away = path.startsWith("/download") || path.endsWith("/thanks");
  const showCta = !closed && !away && scrolled && !ctaBlocked;
  const showScene = !closed && !away && !sceneClosed && !sceneBlocked;
  // Keep the page's last lines clear of the dock
  useEffect(() => {
    const el = dock.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [showCta, showScene]);
  useEffect(() => {
    const h = showCta || showScene ? height : 0;
    document.documentElement.style.setProperty("--dock-h", `${h}px`);
  }, [height, showCta, showScene]);

  if (!showCta && !showScene) return null;
  const partner = path.startsWith("/pharmacy-partner");
  const close = () => { setClosed(true); try { sessionStorage.setItem("mm-bar-closed", "1"); } catch { /* storage blocked */ } track("bar_close"); };
  const hideScene = () => { setSceneClosed(true); try { sessionStorage.setItem("mm-scene-closed", "1"); } catch { /* storage blocked */ } track("scene_close"); };
  return (
    <>
      <div style={{ height }} aria-hidden />
      <aside ref={dock} data-dock aria-label={showCta ? (partner ? "Book a demo" : t("premium.cta")) : undefined} className="fixed inset-x-0 bottom-0 z-30">
        {showScene && <DeliveryScene onHide={showCta ? undefined : hideScene} last={!showCta} />}
        {showCta && (
          <div className="anim-rise pb-safe border-t border-line bg-surface/95 backdrop-blur lg:hidden">
            {partner ? (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-[15px] font-bold leading-5">First 3 months free</p>
                  <p className="d-caption truncate text-muted">From ₹299 a month</p>
                </div>
                <a href="#register" className="press d-btn inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 text-forest">Book a demo<Icon name="chev-r" size={16} /></a>
                <button type="button" aria-label="Hide" onClick={close} className="press flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"><Icon name="x" size={16} /></button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 px-4 pb-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <Icon name="star" size={15} fill className="shrink-0 text-gold" />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-bold leading-5 text-ink">{t("premium.bar")}</p>
                  <button type="button" aria-label="Hide" onClick={close} className="press -my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"><Icon name="x" size={16} /></button>
                </div>
                <GetAppLink from="mobile-bar" className="!h-11 w-full !text-[15px]"><Icon name="star" size={16} fill />{t("premium.cta")}</GetAppLink>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
