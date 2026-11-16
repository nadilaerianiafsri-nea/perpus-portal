
import type { MetadataRoute } from "next";

const BASE_URL = "https://portalperpusriau.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1.0, frequency: "weekly" },
    { path: "/koleksi", priority: 0.9, frequency: "weekly" },
    { path: "/e-book", priority: 0.9, frequency: "weekly" },
    { path: "/tentang", priority: 0.7, frequency: "monthly" },
    { path: "/panduan", priority: 0.7, frequency: "monthly" },
    { path: "/faq", priority: 0.7, frequency: "monthly" },
    { path: "/kontak", priority: 0.7, frequency: "monthly" },
    { path: "/hibah-buku", priority: 0.6, frequency: "monthly" },
  ] as const;

  return pages.map((page) => ({
    url: new URL(page.path, BASE_URL).toString(),
    changeFrequency: page.frequency,
    priority: page.priority,
  }));
}
