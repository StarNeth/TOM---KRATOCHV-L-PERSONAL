import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { Cursor } from "@/components/ui/cursor";
import { LanguageProvider } from "@/components/navigation/language-toggle";
import { Preloader } from "@/components/ui/preloader";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { SpeedInsights } from "@vercel/speed-insights/next"

const syne = Syne({ subsets: ["latin"], weight: ["400", "700", "800"], variable: "--font-syne" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Tomáš Kratochvíl — System Architect",
  description: "Creative developer crafting digital experiences with zero-error tolerance.",
  verification: {
    // TADY JE TVŮJ GOOGLE TAG
    google: "1CP365_WIYoOWEKM24OqSPiXYtj-KMHNrMeU3Fz-aJ8"
  }
};

export const viewport: Viewport = {
  themeColor: "#010101", 
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  // ZBRAŇ HROMADNÉHO NIČENÍ PRO SEO (Krok 3)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Tomáš Kratochvíl",
    "jobTitle": "System Architect",
    "url": "https://www.tomaskratochvil.com",
    "description": "Creative developer crafting digital experiences with zero-error tolerance.",
    "sameAs": [
      "https://www.linkedin.com/in/tomas-kratochvil/",
      "https://github.com/StarNeth"
    ]
  };

  return (
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} no-scrollbar overflow-x-hidden`}>
      <head>
        {/* Vložení JSON-LD přímo do hlavičky pro Google Bota */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground font-sans antialiased cursor-none overflow-x-hidden w-full relative">
        <Preloader />
        <LanguageProvider>
          <LenisProvider>
            {children}
            <DynamicFavicon />
          </LenisProvider>
        </LanguageProvider>
        <SpeedInsights />
        <Cursor /> 
      </body>
    </html>
  );
}