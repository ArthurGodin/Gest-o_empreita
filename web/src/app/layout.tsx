import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const speedInsightsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
};

export const metadata: Metadata = {
  title: "Prumo — Orçamentos e obras sem dor de cabeça",
  description:
    "Sistema para empreiteiros e empresas de cobertura: orçamentos profissionais, controle de obras, cobranças e equipe — tudo no celular.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prumo",
  },
  openGraph: {
    title: "Prumo — Orçamentos e obras sem dor de cabeça",
    description:
      "Crie orçamentos profissionais, controle obras com fotos e etapas, cobre via Pix e veja sua margem em tempo real.",
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
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
        {speedInsightsEnabled ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
