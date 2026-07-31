import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MarketingConsentManager } from "@/components/marketing-consent-banner";
import { PublicIdentityProvider } from "@/components/public-identity-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeTransitionProvider } from "@/components/theme-transition";
import { Toaster } from "@/components/ui/toaster";
import { env } from "@/lib/env";
import { legalIdentityState } from "@/lib/env-server";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  resolveSiteUrl,
} from "@/lib/site-metadata";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const speedInsightsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true";
const metaPixelId = env.NEXT_PUBLIC_META_PIXEL_ID;
const metadataBase = resolveSiteUrl(process.env.NEXT_PUBLIC_APP_URL);

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1210" },
  ],
};

export const metadata: Metadata = {
  metadataBase,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prumo",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Prumo com uma visão real do painel do produto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
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
        <ThemeProvider>
          <ThemeTransitionProvider>
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
          </ThemeTransitionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
