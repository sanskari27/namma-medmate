"use client";

import { useEffect, useState } from "react";

type Props = { appUrl: string; playUrl: string; iosUrl: string };

/** App screens /download may open. Anything else falls back to Home (no open redirects). */
const safePath = (to: string | null) => (to && /^\/[a-z0-9\-/]*$/i.test(to) && !to.startsWith("//") ? to : "/");

/**
 * On a phone: send the visitor on to the store listing (once published) or straight into the web app,
 * carrying `from` as the campaign so installs can be traced back to the button that drove them.
 * On a computer it does nothing and the page shows the QR code instead.
 */
export function DownloadRedirect({ appUrl, playUrl, iosUrl }: Props) {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const from = (q.get("from") || "direct").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
    const ua = navigator.userAgent;
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
    if (!android && !ios) return;
    const utm = `utm_source=website&utm_medium=${q.has("to") ? "deeplink" : "download"}&utm_campaign=${from}`;
    let url: string;
    if (android && playUrl) url = `${playUrl}${playUrl.includes("?") ? "&" : "?"}referrer=${encodeURIComponent(utm)}`;
    else if (ios && iosUrl) url = iosUrl;
    else {
      const path = safePath(q.get("to"));
      url = `${appUrl}${path === "/" ? "/" : path}?${utm}`;
    }
    window.dataLayer?.push({ event: "download_redirect", from, platform: android ? "android" : "ios" });
    setTarget(url);
    location.replace(url);
  }, [appUrl, playUrl, iosUrl]);

  if (!target) return null;
  return (
    <div role="status" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <span className="size-8 animate-spin rounded-full border-[3px] border-mint-200 border-t-green" aria-hidden />
      <p className="text-[17px] font-semibold">Opening MedMate…</p>
      <a href={target} className="press d-btn inline-flex h-12 items-center rounded-xl bg-green px-5 text-white">Tap here if nothing happens</a>
    </div>
  );
}
