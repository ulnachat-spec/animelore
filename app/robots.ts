import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/debug/"]
    },
    ...(baseUrl ? { sitemap: `${baseUrl}/sitemap.xml` } : {})
  };
}
