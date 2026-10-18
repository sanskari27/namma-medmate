// One place for the website's links and company facts.
import type { Metadata } from "next";

/** Where this website lives. Netlify sets URL during its builds; set SITE_URL when a custom domain is added. */
export const SITE_URL = (process.env.SITE_URL || process.env.URL || "http://localhost:3100").replace(/\/$/, "");

/** The customer app (installable web app today). */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://medmate-india.netlify.app").replace(/\/$/, "");

/** Store listings. Empty until the apps are published; the site then shows "Coming soon" and opens the web app instead. */
export const PLAY_URL = process.env.NEXT_PUBLIC_PLAY_URL || "";
export const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL || "";

/**
 * false until customers can actually order. While false, the site says "launching soon", every app button opens the
 * waitlist, and /download never forwards phones to the demo app (compliance review C2, C3).
 */
export const LAUNCHED = false;
export const LAUNCH_LINE = "Launching soon in Bengaluru";

export const COMPANY = "Medmate India Technology Private Limited";
export const REGISTERED_OFFICE = "2nd Floor, Plot No 190/108/2, Haralur Main Road, opposite Narayana Olympiad School, HSR Extension, Lakedew Residency, Bengaluru, Karnataka 560102";
/** Fill these in to show them in the footer and on /contact (E-Commerce Rules 2020, IT Rules 2021). Empty values are not shown. */
export const CIN = "";
export const SUPPORT = { email: "", phone: "" };
export const GRIEVANCE_OFFICER = { name: "", designation: "", email: "", phone: "" };
export const CITY = "Bengaluru";
export const TAGLINE = "Care · delivered in minutes";

export const DEFAULT_TITLE = "MedMate: Medicine delivery in Bengaluru, launching soon";
export const DEFAULT_DESCRIPTION =
  "MedMate is launching soon in Bengaluru (Bangalore): medicines from licensed neighbourhood pharmacies, with prices compared across nearby chemists, prescription upload, doctor consultations and live rider tracking. Join the waitlist.";

/**
 * Every "get the app" action goes through /download, so one page decides where people land
 * (store on Android/iPhone once listed, the web app until then) and visits can be counted by `from`.
 * `to` is the app screen to open, e.g. /product/ab73.
 */
export function downloadHref(from: string, to = "/home") {
  const q = new URLSearchParams({ from });
  if (to && to !== "/home") q.set("to", to);
  return `/download?${q}`;
}
export const downloadUrl = (from: string, to?: string) => SITE_URL + downloadHref(from, to);

/** Message for sending the app link to your own phone (WhatsApp, email). */
export const shareText = (url: string) => `Order medicines from pharmacies near you with MedMate: ${url}`;
export const whatsappHref = (url: string) => `https://wa.me/?text=${encodeURIComponent(shareText(url))}`;
export const mailHref = (url: string) =>
  `mailto:?subject=${encodeURIComponent("MedMate app link")}&body=${encodeURIComponent(shareText(url))}`;

/** Website policies hosted on this site. The app's own policies are linked from the app once it launches. */
export const LEGAL_LINKS = [
  ["Privacy notice", "/privacy"],
  ["Terms of use", "/terms"],
  ["Contact and grievances", "/contact"],
] as const;

/** Serialises JSON-LD safely for a <script> tag. */
export const ld = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Page metadata with its own canonical URL and social cards (every page must set its canonical). */
/** Social share image (public/og.png, built by scripts/make-images.py). */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "MedMate: medicines from pharmacies near you, launching soon in Bengaluru" };

export function pageMeta({ title, description, path, type = "website" }: { title: string; description: string; path: string; type?: "website" | "article" }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: "MedMate", locale: "en_IN", title, description, url: path, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
