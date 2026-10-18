import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedMate: medicines delivered in minutes",
    short_name: "MedMate",
    description: "Medicines from licensed pharmacies near you. Launching soon in Bengaluru.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#1B3D29",
    lang: "en-IN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
