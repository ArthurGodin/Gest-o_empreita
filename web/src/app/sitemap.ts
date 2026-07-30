import type { MetadataRoute } from "next";
import {
  PUBLIC_SITEMAP_ROUTES,
  absoluteSiteUrl,
} from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

  return PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: absoluteSiteUrl(route.path, configuredUrl),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
