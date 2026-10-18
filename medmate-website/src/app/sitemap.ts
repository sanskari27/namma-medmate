import type { MetadataRoute } from "next";
import { CATEGORIES, PRODUCTS, details, isThin, productHref } from "@/lib/catalogue";
import { AREAS } from "@/lib/areas";
import { POSTS } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly") => ({ url: SITE_URL + path, lastModified: now, changeFrequency, priority });
  return [
    page("", 1, "daily"),
    page("/download", 0.9),
    page("/premium", 0.8, "monthly"),
    page("/medicines", 0.9, "daily"),
    page("/doctor-consultation", 0.8, "monthly"),
    page("/upload-prescription", 0.8, "monthly"),
    page("/pharmacy-partner", 0.9),
    page("/blog", 0.8, "weekly"),
    page("/bengaluru", 0.9, "weekly"),
    ...AREAS.map((a) => page(`/bengaluru/${a.slug}`, 0.7, "monthly")),
    page("/about", 0.6, "monthly"),
    page("/contact", 0.5, "monthly"),
    page("/privacy", 0.3, "monthly"),
    page("/terms", 0.3, "monthly"),
    ...CATEGORIES.map((c) => page(`/medicines/${c.slug}`, 0.8)),
    ...POSTS.map((g) => ({ url: `${SITE_URL}/blog/${g.slug}`, lastModified: new Date(g.updated ?? g.date), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...PRODUCTS.filter((p) => !isThin(p)).map((p) => ({
      url: SITE_URL + productHref(p),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: details(p.id) ? 0.7 : 0.5,
      ...(p.img ? { images: [SITE_URL + p.img] } : {}),
    })),
  ];
}
