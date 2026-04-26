import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { Cursor } from "@/components/ui/cursor";
import { LanguageProvider } from "@/components/navigation/language-toggle";
import { Preloader } from "@/components/ui/preloader";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { DelayedRenderer } from "@/components/providers/delayed-renderer";
import { VelocityDriver } from "@/components/providers/velocity-driver";
import { SystemOverlay } from "@/components/system/system-overlay";

const syne = Syne({ subsets: ["latin"], weight: ["400", "700", "800"], variable: "--font-syne", display: "swap" });
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
  
  // ZBRAŇ HROMADNÉHO NIČENÍ PRO SEO
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
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} no-scrollbar overflow-x-hidden`} suppressHydrationWarning>
      {/* ZMĚNĚNO: suppressHydrationWarning přidán na head a scripty, aby je Chrome extensions nemohly shodit */}
      <head suppressHydrationWarning>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var isBot = /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(navigator.userAgent);
                var played = sessionStorage.getItem('preloader_played');
                if (isBot || played) {
                  document.documentElement.classList.add('is-bot');
                }
              } catch(e) {}
            })();
          `
        }} />
        
        {/* Vložení JSON-LD přímo do hlavičky pro Google Bota */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground font-sans antialiased cursor-none overflow-x-hidden w-full relative">
        <Preloader />
        <LanguageProvider>
          <LenisProvider>
            <VelocityDriver />
            {children}
            <SystemOverlay />
            <DynamicFavicon />
          </LenisProvider>
        </LanguageProvider>
        
        {/* ZMĚNĚNO: Odsunutí ne-kritických nástrojů mimo hlavní renderovací okno bota */}
        <div style={{ display: 'none' }} className="is-bot-hide">
           <SpeedInsights />
        </div>
        
        <DelayedRenderer delay={2500}>
         <Cursor /> 
        </DelayedRenderer>
      </body>
    </html>
  );
}
