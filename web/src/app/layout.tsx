import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MarketingConsentManager } from "@/components/marketing-consent-banner";
import { PublicIdentityProvider } from "@/components/public-identity-provider";
import { Toaster } from "@/components/ui/toaster";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env-server";
import { buildLegalIdentity } from "@/lib/legal-identity";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const speedInsightsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true";
const metaPixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
const legalIdentityState = buildLegalIdentity({
  legalName: serverEnv.PRUMO_LEGAL_NAME,
  legalDocument: serverEnv.PRUMO_LEGAL_DOCUMENT,
  legalAddress: serverEnv.PRUMO_LEGAL_ADDRESS,
  supportEmail: serverEnv.SUPPORT_EMAIL,
  docsUpdatedAt: serverEnv.PRUMO_LEGAL_DOCS_UPDATED_AT,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export const metadata: Metadata = {
  title: "Prumo — Propostas, projetos e financeiro",
  description:
    "Propostas, projetos, obras, cobranças e financeiro para arquitetura, interiores, engenharia e execução — no celular ou computador.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prumo",
  },
  openGraph: {
    title: "Prumo — Propostas, projetos e financeiro",
    description:
      "Apresente seu trabalho, receba a aprovação do cliente e acompanhe projetos, obras, cobranças e custos em um só lugar.",
    type: "website",
    locale: "pt_BR",
    siteName: "Prumo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <PublicIdentityProvider
          value={{
            supportEmail: legalIdentityState.supportEmail,
            legalIdentity: legalIdentityState.publicIdentity,
          }}
        >
          {children}
          <Toaster />
          <MarketingConsentManager pixelId={metaPixelId} />
          <Analytics />
          {speedInsightsEnabled ? <SpeedInsights /> : null}
        </PublicIdentityProvider>
      </body>
    </html>
  );
}
