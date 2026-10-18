import type { NextConfig } from "next";

// Fully static site (HTML per page) for fast loads and easy crawling. Output goes to `out/`.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
