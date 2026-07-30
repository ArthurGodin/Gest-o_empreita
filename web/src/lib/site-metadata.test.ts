import { describe, expect, it } from "vitest";
import {
  PUBLIC_SITEMAP_ROUTES,
  ROBOTS_DISALLOW_PATHS,
  absoluteSiteUrl,
  resolveSiteUrl,
} from "./site-metadata";

describe("site metadata", () => {
  it("normalizes the configured app origin without preserving a path or query", () => {
    const result = resolveSiteUrl(
      "https://prumo.example/app?source=private#fragment",
    );

    expect(result.toString()).toBe("https://prumo.example/");
  });

  it("falls back safely for invalid or credentialed URLs", () => {
    expect(resolveSiteUrl("javascript:alert(1)").origin).toBe(
      "http://localhost:3000",
    );
    expect(resolveSiteUrl("https://user:pass@prumo.example").origin).toBe(
      "http://localhost:3000",
    );
  });

  it("keeps only intentional public pages in the sitemap", () => {
    const paths = PUBLIC_SITEMAP_ROUTES.map((route) => route.path);

    expect(paths).toEqual([
      "/",
      "/precos",
      "/ajuda",
      "/termos",
      "/privacidade",
    ]);
    expect(paths.some((path) => /^\/(app|api|q|login|signup)/.test(path))).toBe(
      false,
    );
  });

  it("disallows every private route family and builds absolute public URLs", () => {
    expect(ROBOTS_DISALLOW_PATHS).toContain("/app");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/api/");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/q/");
    expect(absoluteSiteUrl("/precos", "https://prumo.example")).toBe(
      "https://prumo.example/precos",
    );
  });
});
