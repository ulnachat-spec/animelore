import type { MetadataRoute } from "next";
import { readColdHookStore } from "@/lib/cold-hook-store";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const staticRoutes = ["", "/roam"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path ? ("daily" as const) : ("hourly" as const),
    priority: path ? 0.8 : 1
  }));
  const coldRoutes = readColdHookStore()
    .filter((record) => record.id)
    .map((record) => ({
      url: `${baseUrl}/cold/${encodeURIComponent(record.id)}`,
      lastModified: new Date(record.created_at),
      changeFrequency: "monthly" as const,
      priority: 0.65
    }));

  return [...staticRoutes, ...coldRoutes];
}
