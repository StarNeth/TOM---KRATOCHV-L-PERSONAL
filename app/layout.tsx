import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { Cursor } from "@/components/ui/cursor";
import { Grain } from "@/components/ui/grain";

// [ ! ] PŘIDÁN IMPORT PROVIDERU
import { LanguageProvider } from "@/components/navigation/language-toggle";

const syne = Syne({ subsets: ["latin"], weight: ["400", "700", "800"], variable: "--font-syne" });

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "Tomáš Kratochvíl — System Architect",
  description: "Creative developer crafting digital experiences with zero-error tolerance.",
};

export const viewport: Viewport = {
  themeColor: "#010101", 
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} no-scrollbar`}>
      <body suppressHydrationWarning className="bg-background text-foreground font-sans antialiased cursor-none">
        
        {/* [ ! ] APP OBALENA DO LANGUAGE PROVIDERU */}
        <LanguageProvider>
          <LenisProvider>
            {children}
          </LenisProvider>
        </LanguageProvider>
        
        {/* Globální UI elementy */}
        <Cursor />
        <Grain /> 
      </body>
    </html>
  );
}