import type { Metadata } from "next";

/**
 * Layout específico do link público.
 *
 * Não herda o (app) layout (já que /q/* fica fora dele), mas precisa:
 *   - <meta name="referrer" content="no-referrer"> para evitar leak do
 *     share_token via header Referer quando o cliente clicar em qualquer
 *     link externo ou recurso CDN (defense-in-depth — Vercel também
 *     sobrescreve via next.config.mjs headers).
 *   - robots noindex (também aplicado por page-level metadata).
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PublicQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
