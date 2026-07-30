export const SITE_NAME = "Prumo";
export const SITE_TITLE = "Prumo | Propostas, projetos e financeiro";
export const SITE_DESCRIPTION =
  "Apresente propostas, receba a aprovação do cliente e acompanhe projetos, obras, cobranças e custos no celular ou computador.";

export const PUBLIC_SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/precos", changeFrequency: "monthly", priority: 0.9 },
  { path: "/ajuda", changeFrequency: "weekly", priority: 0.7 },
  { path: "/termos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
] as const;

export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/app",
  "/auth/",
  "/q/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
] as const;

export function resolveSiteUrl(rawUrl?: string): URL {
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (
        (parsed.protocol === "https:" || parsed.protocol === "http:") &&
        !parsed.username &&
        !parsed.password
      ) {
        parsed.pathname = "/";
        parsed.search = "";
        parsed.hash = "";
        return parsed;
      }
    } catch {
      // The launch diagnostic reports the invalid production value.
    }
  }

  return new URL("http://localhost:3000");
}

export function absoluteSiteUrl(path: string, rawUrl?: string): string {
  return new URL(path, resolveSiteUrl(rawUrl)).toString();
}
