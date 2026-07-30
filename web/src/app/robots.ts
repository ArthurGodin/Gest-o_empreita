import type { MetadataRoute } from "next";
import {
  ROBOTS_DISALLOW_PATHS,
  absoluteSiteUrl,
  resolveSiteUrl,
} from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const siteUrl = resolveSiteUrl(configuredUrl);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml", configuredUrl),
    host: siteUrl.origin,
  };
}
