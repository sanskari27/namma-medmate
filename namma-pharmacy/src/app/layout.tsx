import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./pharmacy.css";

export const metadata: Metadata = {
  title: "Namma MedMate — Pharmacist Dashboard",
  description:
    "Inventory, billing & online-store management for neighbourhood pharmacies. Manage stock & batches, review prescriptions, print GST invoices, and run your online storefront — all offline and online sales in one dashboard.",
  applicationName: "Namma MedMate Partner",
  icons: {
    icon: [
      { url: "/namma-pharmacy/favicon.svg", type: "image/svg+xml" },
      { url: "/namma-pharmacy/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/namma-pharmacy/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/namma-pharmacy/favicon.ico" }],
    apple: [{ url: "/namma-pharmacy/apple-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#10301d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <style>{`body { background:#10301d; }`}</style>
        <div className="pd-root">{children}</div>
      </body>
    </html>
  );
}
