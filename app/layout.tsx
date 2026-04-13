import type { Metadata, Viewport } from "next";
import { Syne, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/lenis-provider";
import { Cursor } from "@/components/ui/cursor";
import { Grain } from "@/components/ui/grain";
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
  // Zabrání uživatelům na iPhonu nechtěně přibližovat web dvojitým poklepáním
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // [ ! ] Přidáno overflow-x-hidden
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} no-scrollbar overflow-x-hidden`}>
      {/* [ ! ] Přidáno overflow-x-hidden, w-full a relative */}
      <body suppressHydrationWarning className="bg-background text-foreground font-sans antialiased cursor-none overflow-x-hidden w-full relative">
        
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