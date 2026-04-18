"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "cs";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  // Bezpečně natáhneme jazyk z paměti až po vykreslení (ochrana proti Hydration Mismatch)
  useEffect(() => {
    const savedLang = localStorage.getItem("system_lang") as Language;
    if (savedLang === "en" || savedLang === "cs") {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("system_lang", lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => {
      const nextLang = prev === "en" ? "cs" : "en";
      localStorage.setItem("system_lang", nextLang);
      return nextLang;
    });
  };

  // ZMĚNĚNO: Zásadní oprava! Už NIKDY nevracíme děti bez Provideru.
  // Komponenty uvnitř (jako Hero) teď vždy najdou svůj kontext.
  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("CRITICAL: useLanguage musí být použit uvnitř LanguageProvideru.");
  }
  return context;
};