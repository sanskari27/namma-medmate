import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Footer, Header } from "@/components/chrome";
import { FloatingApp, GetAppDialog, MobileCta } from "@/components/get-app";
import { LangProvider } from "@/components/lang";
import { JsonLd } from "@/components/ui";
import { qrSvg } from "@/lib/qr";
import { COMPANY, DEFAULT_DESCRIPTION, DEFAULT_TITLE, IOS_URL, OG_IMAGE, PLAY_URL, SITE_URL, downloadUrl, whatsappHref } from "@/lib/site";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s | MedMate" },
  description: DEFAULT_DESCRIPTION,
  applicationName: "MedMate",
  keywords: ["medicine delivery Bengaluru", "online pharmacy Bengaluru", "order medicines online", "pharmacy near me", "medicine delivery app", "upload prescription", "online doctor consultation", "sell medicines online", "MedMate"],
  alternates: { types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: "MedMate blog" }] } },
  openGraph: {
    type: "website",
    siteName: "MedMate",
    locale: "en_IN",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, images: [OG_IMAGE.url] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false },
  category: "health",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B3D29",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const dialogUrl = downloadUrl("dialog");
  const [dialogQr, floatQr, footerQr] = await Promise.all([qrSvg(dialogUrl), qrSvg(downloadUrl("float")), qrSvg(downloadUrl("footer"))]);
  const sameAs = [PLAY_URL, IOS_URL].filter(Boolean);
  return (
    <html lang="en-IN" className={`${outfit.variable} antialiased`}>
      <body>
        <LangProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-sh3">Skip to content</a>
        <Header />
        <div id="main">{children}</div>
        <Footer qr={footerQr} />
        <GetAppDialog qr={dialogQr} whatsapp={whatsappHref(dialogUrl)} />
        <FloatingApp qr={floatQr} />
        <MobileCta />
        </LangProvider>
        <JsonLd data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#org`,
            name: "MedMate",
            legalName: COMPANY,
            url: SITE_URL,
            logo: `${SITE_URL}/logo.png`,
            address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressRegion: "Karnataka", addressCountry: "IN" },
            areaServed: { "@type": "City", name: "Bengaluru" },
            slogan: "Care, delivered in minutes",
            foundingDate: "2026",
            founder: { "@type": "Person", name: "Roni Paul", jobTitle: "Founder & CEO" },
            ...(sameAs.length ? { sameAs } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: "MedMate",
            url: SITE_URL,
            inLanguage: "en-IN",
            publisher: { "@id": `${SITE_URL}/#org` },
            potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
          },
        ]} />
      </body>
    </html>
  );
}
